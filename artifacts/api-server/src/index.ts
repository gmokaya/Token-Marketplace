import type { Server } from "node:http";
import type { Socket } from "node:net";
import app from "./app";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
import { startOrderExpiryWorker } from "./routes/orders";
import { startAuctionExpiryWorker, broadcastSseEvent, broadcastReconnectHint } from "./routes/auctions";
import { startTeaAuctionWorker } from "./lib/tea-auction-worker";
import { startAvocadoDegradationWorker } from "./routes/ewrs";
import { startForwardMaturityWorker } from "./routes/forwards";
import {
  startAuctionPubSubSubscriber,
  stopAuctionPubSubSubscriber,
  setAuctionEventHandler,
  setReconnectHandler,
} from "./lib/pg-pubsub";
import { verifyPublicationConstraintReady } from "./lib/publication-constraint";
import { startMarketCloseWorker } from "./lib/market-close-service";
import { getRuntimeProfile } from "./lib/runtime-profile";
import { markRuntimeDraining } from "./lib/runtime-health";

const rawPort = process.env["PORT"];
const runtimeProfile = getRuntimeProfile();
type WorkerHandle = { stop(): Promise<void> };
const workerHandles: WorkerHandle[] = [];

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
  // Must be set before any client connects. keepAliveTimeout must be greater
  // than the upstream load-balancer / proxy idle timeout (typically 60 s) to
  // prevent "connection reset" errors under sustained load. headersTimeout
  // must be strictly greater than keepAliveTimeout.
  server.keepAliveTimeout = 65_000;   // 65 s > typical LB 60 s idle timeout
  server.headersTimeout   = 66_000;   // 1 s grace above keepAliveTimeout

  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info(
    {
      port,
      role: runtimeProfile.role,
      market: runtimeProfile.market,
      basePath: runtimeProfile.basePath,
      workerGroups: [...runtimeProfile.workerGroups],
    },
    "Server listening",
  );

  try {
    const ready = await verifyPublicationConstraintReady();
    if (!ready) {
      logger.error("Publication constraint is not ready; waiting for database bootstrap");
    }
  } catch (pubConstraintErr) {
    logger.error(
      { err: pubConstraintErr },
      "Could not verify publication constraint; readiness will remain false",
    );
  }

  if (runtimeProfile.workerGroups.has("core")) {
    workerHandles.push(
      startOrderExpiryWorker(),
      startAuctionExpiryWorker(),
      startForwardMaturityWorker(),
      startMarketCloseWorker(),
    );
  }
  if (runtimeProfile.workerGroups.has("grain")) {
    workerHandles.push(startAvocadoDegradationWorker());
  }
  if (runtimeProfile.workerGroups.has("tea")) {
    workerHandles.push(startTeaAuctionWorker());
  }

  // Wire pg LISTEN/NOTIFY so every instance fans out SSE events received from any instance
  setAuctionEventHandler((payload) => {
    broadcastSseEvent(payload.auctionId, payload.type, payload.data);
  });
  // Notify SSE clients to re-fetch state after a subscriber reconnect gap
  setReconnectHandler((_gapMs) => {
    broadcastReconnectHint();
  });
  startAuctionPubSubSubscriber()
    .catch((err) =>
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
  markRuntimeDraining();
  logger.info({ signal, openSockets: openSockets.size }, "Shutting down gracefully");
  const dependencyDrain = Promise.all([
    ...workerHandles.splice(0).map((worker) => worker.stop()),
    // This module-level stop is registered before the initial LISTEN connection
    // resolves, so it also closes the SIGTERM-during-connect race.
    stopAuctionPubSubSubscriber(),
  ]);

  const forceExit = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  server.close(async (err) => {
    if (err) logger.error({ err }, "Error closing HTTP server");
    try {
      await dependencyDrain;
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
