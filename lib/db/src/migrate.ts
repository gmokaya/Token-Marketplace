import { sql } from "drizzle-orm";
import { db } from "./index";

export async function applyDbConstraints() {
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
