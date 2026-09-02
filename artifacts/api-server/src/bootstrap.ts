import type { Server } from "node:http";
import express from "express";
import { pool } from "@workspace/db";
import { applyDbConstraints, ensurePublicationConstraint } from "@workspace/db/migrate";
import { ensureAdminUser } from "./lib/ensure-admin";
import { logger } from "./lib/logger";

const rawPort = process.env.PORT;
if (!rawPort || !Number.isFinite(Number(rawPort))) {
  throw new Error("PORT is required for database bootstrap");
}

const basePath = (process.env.API_BASE_PATH ?? "/api/internal/bootstrap").replace(/\/+$/, "");
let ready = false;
let bootstrapError: string | null = null;

const app = express();
app.get(`${basePath}/livez`, (_req, res) => res.json({ status: "ok" }));
app.get(`${basePath}/healthz`, (_req, res) =>
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "initializing",
    error: bootstrapError,
  }),
);
app.get(`${basePath}/readyz`, (_req, res) =>
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    error: bootstrapError,
  }),
);

const server: Server = app.listen(Number(rawPort), async () => {
  logger.info({ port: Number(rawPort), basePath }, "Database bootstrap service listening");
  try {
    await applyDbConstraints();
    await ensurePublicationConstraint();
    await ensureAdminUser();
    ready = true;
    logger.info("Database bootstrap completed");
  } catch (err) {
    bootstrapError = "Database bootstrap failed";
    logger.error({ err }, bootstrapError);
  }
});

let stopping = false;
function shutdown(signal: string): void {
  if (stopping) return;
  stopping = true;
  ready = false;
  logger.info({ signal }, "Stopping database bootstrap service");
  server.close(async () => {
    await pool.end().catch((err) => logger.error({ err }, "Failed to drain bootstrap DB pool"));
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));