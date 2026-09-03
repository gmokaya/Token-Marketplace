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
// the database. Tune via env without code changes. The per-service artifact
// configuration intentionally keeps this below the old 20-connection default so
// multiple market runtimes can share the same database safely.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: toInt(process.env.DB_POOL_MAX, 8),
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a database operation (typically a `db.transaction(...)`) with automatic
 * retries when Postgres aborts it due to serialization failures or deadlocks.
 *
 * SERIALIZABLE transactions WILL be aborted under high concurrency — this is
 * expected and the only correct response is to retry the whole transaction.
 * Uses exponential backoff with jitter to avoid thundering-herd retries.
 */
export type DbRetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const TRANSIENT_DB_CODES = new Set([
  "08000", // connection_exception
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08003", // connection_does_not_exist
  "08004", // sqlserver_rejected_establishment_of_sqlconnection
  "08006", // connection_failure
  "08007", // transaction_resolution_unknown
  "08S01", // communication_link_failure
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
  "53300", // too_many_connections
]);

const RETRYABLE_TX_CODES = new Set(["40001", "40P01"]);

function hasCodeOrMessage(
  error: unknown,
  codes: Set<string>,
  messagePattern: RegExp,
): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current === "object") {
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string" && codes.has(code)) return true;

      const message = (current as { message?: unknown }).message;
      if (typeof message === "string" && messagePattern.test(message)) return true;

      current = (current as { cause?: unknown }).cause;
    } else {
      break;
    }
  }
  return false;
}

/**
 * Returns true for PostgreSQL/network failures that are safe to retry when the
 * caller's operation is read-only or idempotent.
 */
export function isTransientDbError(error: unknown): boolean {
  return hasCodeOrMessage(
    error,
    TRANSIENT_DB_CODES,
    /connection terminated|connection timeout|server closed the connection|connection reset|connection refused|timed out|broken pipe|too many clients/i,
  );
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  opts: DbRetryOptions,
): Promise<T> {
  const retries = opts.retries ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 250;
  const maxDelayMs = opts.maxDelayMs ?? 2_000;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!shouldRetry(err) || attempt >= retries) throw err;
      lastErr = err;
      const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = Math.random() * backoff;
      await sleep(backoff / 2 + jitter);
    }
  }
  throw lastErr;
}

/**
 * Retry a read-only or idempotent database operation after a transient
 * connection failure. Do not use this around an arbitrary non-idempotent write;
 * use withTxRetry for a database transaction instead.
 */
export function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: DbRetryOptions = {},
): Promise<T> {
  return retryWithBackoff(fn, isTransientDbError, {
    retries: opts.retries ?? 3,
    baseDelayMs: opts.baseDelayMs ?? 250,
    maxDelayMs: opts.maxDelayMs ?? 2_000,
  });
}

/**
 * Run a database transaction with automatic retries for serialization
 * failures, deadlocks, and transient connection failures. Transactions are
 * atomic, so retrying the full closure is safe when it contains DB-only work.
 */
export function withTxRetry<T>(
  fn: () => Promise<T>,
  opts: DbRetryOptions = {},
): Promise<T> {
  return retryWithBackoff(
    fn,
    (error) =>
      isTransientDbError(error) ||
      hasCodeOrMessage(error, RETRYABLE_TX_CODES, /^$/),
    {
      retries: opts.retries ?? 5,
      baseDelayMs: opts.baseDelayMs ?? 100,
      maxDelayMs: opts.maxDelayMs ?? 2_000,
    },
  );
}

export * from "./schema";
