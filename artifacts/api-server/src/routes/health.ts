import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getSubscriberStatus } from "../lib/pg-pubsub";
import { getRuntimeReadiness } from "../lib/runtime-health";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const { status: pubsubStatus, reconnectingForMs } = getSubscriberStatus();
  const overallStatus = pubsubStatus === "reconnecting" ? "degraded" : "ok";
  const data = HealthCheckResponse.parse({
    status: overallStatus,
    pubsub: {
      status: pubsubStatus,
      ...(reconnectingForMs !== null ? { reconnectingForMs } : {}),
    },
  });
  res.json(data);
});

// Liveness deliberately has no dependency checks. It answers whether this
// process can serve HTTP, not whether its backing services are ready.
router.get("/livez", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/readyz", async (_req, res) => {
  const readiness = await getRuntimeReadiness();
  res.status(readiness.status === "ready" ? 200 : 503).json(readiness);
});

export default router;
