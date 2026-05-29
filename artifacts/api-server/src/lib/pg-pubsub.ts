import pg from "pg";
import { logger } from "./logger";

const CHANNEL = "auction_events";
const RECONNECT_DELAY_MS = 3_000;

export type AuctionEventPayload =
  | { type: "bid"; auctionId: number; data: unknown }
  | { type: "closed"; auctionId: number; data: unknown };

type NotifyHandler = (payload: AuctionEventPayload) => void;

let notifyHandler: NotifyHandler | null = null;

export function setAuctionEventHandler(handler: NotifyHandler) {
  notifyHandler = handler;
}

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
  });

  return client;
}

export async function startAuctionPubSubSubscriber() {
  async function connect() {
    try {
      const client = await createListenClient();
      logger.info(`[PgPubSub] Subscribed to channel "${CHANNEL}"`);

      client.on("end", () => {
        logger.warn(`[PgPubSub] LISTEN client disconnected — reconnecting in ${RECONNECT_DELAY_MS}ms`);
        setTimeout(connect, RECONNECT_DELAY_MS);
      });
    } catch (err) {
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
