import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { spotListingsTable, ewrsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";

const PLATFORM_FEE_RATE = 0.02;
const ESCROW_FEE_RATE = 0.005;

const router = Router();

async function enrichListing(listing: typeof spotListingsTable.$inferSelect) {
  const [ewr] = await db
    .select()
    .from(ewrsTable)
    .where(eq(ewrsTable.id, listing.ewrId))
    .limit(1);

  const [seller] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, listing.sellerId))
    .limit(1);

  const weightMt = ewr ? parseFloat(ewr.weightMt) : 0;
  const pricePerMt = parseFloat(listing.pricePerMt);
  const totalValueUsd = weightMt * pricePerMt;
  const platformFeeUsd = totalValueUsd * PLATFORM_FEE_RATE;
  const escrowFeeUsd = totalValueUsd * ESCROW_FEE_RATE;

  return {
    ...listing,
    sellerName: seller?.name ?? null,
    commodityType: ewr?.commodityType ?? null,
    grade: ewr?.grade ?? null,
    weightMt: ewr ? ewr.weightMt : null,
    warehouseCode: ewr?.warehouseCode ?? null,
    moisturePct: ewr?.moisturePct ?? null,
    harvestSeason: ewr?.harvestSeason ?? null,
    totalValueUsd: totalValueUsd > 0 ? totalValueUsd : null,
    platformFeeUsd: totalValueUsd > 0 ? platformFeeUsd : null,
    escrowFeeUsd: totalValueUsd > 0 ? escrowFeeUsd : null,
  };
}

router.get("/listings", async (req, res) => {
  const { commodityType, grade, warehouseCode, minPrice, maxPrice, status } = req.query as {
    commodityType?: string;
    grade?: string;
    warehouseCode?: string;
    minPrice?: string;
    maxPrice?: string;
    status?: string;
  };

  const listingConditions: SQL[] = [];
  if (status) {
    listingConditions.push(eq(spotListingsTable.status, status as typeof spotListingsTable.$inferSelect["status"]));
  } else {
    listingConditions.push(eq(spotListingsTable.status, "ACTIVE"));
  }
  if (minPrice) listingConditions.push(gte(spotListingsTable.pricePerMt, minPrice));
  if (maxPrice) listingConditions.push(lte(spotListingsTable.pricePerMt, maxPrice));

  const ewrConditions: SQL[] = [];
  if (commodityType) ewrConditions.push(eq(ewrsTable.commodityType, commodityType as typeof ewrsTable.$inferSelect["commodityType"]));
  if (grade) ewrConditions.push(eq(ewrsTable.grade, grade));
  if (warehouseCode) ewrConditions.push(eq(ewrsTable.warehouseCode, warehouseCode));

  const rows = await db
    .select({
      listing: spotListingsTable,
      ewr: ewrsTable,
      sellerName: usersTable.name,
    })
    .from(spotListingsTable)
    .leftJoin(ewrsTable, eq(spotListingsTable.ewrId, ewrsTable.id))
    .leftJoin(usersTable, eq(spotListingsTable.sellerId, usersTable.id))
    .where(
      and(
        ...[
          ...listingConditions,
          ...(ewrConditions.length > 0 ? ewrConditions : []),
        ]
      )
    );

  const enriched = rows.map(({ listing, ewr, sellerName }) => {
    const weightMt = ewr ? parseFloat(ewr.weightMt) : 0;
    const pricePerMt = parseFloat(listing.pricePerMt);
    const totalValueUsd = weightMt * pricePerMt;
    return {
      ...listing,
      sellerName: sellerName ?? null,
      commodityType: ewr?.commodityType ?? null,
      grade: ewr?.grade ?? null,
      weightMt: ewr ? ewr.weightMt : null,
      warehouseCode: ewr?.warehouseCode ?? null,
      moisturePct: ewr?.moisturePct ?? null,
      harvestSeason: ewr?.harvestSeason ?? null,
      totalValueUsd: totalValueUsd > 0 ? totalValueUsd : null,
      platformFeeUsd: totalValueUsd > 0 ? totalValueUsd * PLATFORM_FEE_RATE : null,
      escrowFeeUsd: totalValueUsd > 0 ? totalValueUsd * ESCROW_FEE_RATE : null,
    };
  });

  return res.json(enriched);
});

