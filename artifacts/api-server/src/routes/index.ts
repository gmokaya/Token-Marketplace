import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import healthRouter from "./health";
import storageRouter from "./storage";
import usersRouter from "./users";
import ewrsRouter from "./ewrs";
import listingsRouter from "./listings";
import ordersRouter from "./orders";
import statsRouter from "./stats";
import auctionsRouter from "./auctions";
import forwardsRouter from "./forwards";
import financingRouter from "./financing";
import settlementsRouter from "./settlements";
import adminRouter from "./admin";
import wrscRouter from "./wrsc";
import profilesRouter from "./profiles";
import contentRouter from "./content";
import contactRouter from "./contact";
import ewrApiRouter, { EWR_API_SECURELY_CONFIGURED } from "./ewr-api";
import cooperativesRouter from "./cooperatives";
import teaLotsRouter from "./tea-lots";
import brokerMandatesRouter from "./broker-mandates";
import teaAuctionsRouter from "./tea-auctions";
import warehouseProfilesRouter from "./warehouse-profiles";
import factoryRouter, { FACTORY_API_CONFIGURED } from "./factory";
import teaProductsRouter from "./tea-products";
import teaRfqsRouter from "./tea-rfqs";
import teaShipmentsRouter from "./tea-shipments";
import teaEsgRouter from "./tea-esg";
import coffeeLotsRouter from "./coffee-lots";
import coffeeAuctionsRouter from "./coffee-auctions";
import coffeeRfqsRouter from "./coffee-rfqs";
import coffeeShipmentsRouter from "./coffee-shipments";
import coffeeEsgRouter from "./coffee-esg";
import listingPublicationsRouter from "./listing-publications";
import integrationCredentialsRouter, { resolveApiKeyUser } from "./integration-credentials";
import providerMarketplaceRouter from "./provider-marketplace";
import marketDataRouter from "./market-data";
import onboardingRouter from "./onboarding";

const router: IRouter = Router();

/**
 * Pre-auth: if a valid sk_* API key is present in X-Api-Key, resolve it and
 * store the result on a custom request property.
 *
 * IMPORTANT: Do NOT touch req.auth — Clerk installs it as a callable function
 * and overwriting it with a plain object causes getAuth(req) to throw a TypeError.
 * Route handlers that accept API-key auth read from (req as any).__apiKeyUser instead.
 */
async function apiKeyPreAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawKey = req.headers["x-api-key"];
  if (typeof rawKey !== "string" || !rawKey.startsWith("sk_")) {
    next();
    return;
  }
  try {
    const result = await resolveApiKeyUser(rawKey);
    if (result) {
      (req as any).__apiKeyUser = result;
    }
  } catch {
    // On DB error, fall through — requireAuth will reject if Clerk auth is also absent
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Accept either a Clerk session OR a valid API key resolved by apiKeyPreAuth
  if ((req as any).__apiKeyUser) {
    next();
    return;
  }
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Public content endpoint — no auth needed
router.use(contentRouter);

// Public contact form — no auth needed
router.use(contactRouter);

// Public, read-only official end-of-day market closes
router.use(marketDataRouter);

// Object storage — upload URL request is auth-gated inline; serving is public
router.use(storageRouter);

// API-key pre-auth: must run before requireAuth so X-Api-Key requests can pass Clerk gate
router.use(apiKeyPreAuth);

// eWR external API + registry-sync webhook — own auth, must come before Clerk requireAuth
router.use(healthRouter);
// First-party external marketplace provider contract — Bearer-token auth
router.use(providerMarketplaceRouter);
// In production this pre-auth surface is only mounted when its secrets are explicitly
// configured; otherwise it stays disabled so it can never run with default secrets.
if (EWR_API_SECURELY_CONFIGURED) {
  router.use(ewrApiRouter);
} else {
  console.warn(
    "[routes] eWR external API disabled in production: set WRSC_SECRET, EWR_JWT_SECRET and EWR_OAUTH_CLIENTS to enable it."
  );
}

// Factory portal — service-to-service API key auth; must come before Clerk requireAuth
if (FACTORY_API_CONFIGURED) {
  router.use(factoryRouter);
} else {
  console.warn("[routes] Factory integration disabled: set FACTORY_API_KEY to enable POST /factory/ewrs.");
}

router.use(requireAuth);

router.use(usersRouter);
router.use(onboardingRouter);
router.use(ewrsRouter);
router.use(listingsRouter);
router.use(ordersRouter);
router.use(statsRouter);
router.use(auctionsRouter);
router.use(forwardsRouter);
router.use(financingRouter);
router.use(settlementsRouter);
router.use(adminRouter);
router.use(profilesRouter);
router.use(wrscRouter);
router.use(cooperativesRouter);
router.use(teaLotsRouter);
router.use(brokerMandatesRouter);
router.use(teaAuctionsRouter);
router.use(warehouseProfilesRouter);
router.use(teaProductsRouter);
router.use(teaRfqsRouter);
router.use(teaShipmentsRouter);
router.use(teaEsgRouter);
router.use(coffeeLotsRouter);
router.use(coffeeAuctionsRouter);
router.use(coffeeRfqsRouter);
router.use(coffeeShipmentsRouter);
router.use(coffeeEsgRouter);
router.use(listingPublicationsRouter);
router.use(integrationCredentialsRouter);

export default router;
