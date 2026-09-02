import pg from "pg";
import { logger } from "./logger";

const CHANNEL = "auction_events";
const RECONNECT_DELAY_MS = 3_000;
export const DEGRADED_THRESHOLD_MS = Number(process.env.PUBSUB_DEGRADED_THRESHOLD_MS ?? 30_000);

export type AuctionEventPayload =
  | { type: "bid"; auctionId: number; data: unknown }
  | { type: "closed"; auctionId: number; data: unknown };

type NotifyHandler = (payload: AuctionEventPayload) => void;
type ReconnectHandler = (gapMs: number) => void;
export type StopAuctionPubSubSubscriber = () => Promise<void>;

let notifyHandler: NotifyHandler | null = null;
let reconnectHandler: ReconnectHandler | null = null;

export function setAuctionEventHandler(handler: NotifyHandler) {
  notifyHandler = handler;
}

export function setReconnectHandler(handler: ReconnectHandler) {
  reconnectHandler = handler;
}

// ── Subscriber health state ───────────────────────────────────────────────────
type SubscriberStatus = "initializing" | "connected" | "reconnecting";

let _subscriberStatus: SubscriberStatus = "initializing";
let _disconnectedAt: number | null = null;
let _degradedAlertEmitted = false;
let _listenClient: pg.Client | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _stopping = false;
let _connectionGeneration = 0;
let _stopHandle: StopAuctionPubSubSubscriber | null = null;

export function getSubscriberStatus(): { status: SubscriberStatus; reconnectingForMs: number | null } {
  return {
    status: _subscriberStatus,
    reconnectingForMs:
      _subscriberStatus === "reconnecting" && _disconnectedAt !== null
        ? Date.now() - _disconnectedAt
        : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

async function createListenClient(): Promise<pg.Client> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`LISTEN ${CHANNEL}`);

  return client;
}

function checkDegradedThreshold() {
  if (_subscriberStatus === "reconnecting" && _disconnectedAt !== null && !_degradedAlertEmitted) {
    const downMs = Date.now() - _disconnectedAt;
    if (downMs >= DEGRADED_THRESHOLD_MS) {
      _degradedAlertEmitted = true;
      logger.error(
        { downMs, thresholdMs: DEGRADED_THRESHOLD_MS },
        `[PgPubSub] Subscriber has been reconnecting for ${downMs}ms (threshold ${DEGRADED_THRESHOLD_MS}ms) — events published during this gap are lost`
      );
    }
  }
}

function markReconnecting(): void {
  if (_subscriberStatus !== "reconnecting") {
    _subscriberStatus = "reconnecting";
    _disconnectedAt = Date.now();
  }
}

function clearReconnectTimer(): void {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
}

export async function startAuctionPubSubSubscriber(): Promise<StopAuctionPubSubSubscriber> {
  if (_stopHandle) return _stopHandle;

  _stopping = false;
  _subscriberStatus = "initializing";
  _disconnectedAt = null;
  _degradedAlertEmitted = false;
  const generation = ++_connectionGeneration;

  const scheduleReconnect = () => {
    if (_stopping || generation !== _connectionGeneration || _reconnectTimer) return;
    _reconnectTimer = setTimeout(() => {
      _reconnectTimer = null;
      void connect();
    }, RECONNECT_DELAY_MS);
    _reconnectTimer.unref();
  };

  const handleDisconnect = (client: pg.Client, err?: Error) => {
    if (_stopping || generation !== _connectionGeneration || _listenClient !== client) return;
    if (err) logger.warn({ err }, "[PgPubSub] LISTEN client error — will reconnect");
    _listenClient = null;
    markReconnecting();
    logger.warn(`[PgPubSub] LISTEN client disconnected — reconnecting in ${RECONNECT_DELAY_MS}ms`);
    scheduleReconnect();
    if (err) {
      // Some client errors are not followed by an "end" event. Explicitly
      // release that connection after scheduling the replacement.
      void client.end().catch((closeErr: unknown) => {
        logger.warn({ err: closeErr }, "[PgPubSub] Failed to close errored LISTEN client");
      });
    }
  };

  const stop: StopAuctionPubSubSubscriber = async () => {
    if (_stopHandle !== stop) return;
    _stopping = true;
    ++_connectionGeneration;
    clearReconnectTimer();
    const client = _listenClient;
    _listenClient = null;
    _stopHandle = null;
    _subscriberStatus = "initializing";
    _disconnectedAt = null;
    _degradedAlertEmitted = false;

    await Promise.all([
      client?.end().catch((err: unknown) => {
        logger.warn({ err }, "[PgPubSub] Failed to close LISTEN client");
      }),
      _notifyPool?.end().catch((err: unknown) => {
        logger.warn({ err }, "[PgPubSub] Failed to close NOTIFY pool");
      }),
    ]);
    _notifyPool = null;
  };
  // Register before awaiting the first connection so shutdown can also cancel
  // an in-flight initial connect.
  _stopHandle = stop;

  async function connect(): Promise<void> {
    if (_stopping || generation !== _connectionGeneration) return;
    checkDegradedThreshold();

    try {
      const wasReconnecting = _subscriberStatus === "reconnecting";
      const gapStart = _disconnectedAt;

      const client = await createListenClient();
      if (_stopping || generation !== _connectionGeneration) {
        await client.end().catch(() => undefined);
        return;
      }
      _listenClient = client;

      _subscriberStatus = "connected";
      _degradedAlertEmitted = false;
      const connectedAt = Date.now();

      if (wasReconnecting && gapStart !== null) {
        const gapMs = connectedAt - gapStart;
        logger.warn(
          { gapMs },
          `[PgPubSub] Subscriber reconnected after ${gapMs}ms gap — SSE clients may have missed events`
        );
        _disconnectedAt = null;
        reconnectHandler?.(gapMs);
      } else {
        logger.info(`[PgPubSub] Subscribed to channel "${CHANNEL}"`);
      }

      client.on("notification", (msg: pg.Notification) => {
        if (
          msg.channel !== CHANNEL ||
          !msg.payload ||
          _stopping ||
          generation !== _connectionGeneration ||
          _listenClient !== client
        ) {
          return;
        }
        try {
          notifyHandler?.(JSON.parse(msg.payload) as AuctionEventPayload);
        } catch (err: unknown) {
          logger.warn({ err, raw: msg.payload }, "[PgPubSub] Failed to parse notification payload");
        }
      });

      client.on("error", (err: Error) => handleDisconnect(client, err));
      client.on("end", () => handleDisconnect(client));
    } catch (err) {
      if (_stopping || generation !== _connectionGeneration) return;
      markReconnecting();
      logger.warn({ err }, `[PgPubSub] Failed to connect — retrying in ${RECONNECT_DELAY_MS}ms`);
      scheduleReconnect();
    }
  }

  await connect();
  return stop;
}

export async function stopAuctionPubSubSubscriber(): Promise<void> {
  await _stopHandle?.();
}

let _notifyPool: pg.Pool | null = null;

function getNotifyPool(): pg.Pool {
  if (!_notifyPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");
    _notifyPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
    });
  }
  return _notifyPool;
}

export async function publishAuctionEvent(payload: AuctionEventPayload) {
  const json = JSON.stringify(payload);
  try {
    await getNotifyPool().query(`SELECT pg_notify($1, $2)`, [CHANNEL, json]);
  } catch (err) {
    logger.error({ err, payload }, "[PgPubSub] Failed to NOTIFY");
  }
}
