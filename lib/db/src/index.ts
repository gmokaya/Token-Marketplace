import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool, types } = pg;

types.setTypeParser(1700, parseFloat);
types.setTypeParser(701, parseFloat);
types.setTypeParser(700, parseFloat);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Bounded connection pool. A single Postgres instance cannot hold thousands of
// physical connections, so we keep a bounded pool and let requests queue for a
// free connection (bounded by connectionTimeoutMillis) rather than overwhelming
// the database. Tune via env without code changes.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: toInt(process.env.DB_POOL_MAX, 20),
  idleTimeoutMillis: toInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30_000),
  connectionTimeoutMillis: toInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10_000),
  statement_timeout: toInt(process.env.DB_STATEMENT_TIMEOUT_MS, 20_000),
  query_timeout: toInt(process.env.DB_QUERY_TIMEOUT_MS, 25_000),
  application_name: process.env.DB_APPLICATION_NAME ?? process.env.API_RUNTIME_ROLE ?? "tokenharvest-api",
});

// A pool always emits 'error' on idle clients that get dropped by the server
// or network. Without a listener this would crash the whole process.
pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[db] idle client error", err);
});

export const db = drizzle(pool, { schema });

/**
 * Postgres error codes that indicate a transaction was aborted due to
 * concurrency and is safe to retry from the beginning:
 *  - 40001 serialization_failure (raised under SERIALIZABLE / repeatable read)
 *  - 40P01 deadlock_detected
 */
const RETRYABLE_TX_CODES = new Set(["40001", "40P01"]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a database operation (typically a `db.transaction(...)`) with automatic
 * retries when Postgres aborts it due to serialization failures or deadlocks.
 *
 * SERIALIZABLE transactions WILL be aborted under high concurrency — this is
 * expected and the only correct response is to retry the whole transaction.
 * Uses exponential backoff with jitter to avoid thundering-herd retries.
 */
export async function withTxRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; maxDelayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 25;
  const maxDelayMs = opts.maxDelayMs ?? 500;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code && RETRYABLE_TX_CODES.has(code) && attempt < retries) {
        lastErr = err;
        const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
        const jitter = Math.random() * backoff;
        await sleep(backoff / 2 + jitter);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export * from "./schema";
