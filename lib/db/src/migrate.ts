import { sql } from "drizzle-orm";
import { db } from "./index";

export async function applyDbConstraints() {
  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS entity_type text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS city text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS coffee_origin_country text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS coffee_origin_region text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS coffee_variety text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS coffee_processing_type text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS tea_origin_country text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS tea_origin_region text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS tea_variety text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS tea_type text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS tea_processing_method text
  `);

  await db.execute(sql`
    ALTER TABLE marketplace_onboarding_profiles
      ADD COLUMN IF NOT EXISTS tea_grade text
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION validate_ewr_state_transition()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.state = NEW.state THEN
        RETURN NEW;
      END IF;
      -- Blueprint §6.1: INGESTED — free, unencumbered asset
      IF OLD.state = 'INGESTED' AND NEW.state IN ('MARKET_LISTED', 'AUCTION_ACTIVE', 'FORWARD_BOUND', 'ENCUMBERED') THEN
        RETURN NEW;
      END IF;
      -- MARKET_LISTED — on spot marketplace
      IF OLD.state = 'MARKET_LISTED' AND NEW.state IN ('INGESTED', 'LOCK_TRADING', 'ENCUMBERED') THEN
        RETURN NEW;
      END IF;
      -- Blueprint §6.1: AUCTION_ACTIVE — inside a live digital auction
      IF OLD.state = 'AUCTION_ACTIVE' AND NEW.state IN ('LOCK_TRADING', 'INGESTED', 'ENCUMBERED') THEN
        RETURN NEW;
      END IF;
      -- Blueprint §6.1: FORWARD_BOUND — reserved under a pending forward contract
      IF OLD.state = 'FORWARD_BOUND' AND NEW.state IN ('ENCUMBERED', 'INGESTED') THEN
        RETURN NEW;
      END IF;
      -- Blueprint §6.1: ENCUMBERED — pre-sale financing lien applied
      IF OLD.state = 'ENCUMBERED' AND NEW.state IN ('MARKET_LISTED', 'AUCTION_ACTIVE', 'FORWARD_BOUND', 'INGESTED', 'SETTLED') THEN
        RETURN NEW;
      END IF;
      -- Blueprint §6.1: LOCK_TRADING — inside active settlement window
      IF OLD.state = 'LOCK_TRADING' AND NEW.state IN ('MARKET_LISTED', 'SETTLED', 'INGESTED', 'ENCUMBERED') THEN
        RETURN NEW;
      END IF;
      -- Blueprint §6.1: SETTLED — terminal state, no further transitions allowed
      IF OLD.state = 'SETTLED' THEN
        RAISE EXCEPTION 'eWR is in final SETTLED state and cannot be transitioned';
      END IF;
      RAISE EXCEPTION 'Invalid eWR state transition: % -> %', OLD.state, NEW.state;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.execute(sql`
    DROP TRIGGER IF EXISTS ewr_state_transition_check ON ewrs
  `);

  await db.execute(sql`
    CREATE TRIGGER ewr_state_transition_check
      BEFORE UPDATE ON ewrs
      FOR EACH ROW
      WHEN (OLD.state IS DISTINCT FROM NEW.state)
      EXECUTE FUNCTION validate_ewr_state_transition()
  `);
}

/**
 * Ensure the listing_publications unique constraint exists.
 *
 * Run on every startup:
 *   1. Deduplicate any existing rows (keep latest per listing_id+marketplace_name)
 *      so that CREATE UNIQUE INDEX cannot fail due to pre-existing duplicates.
 *   2. Create the unique index (IF NOT EXISTS — idempotent).
 *
 * Throws on failure so the caller can block publish operations rather than
 * silently allowing ON CONFLICT DO UPDATE to hit a missing constraint at runtime.
 */
export async function ensurePublicationConstraint() {
  // Step 1: remove duplicates — keep the row with the latest updated_at per pair.
  // Uses a CTE so it is a single atomic DELETE statement.
  await db.execute(sql`
    DELETE FROM listing_publications
    WHERE id NOT IN (
      SELECT DISTINCT ON (listing_id, marketplace_name) id
      FROM listing_publications
      ORDER BY listing_id, marketplace_name, updated_at DESC NULLS LAST, id DESC
    )
  `);

  // Step 2: create the unique index — idempotent, safe to re-run.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS listing_publications_lot_marketplace_uniq
      ON listing_publications (listing_id, marketplace_name)
  `);
}
