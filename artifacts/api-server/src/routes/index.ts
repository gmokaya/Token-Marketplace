import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import healthRouter from "./health";
import usersRouter from "./users";
import ewrsRouter from "./ewrs";
import listingsRouter from "./listings";
import ordersRouter from "./orders";
import statsRouter from "./stats";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

router.use(healthRouter);

router.use(requireAuth);

router.use(usersRouter);
router.use(ewrsRouter);
router.use(listingsRouter);
router.use(ordersRouter);
router.use(statsRouter);

export default router;
