import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getSubscriberStatus } from "../lib/pg-pubsub";

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

export default router;
