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

  client.on("notification", (msg: pg.Notification) => {
    if (msg.channel !== CHANNEL || !msg.payload) return;
    try {
      const payload = JSON.parse(msg.payload) as AuctionEventPayload;
      notifyHandler?.(payload);
    } catch (err: unknown) {
      logger.warn({ err, raw: msg.payload }, "[PgPubSub] Failed to parse notification payload");
    }
  });

  client.on("error", (err: Error) => {
    logger.warn({ err }, "[PgPubSub] LISTEN client error — will reconnect");
    if (_subscriberStatus !== "reconnecting") {
      _subscriberStatus = "reconnecting";
      _disconnectedAt = Date.now();
    }
  });

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

export async function startAuctionPubSubSubscriber() {
  async function connect() {
    checkDegradedThreshold();

    try {
      const wasReconnecting = _subscriberStatus === "reconnecting";
      const gapStart = _disconnectedAt;

      const client = await createListenClient();

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

      client.on("end", () => {
        _subscriberStatus = "reconnecting";
        _disconnectedAt = Date.now();
        logger.warn(`[PgPubSub] LISTEN client disconnected — reconnecting in ${RECONNECT_DELAY_MS}ms`);
        setTimeout(connect, RECONNECT_DELAY_MS);
      });
    } catch (err) {
      if (_subscriberStatus !== "reconnecting") {
        _subscriberStatus = "reconnecting";
        _disconnectedAt = Date.now();
      }
      logger.warn({ err }, `[PgPubSub] Failed to connect — retrying in ${RECONNECT_DELAY_MS}ms`);
      setTimeout(connect, RECONNECT_DELAY_MS);
    }
  }

  await connect();
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
