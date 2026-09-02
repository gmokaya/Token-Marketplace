import { pool } from "@workspace/db";

/**
 * Publication constraint readiness flag.
 *
 * Set to true by the startup code after ensurePublicationConstraint() succeeds.
 * The listing-publications publish route checks this before attempting an
 * ON CONFLICT DO UPDATE, which requires the unique index to be present.
 */

let _ready = false;

export function setPublicationConstraintReady(): void {
  _ready = true;
}

export function isPublicationConstraintReady(): boolean {
  return _ready;
}

/**
 * Read-only readiness check for request and worker runtimes. DDL is owned by
 * the dedicated database-bootstrap service, never by independently scaled
 * request/worker processes.
 */
export async function verifyPublicationConstraintReady(): Promise<boolean> {
  if (_ready) return true;
  const result = await pool.query<{ ready: boolean }>(
    "SELECT to_regclass('public.listing_publications_lot_marketplace_uniq') IS NOT NULL AS ready",
  );
  if (result.rows[0]?.ready) _ready = true;
  return _ready;
}
