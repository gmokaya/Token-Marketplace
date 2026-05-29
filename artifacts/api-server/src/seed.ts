import { db } from "@workspace/db";
import {
  usersTable,
  ewrsTable,
  spotListingsTable,
  auctionsTable,
  auctionBidsTable,
  forwardContractsTable,
  contractEventsTable,
  financingRequestsTable,
  loansTable,
  settlementsTable,
  auditLogTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { createHash } from "crypto";

function sha256(payload: object): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  await db.delete(auditLogTable);
  await db.delete(settlementsTable);
  await db.delete(loansTable);
  await db.delete(financingRequestsTable);
  await db.delete(contractEventsTable);
  await db.delete(forwardContractsTable);
  await db.delete(auctionBidsTable);
  await db.delete(auctionsTable);
  await db.delete(spotListingsTable);
  await db.delete(ewrsTable);
  await db.delete(usersTable);

  const [producer1, producer2, offtaker, enabler, financier] = await db
    .insert(usersTable)
    .values([
      {
        clerkId: "seed_producer_001",
        name: "Kariuki Farms Ltd",
        email: "kariuki@seedfarms.wrs",
        tier: "PRODUCER",
        reputationScore: 95,
        kybStatus: "VERIFIED",
        company: "Kariuki Farms Ltd",
      },
      {
        clerkId: "seed_producer_002",
        name: "Ngugi Cooperative Society",
        email: "ngugi@seedcoop.wrs",
        tier: "PRODUCER",
        reputationScore: 82,
        kybStatus: "VERIFIED",
        company: "Ngugi Cooperative Society",
      },
      {
        clerkId: "seed_offtaker_001",
        name: "East Africa Millers Ltd",
        email: "eaml@seedmill.wrs",
        tier: "OFF_TAKER",
        reputationScore: 88,
        kybStatus: "VERIFIED",
        company: "East Africa Millers Ltd",
      },
      {
        clerkId: "seed_enabler_001",
        name: "Nakuru Warehouse Services",
        email: "nws@seedwarehouse.wrs",
        tier: "ENABLER",
        reputationScore: 76,
        kybStatus: "VERIFIED",
        company: "Nakuru Warehouse Services",
      },
      {
        clerkId: "seed_financier_001",
        name: "AgriFinance Bank Kenya",
        email: "afb@seedbank.wrs",
        tier: "FINANCIER",
        reputationScore: 99,
        kybStatus: "VERIFIED",
        company: "AgriFinance Bank Kenya",
      },
    ])
    .returning();

  console.log("Users seeded:", [producer1, producer2, offtaker, enabler, financier].map(u => u.name));

  const now = new Date();
  const avocadoExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const ewrValues = [
    // --- Maize (6 receipts) ---
    {
      ewrsReceiptId: "EWR-NBI-2025-001",
      wrscSignature: "WRSC-SIG-7f8a9b2c",
      warehouseCode: "NBI-WH-01",
      commodityType: "MAIZE" as const,
      grade: "Grade 1",
      weightMt: "250.000",
      moisturePct: "12.50",
      harvestSeason: "2025-LR",
      isLienActive: false,
      state: "INGESTED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "50000.00",
    },
    {
      ewrsReceiptId: "EWR-NBI-2025-002",
      wrscSignature: "WRSC-SIG-3c4d5e6f",
      warehouseCode: "NBI-WH-01",
      commodityType: "MAIZE" as const,
      grade: "Grade 2",
      weightMt: "180.500",
      moisturePct: "13.20",
      harvestSeason: "2025-LR",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "32490.00",
    },
    {
      ewrsReceiptId: "EWR-NBI-2025-010",
      wrscSignature: "WRSC-SIG-8w9x0y1z",
      warehouseCode: "NBI-WH-01",
      commodityType: "MAIZE" as const,
      grade: "Grade 1",
      weightMt: "320.000",
      moisturePct: "12.10",
      harvestSeason: "2025-LR",
      isLienActive: false,
      state: "INGESTED" as const,
      ownerId: producer2.id,
      estimatedValueUsd: "64000.00",
    },
    {
      ewrsReceiptId: "EWR-ELD-2025-011",
      wrscSignature: "WRSC-SIG-2a3b4c5d",
      warehouseCode: "ELD-WH-06",
      commodityType: "MAIZE" as const,
      grade: "Grade 1",
      weightMt: "500.000",
      moisturePct: "12.80",
      harvestSeason: "2024-SR",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer2.id,
      estimatedValueUsd: "95000.00",
    },
    {
      ewrsReceiptId: "EWR-ELD-2025-015",
      wrscSignature: "WRSC-SIG-8q9r0s1t",
      warehouseCode: "ELD-WH-06",
      commodityType: "MAIZE" as const,
      grade: "Grade 2",
      weightMt: "400.000",
      moisturePct: "13.50",
      harvestSeason: "2024-SR",
      isLienActive: false,
      state: "SETTLED" as const,
      ownerId: offtaker.id,
      estimatedValueUsd: "68000.00",
    },
    {
      ewrsReceiptId: "EWR-KSM-2025-016",
      wrscSignature: "WRSC-SIG-A1B2C3D4",
      warehouseCode: "KSM-WH-03",
      commodityType: "MAIZE" as const,
      grade: "Grade 1",
      weightMt: "350.000",
      moisturePct: "12.30",
      harvestSeason: "2025-LR",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "66500.00",
    },
    // --- Rice (4 receipts) ---
    {
      ewrsReceiptId: "EWR-MOM-2025-003",
      wrscSignature: "WRSC-SIG-1a2b3c4d",
      warehouseCode: "MOM-WH-02",
      commodityType: "RICE" as const,
      grade: "Premium",
      weightMt: "100.000",
      moisturePct: "11.00",
      harvestSeason: "2025-IR1",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "60000.00",
    },
    {
      ewrsReceiptId: "EWR-MOM-2025-012",
      wrscSignature: "WRSC-SIG-6e7f8g9h",
      warehouseCode: "MOM-WH-02",
      commodityType: "RICE" as const,
      grade: "Standard",
      weightMt: "200.000",
      moisturePct: "12.50",
      harvestSeason: "2025-IR1",
      isLienActive: false,
      state: "INGESTED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "100000.00",
    },
    {
      ewrsReceiptId: "EWR-MOM-2025-017",
      wrscSignature: "WRSC-SIG-E5F6G7H8",
      warehouseCode: "MOM-WH-02",
      commodityType: "RICE" as const,
      grade: "Premium",
      weightMt: "75.000",
      moisturePct: "11.20",
      harvestSeason: "2024-IR2",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer2.id,
      estimatedValueUsd: "45000.00",
    },
    {
      ewrsReceiptId: "EWR-NBI-2025-018",
      wrscSignature: "WRSC-SIG-I9J0K1L2",
      warehouseCode: "NBI-WH-01",
      commodityType: "RICE" as const,
      grade: "Standard",
      weightMt: "150.000",
      moisturePct: "12.00",
      harvestSeason: "2025-IR1",
      isLienActive: false,
      state: "INGESTED" as const,
      ownerId: producer2.id,
      estimatedValueUsd: "75000.00",
    },
    // --- Coffee (4 receipts) ---
    {
      ewrsReceiptId: "EWR-KSM-2025-004",
      wrscSignature: "WRSC-SIG-9e0f1a2b",
      warehouseCode: "KSM-WH-03",
      commodityType: "COFFEE" as const,
      grade: "AA",
      weightMt: "50.000",
      moisturePct: "11.50",
      harvestSeason: "2025-Main",
      isLienActive: false,
      state: "INGESTED" as const,
      ownerId: producer2.id,
      estimatedValueUsd: "200000.00",
    },
    {
      ewrsReceiptId: "EWR-KSM-2025-005",
      wrscSignature: "WRSC-SIG-5c6d7e8f",
      warehouseCode: "KSM-WH-03",
      commodityType: "COFFEE" as const,
      grade: "AB",
      weightMt: "35.000",
      moisturePct: "11.80",
      harvestSeason: "2025-Main",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer2.id,
      estimatedValueUsd: "126000.00",
    },
    {
      ewrsReceiptId: "EWR-KSM-2025-013",
      wrscSignature: "WRSC-SIG-0i1j2k3l",
      warehouseCode: "KSM-WH-03",
      commodityType: "COFFEE" as const,
      grade: "C",
      weightMt: "25.000",
      moisturePct: "12.00",
      harvestSeason: "2025-Main",
      isLienActive: true,
      lienHolderId: financier.id,
      state: "ENCUMBERED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "75000.00",
    },
    {
      ewrsReceiptId: "EWR-ELD-2025-019",
      wrscSignature: "WRSC-SIG-M3N4O5P6",
      warehouseCode: "ELD-WH-06",
      commodityType: "COFFEE" as const,
      grade: "AA",
      weightMt: "40.000",
      moisturePct: "11.40",
      harvestSeason: "2025-Main",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "168000.00",
    },
    // --- Tea (4 receipts) ---
    {
      ewrsReceiptId: "EWR-NKR-2025-006",
      wrscSignature: "WRSC-SIG-2g3h4i5j",
      warehouseCode: "NKR-WH-04",
      commodityType: "TEA" as const,
      grade: "BOPI",
      weightMt: "75.000",
      moisturePct: null,
      harvestSeason: "2025-Q1",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "112500.00",
    },
    {
      ewrsReceiptId: "EWR-NKR-2025-007",
      wrscSignature: "WRSC-SIG-6k7l8m9n",
      warehouseCode: "NKR-WH-04",
      commodityType: "TEA" as const,
      grade: "PF1",
      weightMt: "40.000",
      moisturePct: null,
      harvestSeason: "2025-Q1",
      isLienActive: false,
      state: "INGESTED" as const,
      ownerId: producer2.id,
      estimatedValueUsd: "56000.00",
    },
    {
      ewrsReceiptId: "EWR-NKR-2025-014",
      wrscSignature: "WRSC-SIG-4m5n6o7p",
      warehouseCode: "NKR-WH-04",
      commodityType: "TEA" as const,
      grade: "BOPI",
      weightMt: "60.000",
      moisturePct: null,
      harvestSeason: "2025-Q2",
      isLienActive: false,
      state: "INGESTED" as const,
      ownerId: producer2.id,
      estimatedValueUsd: "90000.00",
    },
    {
      ewrsReceiptId: "EWR-NKR-2025-020",
      wrscSignature: "WRSC-SIG-Q7R8S9T0",
      warehouseCode: "NKR-WH-04",
      commodityType: "TEA" as const,
      grade: "PF1",
      weightMt: "55.000",
      moisturePct: null,
      harvestSeason: "2025-Q2",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer1.id,
      estimatedValueUsd: "79750.00",
    },
    // --- Avocado (2 receipts) ---
    {
      ewrsReceiptId: "EWR-NAI-2025-008",
      wrscSignature: "WRSC-SIG-0o1p2q3r",
      warehouseCode: "NAI-WH-05",
      commodityType: "AVOCADO" as const,
      grade: "Export A",
      weightMt: "20.000",
      moisturePct: null,
      harvestSeason: "2025-Harvest",
      isLienActive: false,
      state: "MARKET_LISTED" as const,
      ownerId: producer1.id,
      expiryAt: avocadoExpiry,
      estimatedValueUsd: "28000.00",
    },
    {
      ewrsReceiptId: "EWR-NAI-2025-009",
      wrscSignature: "WRSC-SIG-4s5t6u7v",
      warehouseCode: "NAI-WH-05",
      commodityType: "AVOCADO" as const,
      grade: "Export B",
      weightMt: "15.000",
      moisturePct: null,
      harvestSeason: "2025-Harvest",
      isLienActive: false,
      state: "INGESTED" as const,
      ownerId: producer2.id,
      expiryAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      estimatedValueUsd: "18750.00",
    },
  ];

  const insertedEwrs = await db.insert(ewrsTable).values(ewrValues).returning();
  console.log(`Seeded ${insertedEwrs.length} eWRs`);

  const marketListedEwrs = insertedEwrs.filter(e => e.state === "MARKET_LISTED");

  const priceMap: Record<string, string> = {
    MAIZE: "190.00",
    RICE: "580.00",
    COFFEE: "3500.00",
    TEA: "1450.00",
    AVOCADO: "1300.00",
  };

  const listingValues = marketListedEwrs.map((ewr) => ({
    ewrId: ewr.id,
    sellerId: ewr.ownerId,
    pricePerMt: priceMap[ewr.commodityType],
    currency: "USD",
    status: "ACTIVE" as const,
  }));

  const insertedListings = await db.insert(spotListingsTable).values(listingValues).returning();
  console.log(`Seeded ${insertedListings.length} spot listings`);

  // ── Auctions ──────────────────────────────────────────────────────────────
  // Pick 3 INGESTED eWRs to auction (indices vary by producer)
  const ingestedEwrs = insertedEwrs.filter(e => e.state === "INGESTED");
  const auctionEwrs = ingestedEwrs.slice(0, 3);

  if (auctionEwrs.length >= 3) {
    const [aEwr1, aEwr2, aEwr3] = auctionEwrs;

    const [auction1, auction2, auction3] = await db.insert(auctionsTable).values([
      {
        // Auction 1 – closes in 2 hours, already has bids
        ewrId: aEwr1.id,
        sellerId: aEwr1.ownerId,
        reservePriceUsd: "45000.00",
        bidIncrementPct: "1.5",
        startAt: new Date(now.getTime() - 30 * 60 * 1000),
        endAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        status: "OPEN" as const,
      },
      {
        // Auction 2 – closes in ~4 minutes → anti-snipe demo
        ewrId: aEwr2.id,
        sellerId: aEwr2.ownerId,
        reservePriceUsd: "120000.00",
        bidIncrementPct: "2.0",
        startAt: new Date(now.getTime() - 56 * 60 * 1000),
        endAt: new Date(now.getTime() + 4 * 60 * 1000),
        status: "OPEN" as const,
      },
      {
        // Auction 3 – already settled
        ewrId: aEwr3.id,
        sellerId: aEwr3.ownerId,
        reservePriceUsd: "55000.00",
        bidIncrementPct: "1.5",
        startAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: "SETTLED" as const,
      },
    ]).returning();

    await db.update(ewrsTable)
      .set({ state: "MARKET_LISTED" })
      .where(inArray(ewrsTable.id, [aEwr1.id, aEwr2.id]));

    // Seed bids for auction 1
    const [, bid2] = await db.insert(auctionBidsTable).values([
      {
        auctionId: auction1.id,
        bidderId: offtaker.id,
        amountUsd: "46500.00",
        isWinning: false,
      },
      {
        auctionId: auction1.id,
        bidderId: offtaker.id,
        amountUsd: "47225.00",
        isWinning: true,
      },
    ]).returning();

    await db.update(auctionsTable)
      .set({ winningBidId: bid2.id })
      .where(eq(auctionsTable.id, auction1.id));

    // Seed bids for auction 2 (near expiry)
    const [bid3] = await db.insert(auctionBidsTable).values([
      {
        auctionId: auction2.id,
        bidderId: offtaker.id,
        amountUsd: "124000.00",
        isWinning: true,
      },
    ]).returning();

    await db.update(auctionsTable)
      .set({ winningBidId: bid3.id })
      .where(eq(auctionsTable.id, auction2.id));

    // Seed bids for settled auction 3
    const [, , bidS3] = await db.insert(auctionBidsTable).values([
      { auctionId: auction3.id, bidderId: offtaker.id, amountUsd: "56000.00", isWinning: false },
      { auctionId: auction3.id, bidderId: offtaker.id, amountUsd: "56840.00", isWinning: false },
      { auctionId: auction3.id, bidderId: offtaker.id, amountUsd: "57692.60", isWinning: true },
    ]).returning();

    await db.update(auctionsTable)
      .set({ winningBidId: bidS3.id })
      .where(eq(auctionsTable.id, auction3.id));

    console.log("Auctions seeded: 3 (1 long, 1 near-expiry anti-snipe, 1 settled)");
  }

  // ── Forward Contracts ─────────────────────────────────────────────────────
  const marketEwrs = insertedEwrs.filter(e => e.state === "MARKET_LISTED");
  const fwdEwrs = marketEwrs.slice(0, 2);

  if (fwdEwrs.length >= 2) {
    const [fEwr1, fEwr2] = fwdEwrs;
    const deliveryPrice1 = 52000;
    const deliveryPrice2 = 95000;

    const [fc1, fc2] = await db.insert(forwardContractsTable).values([
      {
        // Contract 1 – PENDING_SIGNATURE (off-taker can co-sign)
        ewrId: fEwr1.id,
        sellerId: fEwr1.ownerId,
        maturityDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        deliveryPriceUsd: String(deliveryPrice1),
        performanceBondUsd: String(deliveryPrice1 * 0.15),
        contractStatus: "PENDING_SIGNATURE" as const,
      },
      {
        // Contract 2 – ACTIVE (already co-signed, bonds live)
        ewrId: fEwr2.id,
        sellerId: fEwr2.ownerId,
        buyerId: offtaker.id,
        maturityDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
        deliveryPriceUsd: String(deliveryPrice2),
        performanceBondUsd: String(deliveryPrice2 * 0.15),
        contractStatus: "ACTIVE" as const,
        sellerBondStatus: "ACTIVE" as const,
        buyerBondStatus: "ACTIVE" as const,
        signedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    ]).returning();

    await db.insert(contractEventsTable).values([
      {
        contractId: fc1.id,
        eventType: "CREATED",
        actorId: fEwr1.ownerId,
        note: `Forward contract created. Delivery: $${deliveryPrice1}, Bond: $${(deliveryPrice1 * 0.15).toFixed(2)}`,
      },
      {
        contractId: fc2.id,
        eventType: "CREATED",
        actorId: fEwr2.ownerId,
        note: `Forward contract created. Delivery: $${deliveryPrice2}, Bond: $${(deliveryPrice2 * 0.15).toFixed(2)}`,
      },
      {
        contractId: fc2.id,
        eventType: "CO_SIGNED",
        actorId: offtaker.id,
        note: `Contract co-signed by buyer (East Africa Millers Ltd). Both bonds activated.`,
      },
    ]);

    console.log("Forward contracts seeded: 2 (1 pending, 1 active)");
  }

  // ── Financing Requests, Loans & Settlements ───────────────────────────────
  const encumberedEwr = insertedEwrs.find(e => e.ewrsReceiptId === "EWR-KSM-2025-013");

  if (encumberedEwr) {
    // Financing request #1 — APPROVED + DISBURSED (already a loan on this ENCUMBERED eWR)
    const marketValue1 = parseFloat(encumberedEwr.estimatedValueUsd!);
    const lMax1 = marketValue1 * 0.60;

    const [fr1] = await db.insert(financingRequestsTable).values({
      ewrId: encumberedEwr.id,
      requesterId: producer1.id,
      marketValueUsd: String(marketValue1),
      lMaxUsd: String(lMax1),
      interestRate: "0.1200",
      status: "DISBURSED",
      lenderId: financier.id,
      approvedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      disbursedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      notes: "Disbursed for 25 MT Coffee Grade C (KSM-WH-03)",
    }).returning();

    const loan1StartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const [loan1] = await db.insert(loansTable).values({
      financingRequestId: fr1.id,
      principalUsd: String(lMax1),
      interestRate: "0.1200",
      startDate: loan1StartDate,
      outstandingBalanceUsd: String(lMax1),
      lienStatus: "ACTIVE",
    }).returning();

    await db.insert(auditLogTable).values([
      {
        entityType: "FINANCING_REQUEST",
        entityId: fr1.id,
        action: "FINANCING_REQUESTED",
        actorId: producer1.id,
        payloadHash: sha256({ requestId: fr1.id, ewrId: encumberedEwr.id, marketValueUsd: marketValue1, lMaxUsd: lMax1 }),
        metadata: JSON.stringify({ ewrId: encumberedEwr.id, marketValueUsd: marketValue1, lMaxUsd: lMax1, interestRate: 0.12 }),
      },
      {
        entityType: "FINANCING_REQUEST",
        entityId: fr1.id,
        action: "FINANCING_APPROVED",
        actorId: financier.id,
        payloadHash: sha256({ requestId: fr1.id, lenderId: financier.id, ewrId: encumberedEwr.id, lMaxUsd: lMax1 }),
        metadata: JSON.stringify({ lenderId: financier.id, principal: lMax1, interestRate: 0.12 }),
      },
    ]);

    // Financing request #2 — PENDING (Rice eWR, producer2 requesting)
    const riceEwr = insertedEwrs.find(e => e.ewrsReceiptId === "EWR-MOM-2025-012");
    if (riceEwr) {
      const marketValue2 = parseFloat(riceEwr.estimatedValueUsd!);
      const lMax2 = marketValue2 * 0.60;

      const [fr2] = await db.insert(financingRequestsTable).values({
        ewrId: riceEwr.id,
        requesterId: producer1.id,
        marketValueUsd: String(marketValue2),
        lMaxUsd: String(lMax2),
        interestRate: "0.1200",
        status: "PENDING",
        notes: "Need advance for input purchasing (fertilizer Q3)",
      }).returning();

      await db.insert(auditLogTable).values({
        entityType: "FINANCING_REQUEST",
        entityId: fr2.id,
        action: "FINANCING_REQUESTED",
        actorId: producer1.id,
        payloadHash: sha256({ requestId: fr2.id, ewrId: riceEwr.id, marketValueUsd: marketValue2, lMaxUsd: lMax2 }),
        metadata: JSON.stringify({ ewrId: riceEwr.id, marketValueUsd: marketValue2, lMaxUsd: lMax2, interestRate: 0.12 }),
      });
    }

    // Settlement #1 — fully completed (ORDER settlement, no loan)
    const [settlement1] = await db.insert(settlementsTable).values({
      entityType: "ORDER",
      entityId: 1,
      initiatedById: enabler.id,
      vTotalUsd: "68000.00",
      rBankUsd: "0.00",
      fPlatformUsd: "1360.00",
      pProducerUsd: "66640.00",
      loanId: null,
      bankLegStatus: "N_A",
      platformLegStatus: "DISBURSED",
      producerLegStatus: "DISBURSED",
      platformLegDisbursedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      producerLegDisbursedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      notes: "Spot order settlement – EWR-ELD-2025-015",
    }).returning();

    const settle1Payload = { settlementId: settlement1.id, entityType: "ORDER", entityId: 1, vTotalUsd: 68000, rBankUsd: 0, fPlatformUsd: 1360, pProducerUsd: 66640 };
    await db.insert(auditLogTable).values([
      {
        entityType: "SETTLEMENT",
        entityId: settlement1.id,
        action: "SETTLEMENT_INITIATED",
        actorId: enabler.id,
        payloadHash: sha256(settle1Payload),
        metadata: JSON.stringify(settle1Payload),
      },
      {
        entityType: "SETTLEMENT",
        entityId: settlement1.id,
        action: "SETTLEMENT_LEG_DISBURSED_PLATFORM",
        actorId: enabler.id,
        payloadHash: sha256({ settlementId: settlement1.id, leg: "platform", disbursedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }),
        metadata: JSON.stringify({ leg: "platform", allComplete: false }),
      },
      {
        entityType: "SETTLEMENT",
        entityId: settlement1.id,
        action: "SETTLEMENT_LEG_DISBURSED_PRODUCER",
        actorId: enabler.id,
        payloadHash: sha256({ settlementId: settlement1.id, leg: "producer", disbursedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }),
        metadata: JSON.stringify({ leg: "producer", allComplete: true }),
      },
    ]);

    // Settlement #2 — partially disbursed (has active loan, bank leg still pending)
    const daysElapsed2 = 14;
    const principal2 = lMax1;
    const interest2 = principal2 * 0.12 * daysElapsed2 / 365;
    const rBank2 = principal2 + interest2;
    const vTotal2 = 80000;
    const fPlatform2 = vTotal2 * 0.02;
    const pProducer2 = Math.max(0, vTotal2 - rBank2 - fPlatform2);

    const [settlement2] = await db.insert(settlementsTable).values({
      entityType: "AUCTION",
      entityId: 1,
      initiatedById: enabler.id,
      vTotalUsd: String(vTotal2),
      rBankUsd: rBank2.toFixed(2),
      fPlatformUsd: fPlatform2.toFixed(2),
      pProducerUsd: pProducer2.toFixed(2),
      loanId: loan1.id,
      bankLegStatus: "PENDING",
      platformLegStatus: "PENDING",
      producerLegStatus: "PENDING",
      notes: "Auction settlement with loan repayment – Coffee Grade C",
    }).returning();

    const settle2Payload = { settlementId: settlement2.id, entityType: "AUCTION", entityId: 1, vTotalUsd: vTotal2, rBankUsd: rBank2, fPlatformUsd: fPlatform2, pProducerUsd: pProducer2 };
    await db.insert(auditLogTable).values({
      entityType: "SETTLEMENT",
      entityId: settlement2.id,
      action: "SETTLEMENT_INITIATED",
      actorId: enabler.id,
      payloadHash: sha256(settle2Payload),
      metadata: JSON.stringify(settle2Payload),
    });

    console.log("Financing, loans, and settlements seeded.");
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
