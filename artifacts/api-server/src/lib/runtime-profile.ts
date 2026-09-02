export type MarketRuntime = "grain" | "coffee" | "tea";
export type ApiRuntimeRole = "gateway" | "core" | MarketRuntime | "worker";
export type WorkerGroup = "core" | MarketRuntime;

export interface RuntimeProfile {
  role: ApiRuntimeRole;
  market: MarketRuntime | null;
  basePath: string;
  workerGroups: ReadonlySet<WorkerGroup>;
  httpMode: "api" | "health-only";
}

const MARKET_ROLES = new Set<MarketRuntime>(["grain", "coffee", "tea"]);
const WORKER_GROUPS = new Set<WorkerGroup>(["core", "grain", "coffee", "tea"]);

function normalizeBasePath(value: string): string {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
}

function parseRole(value: string | undefined): ApiRuntimeRole {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "gateway" ||
    normalized === "core" ||
    normalized === "grain" ||
    normalized === "coffee" ||
    normalized === "tea" ||
    normalized === "worker"
  ) {
    return normalized;
  }
  return "gateway";
}

function defaultBasePath(role: ApiRuntimeRole, market: MarketRuntime | null): string {
  if (market) return `/api/v1/${market}`;
  if (role === "core") return "/api/v1/core";
  if (role === "worker") return "/api/internal/worker";
  return "/api";
}

function parseWorkerGroups(role: ApiRuntimeRole, market: MarketRuntime | null): ReadonlySet<WorkerGroup> {
  const configured = process.env.API_WORKER_GROUPS;
  if (configured !== undefined) {
    const groups = configured
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value): value is WorkerGroup => WORKER_GROUPS.has(value as WorkerGroup));
    return new Set(groups);
  }

  if (market) return new Set([market]);
  if (role === "core") return new Set(["core"]);
  if (role === "worker") return new Set();

  // Compatibility mode: the existing gateway continues all jobs until dedicated
  // worker deployments are enabled. Setting API_WORKER_GROUPS="" disables them.
  return new Set<WorkerGroup>(["core", "grain", "coffee", "tea"]);
}

export function getRuntimeProfile(): RuntimeProfile {
  const role = parseRole(process.env.API_RUNTIME_ROLE);
  const market = MARKET_ROLES.has(role as MarketRuntime) ? (role as MarketRuntime) : null;
  const basePath = normalizeBasePath(process.env.API_BASE_PATH ?? defaultBasePath(role, market));
  const httpMode = process.env.API_HTTP_MODE === "health-only" ? "health-only" : "api";

  return {
    role,
    market,
    basePath,
    workerGroups: parseWorkerGroups(role, market),
    httpMode,
  };
}

export function marketAllowsCommodity(market: MarketRuntime, value: unknown): boolean {
  if (typeof value !== "string" || value.trim() === "") return true;
  const commodity = value.trim().toUpperCase();
  if (market === "coffee") return commodity === "COFFEE";
  if (market === "tea") return commodity === "TEA";
  return commodity === "MAIZE" || commodity === "RICE" || commodity === "AVOCADO" || commodity === "GRAIN";
}