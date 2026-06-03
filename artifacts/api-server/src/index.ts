import type { Server } from "node:http";
import type { Socket } from "node:net";
import app from "./app";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import { startOrderExpiryWorker } from "./routes/orders";
import { startAuctionExpiryWorker, broadcastSseEvent, broadcastReconnectHint } from "./routes/auctions";
import { startAvocadoDegradationWorker } from "./routes/ewrs";
import { startForwardMaturityWorker } from "./routes/forwards";
import { startAuctionPubSubSubscriber, setAuctionEventHandler, setReconnectHandler } from "./lib/pg-pubsub";
import { applyDbConstraints } from "@workspace/db/migrate";
import { ensureAdminUser } from "./lib/ensure-admin";

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

const server: Server = app.listen(port, async (err) => {
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

  try {
    await ensureAdminUser();
  } catch (adminErr) {
    logger.warn({ err: adminErr }, "Could not ensure admin user — continuing");
  }

  startOrderExpiryWorker();
  startAuctionExpiryWorker();
  startAvocadoDegradationWorker();
  startForwardMaturityWorker();

  // Wire pg LISTEN/NOTIFY so every instance fans out SSE events received from any instance
  setAuctionEventHandler((payload) => {
    broadcastSseEvent(payload.auctionId, payload.type, payload.data);
  });
  // Notify SSE clients to re-fetch state after a subscriber reconnect gap
  setReconnectHandler((_gapMs) => {
    broadcastReconnectHint();
  });
  startAuctionPubSubSubscriber().catch((err) =>
    logger.error({ err }, "Failed to start auction pub/sub subscriber"),
  );
});

// Track open sockets so shutdown can deterministically close long-lived
// connections (e.g. SSE auction streams) that would otherwise keep the HTTP
// server from closing and block the DB pool from draining.
const openSockets = new Set<Socket>();
server.on("connection", (socket) => {
  openSockets.add(socket);
  socket.on("close", () => openSockets.delete(socket));
});

// Graceful shutdown: stop accepting new connections, give in-flight requests a
// brief window to finish, force-close lingering long-lived sockets, then drain
// the DB pool so no transaction is cut off mid-flight.
let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal, openSockets: openSockets.size }, "Shutting down gracefully");

  const forceExit = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  server.close(async (err) => {
    if (err) logger.error({ err }, "Error closing HTTP server");
    try {
      await pool.end();
      logger.info("DB pool drained");
    } catch (poolErr) {
      logger.error({ err: poolErr }, "Error draining DB pool");
    }
    clearTimeout(forceExit);
    process.exit(err ? 1 : 0);
  });

  // Allow short requests to finish, then destroy lingering sockets (SSE streams)
  // so server.close() can complete and the pool can drain deterministically.
  setTimeout(() => {
    for (const socket of openSockets) socket.destroy();
  }, 3_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
