import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

// Behind the Replit proxy / load balancer — trust X-Forwarded-* so rate
// limiting and client IP detection use the real client address.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
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

// Security headers. CSP is disabled here because this is an API server (the web
// artifact sets its own CSP) and to avoid breaking the Clerk proxy.
app.use(helmet({ contentSecurityPolicy: false }));

// Gzip responses to reduce bandwidth under load.
app.use(compression());

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
// Bound request body size to protect against memory-exhaustion attacks.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Global API rate limiter — protects the server from being overwhelmed by a
// single client. Server-Sent Events streams are long-lived single requests, so
// they are excluded from the per-request counter.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.path.endsWith("/stream") || (req.headers.accept ?? "").includes("text/event-stream"),
  message: { error: "Too many requests — please slow down and try again shortly." },
});
app.use("/api", apiLimiter);

app.use("/api", router);

// Centralized error handler — guarantees a consistent JSON shape and ensures an
// unhandled error in any route never leaks a stack trace or crashes the worker.
app.use((err: Error & { statusCode?: number; status?: number }, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) {
    req.log?.error({ err }, "Unhandled error in request");
  }
  if (res.headersSent) return;
  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal server error" : err.message,
  });
});

export default app;
