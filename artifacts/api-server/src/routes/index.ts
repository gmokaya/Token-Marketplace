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
import factoryRouter, { FACTORY_API_CONFIGURED } from "./factory";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
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

// Object storage — upload URL request is auth-gated inline; serving is public
router.use(storageRouter);

// eWR external API + registry-sync webhook — own auth, must come before Clerk requireAuth
router.use(healthRouter);
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

export default router;
