import { pool } from "@workspace/db";
import { getSubscriberStatus } from "./pg-pubsub";
import {
  isPublicationConstraintReady,
  verifyPublicationConstraintReady,
} from "./publication-constraint";
import { getRuntimeProfile } from "./runtime-profile";

const DATABASE_PROBE_TIMEOUT_MS = (() => {
  const configured = Number(process.env.HEALTHCHECK_DB_TIMEOUT_MS ?? 3_000);
  return Number.isFinite(configured) && configured > 0 ? configured : 3_000;
})();

type ComponentStatus = "ready" | "not_ready";
let acceptingTraffic = true;

export function markRuntimeDraining(): void {
  acceptingTraffic = false;
}

export type RuntimeReadiness = {
  status: ComponentStatus;
  service: {
    role: string;
    market: string | null;
    basePath: string;
    acceptingTraffic: boolean;
  };
  core: {
    status: ComponentStatus;
    database: { status: ComponentStatus; error?: string };
    publicationConstraint: { status: ComponentStatus };
    pubsub: {
      status: ComponentStatus;
      subscriberStatus: ReturnType<typeof getSubscriberStatus>["status"];
      reconnectingForMs?: number;
    };
  };
  markets: Record<"coffee" | "tea" | "grain", { status: ComponentStatus }>;
};

async function probeDatabase(): Promise<{ status: ComponentStatus; error?: string }> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`Database probe timed out after ${DATABASE_PROBE_TIMEOUT_MS}ms`)),
        DATABASE_PROBE_TIMEOUT_MS,
      );
      timeout.unref();
    });
    await Promise.race([pool.query("SELECT 1"), timeoutPromise]);
    return { status: "ready" };
  } catch {
    // Do not expose database connection details on a public endpoint.
    return { status: "not_ready", error: "Database probe failed" };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * A readiness snapshot only reports dependencies this process actually owns.
 * Coffee, tea, and grain are served by this same API runtime, so they share the
 * core dependency set while still being reported independently for routing and
 * operational dashboards.
 */
export async function getRuntimeReadiness(): Promise<RuntimeReadiness> {
  const profile = getRuntimeProfile();
  const database = await probeDatabase();
  if (database.status === "ready" && !isPublicationConstraintReady()) {
    await verifyPublicationConstraintReady().catch(() => false);
  }
  const publicationConstraint = {
    status: isPublicationConstraintReady() ? "ready" : "not_ready",
  } as const;
  const subscriber = getSubscriberStatus();
  const pubsub = {
    status: subscriber.status === "connected" ? "ready" : "not_ready",
    subscriberStatus: subscriber.status,
    ...(subscriber.reconnectingForMs !== null
      ? { reconnectingForMs: subscriber.reconnectingForMs }
      : {}),
  } as const;

  const coreStatus: ComponentStatus =
    acceptingTraffic &&
    database.status === "ready" &&
    publicationConstraint.status === "ready" &&
    pubsub.status === "ready"
      ? "ready"
      : "not_ready";

  return {
    status: coreStatus,
    service: {
      role: profile.role,
      market: profile.market,
      basePath: profile.basePath,
      acceptingTraffic,
    },
    core: {
      status: coreStatus,
      database,
      publicationConstraint,
      pubsub,
    },
    markets: {
      coffee: { status: coreStatus },
      tea: { status: coreStatus },
      grain: { status: coreStatus },
    },
  };
}