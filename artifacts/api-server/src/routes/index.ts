import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import ewrsRouter from "./ewrs";
import listingsRouter from "./listings";
import ordersRouter from "./orders";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(ewrsRouter);
router.use(listingsRouter);
router.use(ordersRouter);
router.use(statsRouter);

export default router;