router.post("/listings", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.tier !== "PRODUCER") return res.status(403).json({ error: "Only PRODUCER accounts can create listings" });

  const { ewrId, pricePerMt, currency = "USD" } = req.body as {
    ewrId: number;
    pricePerMt: number;
    currency?: string;
  };

  if (!ewrId || !pricePerMt) return res.status(400).json({ error: "ewrId and pricePerMt are required" });

  const [ewr] = await db.select().from(ewrsTable).where(eq(ewrsTable.id, ewrId)).limit(1);
  if (!ewr) return res.status(404).json({ error: "eWR not found" });
  if (ewr.ownerId !== user.id) return res.status(403).json({ error: "You do not own this eWR" });
  // INGESTED and ENCUMBERED receipts are both tradeable; only physical exit is blocked by the lien
  if (!["INGESTED", "ENCUMBERED"].includes(ewr.state)) {
    return res.status(400).json({ error: "eWR must be in INGESTED or ENCUMBERED state to create a listing" });
  }

  const [listing] = await db.insert(spotListingsTable).values({
    ewrId,
    sellerId: user.id,
    pricePerMt: String(pricePerMt),
    currency,
    status: "ACTIVE",
  }).returning();

  await db.update(ewrsTable).set({ state: "MARKET_LISTED" }).where(eq(ewrsTable.id, ewrId));

  const enriched = await enrichListing(listing);
  return res.status(201).json(enriched);
});

router.get("/listings/:listingId", async (req, res) => {
  const listingId = parseInt(req.params.listingId);
  if (isNaN(listingId)) return res.status(400).json({ error: "Invalid listing ID" });

  const [listing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, listingId)).limit(1);
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  const [ewr] = await db
    .select({
      id: ewrsTable.id,
      ewrsReceiptId: ewrsTable.ewrsReceiptId,
      wrscSignature: ewrsTable.wrscSignature,
      warehouseCode: ewrsTable.warehouseCode,
      commodityType: ewrsTable.commodityType,
      grade: ewrsTable.grade,
      weightMt: ewrsTable.weightMt,
      moisturePct: ewrsTable.moisturePct,
      harvestSeason: ewrsTable.harvestSeason,
      isLienActive: ewrsTable.isLienActive,
      lienHolderId: ewrsTable.lienHolderId,
      state: ewrsTable.state,
      ownerId: ewrsTable.ownerId,
      ownerName: usersTable.name,
      expiryAt: ewrsTable.expiryAt,
      issuedAt: ewrsTable.issuedAt,
      estimatedValueUsd: ewrsTable.estimatedValueUsd,
    })
    .from(ewrsTable)
    .leftJoin(usersTable, eq(ewrsTable.ownerId, usersTable.id))
    .where(eq(ewrsTable.id, listing.ewrId))
    .limit(1);

  const enrichedListing = await enrichListing(listing);
  return res.json({ listing: enrichedListing, ewr });
});

router.delete("/listings/:listingId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const listingId = parseInt(req.params.listingId);
  if (isNaN(listingId)) return res.status(400).json({ error: "Invalid listing ID" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [listing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, listingId)).limit(1);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.sellerId !== user.id) return res.status(403).json({ error: "Forbidden" });
  if (listing.status !== "ACTIVE") return res.status(400).json({ error: "Only ACTIVE listings can be cancelled" });

  const [cancelled] = await db.update(spotListingsTable)
    .set({ status: "CANCELLED" })
    .where(eq(spotListingsTable.id, listingId))
    .returning();

  await db.update(ewrsTable).set({ state: "INGESTED" }).where(eq(ewrsTable.id, listing.ewrId));

  const enriched = await enrichListing(cancelled);
  return res.json(enriched);
});

export default router;
