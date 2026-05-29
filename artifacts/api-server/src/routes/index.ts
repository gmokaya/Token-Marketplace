import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import healthRouter from "./health";
import usersRouter from "./users";
import ewrsRouter from "./ewrs";
import listingsRouter from "./listings";
import ordersRouter from "./orders";
import statsRouter from "./stats";
import auctionsRouter from "./auctions";
import forwardsRouter from "./forwards";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use(healthRouter);

router.use(requireAuth);

router.use(usersRouter);
router.use(ewrsRouter);
router.use(listingsRouter);
router.use(ordersRouter);
router.use(statsRouter);
router.use(auctionsRouter);
router.use(forwardsRouter);

export default router;
