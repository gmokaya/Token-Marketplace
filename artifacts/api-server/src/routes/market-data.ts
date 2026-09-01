import { Router, type IRouter } from "express";
import { GetDailyMarketClosesResponse } from "@workspace/api-zod";
import { getDailyMarketCloseFeed } from "../lib/market-close-service";

const router: IRouter = Router();

router.get("/market-data/daily-closes", async (req, res): Promise<void> => {
  const feed = await getDailyMarketCloseFeed();
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=300",
  );
  res.json(GetDailyMarketClosesResponse.parse(feed));
});

export default router;