import app from "./app";
import { logger } from "./lib/logger";
import { startOrderExpiryWorker } from "./routes/orders";
import { startAuctionExpiryWorker } from "./routes/auctions";
import { applyDbConstraints } from "@workspace/db/migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await applyDbConstraints();
    logger.info("DB constraints applied");
  } catch (constraintErr) {
    logger.warn({ err: constraintErr }, "Could not apply DB constraints — continuing");
  }

  startOrderExpiryWorker();
  startAuctionExpiryWorker();
});
