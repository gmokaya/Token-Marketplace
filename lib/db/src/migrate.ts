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
      IF OLD.state = 'INGESTED' AND NEW.state IN ('MARKET_LISTED', 'ENCUMBERED') THEN
        RETURN NEW;
      END IF;
      IF OLD.state = 'MARKET_LISTED' AND NEW.state IN ('INGESTED', 'LOCK_TRADING', 'ENCUMBERED') THEN
        RETURN NEW;
      END IF;
      IF OLD.state = 'LOCK_TRADING' AND NEW.state IN ('MARKET_LISTED', 'SETTLED') THEN
        RETURN NEW;
      END IF;
      IF OLD.state = 'SETTLED' THEN
        RAISE EXCEPTION 'eWR is in final SETTLED state and cannot be transitioned';
      END IF;
      IF OLD.state = 'ENCUMBERED' AND NEW.state IN ('INGESTED') THEN
        RETURN NEW;
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
