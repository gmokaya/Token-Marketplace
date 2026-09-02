import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import healthRouter from "./routes/health";
import { logger } from "./lib/logger";
import {
  getRuntimeProfile,
  marketAllowsCommodity,
  type RuntimeProfile,
} from "./lib/runtime-profile";

function explicitCommodity(req: Request): unknown {
  const body = req.body as Record<string, unknown> | undefined;
  return (
    body?.commodityType ??
    body?.commodity ??
    req.query.commodityType ??
    req.query.commodity
  );
}

const isFamily = (path: string, family: string) =>
  path === family || path.startsWith(`${family}/`);

function isPathOwnedByRuntime(profile: RuntimeProfile, path: string): boolean {
  if (profile.role === "gateway" || profile.role === "worker") return true;
  if (profile.role === "core") {
    return !(
      path === "/tea" ||
      path.startsWith("/tea/") ||
      path === "/coffee" ||
      path.startsWith("/coffee/") ||
      path === "/cooperatives" ||
      path.startsWith("/cooperatives/")
    );
  }
  if (profile.market === "tea") {
    return !isFamily(path, "/coffee") && !isFamily(path, "/cooperatives");
  }
  if (profile.market === "coffee") {
    return !isFamily(path, "/tea") && !isFamily(path, "/cooperatives");
  }
  return !isFamily(path, "/tea") && !isFamily(path, "/coffee");
}

export function createApp(profile: RuntimeProfile = getRuntimeProfile()): Express {
  const app: Express = express();

  // Behind the Replit proxy / load balancer — trust X-Forwarded-* so rate
  // limiting and client IP detection use the real client address.
  app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      logger,
      customProps: () => ({
        runtimeRole: profile.role,
        market: profile.market,
      }),
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );

  app.use((_req, res, next) => {
    res.setHeader("X-TokenHarvest-Runtime", profile.role);
    if (profile.market) res.setHeader("X-TokenHarvest-Market", profile.market);
    next();
  });

  // Security headers. CSP is disabled here because this is an API server.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  app.use(cors({ credentials: true, origin: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  app.use(
    clerkMiddleware(() => ({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    })),
  );

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 600,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) =>
      req.path.endsWith("/stream") ||
      (req.headers.accept ?? "").includes("text/event-stream"),
    message: {
      error: "Too many requests — please slow down and try again shortly.",
      code: "RATE_LIMITED",
      market: profile.market,
    },
  });
  app.use(profile.basePath, apiLimiter);

  if (profile.role !== "gateway" && profile.role !== "worker") {
    app.use(profile.basePath, (req, res, next) => {
      if (!isPathOwnedByRuntime(profile, req.path)) {
        res.status(404).json({
          error: "Route is not owned by this market runtime",
          code: "ROUTE_NOT_OWNED",
          market: profile.market,
        });
        return;
      }
      if (
        profile.market &&
        !marketAllowsCommodity(profile.market, explicitCommodity(req))
      ) {
        res.status(409).json({
          error: `Request does not belong to the ${profile.market} market`,
          code: "MARKET_SCOPE_MISMATCH",
          market: profile.market,
        });
        return;
      }
      next();
    });
  }

  app.use(profile.basePath, profile.httpMode === "health-only" ? healthRouter : router);

  app.use(
    (
      err: Error & { statusCode?: number; status?: number },
      req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const statusCode = err.statusCode || err.status || 500;
      if (statusCode >= 500) {
        req.log?.error(
          { err, market: profile.market, runtimeRole: profile.role },
          "Unhandled error in request",
        );
      }
      if (res.headersSent) return;
      res.status(statusCode).json({
        error: statusCode >= 500 ? "Internal server error" : err.message,
        code: statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        market: profile.market,
      });
    },
  );

  return app;
}

const app = createApp();

export default app;
