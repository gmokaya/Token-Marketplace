import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  usersTable,
  producerProfilesTable,
  buyerProfilesTable,
  warehouseProfilesTable,
  financierProfilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

/* ── GET /profiles/me — unified profile with user + tier profile ───────────── */
router.get("/profiles/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  let tierProfile = null;
  switch (user.tier) {
    case "PRODUCER": {
      const [profile] = await db
        .select()
        .from(producerProfilesTable)
        .where(eq(producerProfilesTable.userId, user.id))
        .limit(1);
      tierProfile = profile ?? null;
      break;
    }
    case "OFF_TAKER": {
      const [profile] = await db
        .select()
        .from(buyerProfilesTable)
        .where(eq(buyerProfilesTable.userId, user.id))
        .limit(1);
      tierProfile = profile ?? null;
      break;
    }
    case "ENABLER": {
      const [profile] = await db
        .select()
        .from(warehouseProfilesTable)
        .where(eq(warehouseProfilesTable.userId, user.id))
        .limit(1);
      tierProfile = profile ?? null;
      break;
    }
    case "FINANCIER": {
      const [profile] = await db
        .select()
        .from(financierProfilesTable)
        .where(eq(financierProfilesTable.userId, user.id))
        .limit(1);
      tierProfile = profile ?? null;
      break;
    }
  }

  return res.json({ user, tierProfile });
});

/* ── POST /profiles/me — create or update tier profile ────────────────────── */
router.post("/profiles/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { user: userUpdate, profile: profileData } = req.body as {
    user?: { name?: string; company?: string; phone?: string; nationalId?: string };
    profile?: Record<string, unknown>;
  };

  // Update user fields if provided
  if (userUpdate) {
    const userPatch: Partial<typeof usersTable.$inferInsert> = {};
    if (userUpdate.name !== undefined) userPatch.name = userUpdate.name;
    if (userUpdate.company !== undefined) userPatch.company = userUpdate.company;
    if (userUpdate.phone !== undefined) userPatch.phone = userUpdate.phone;
    if (userUpdate.nationalId !== undefined) userPatch.nationalId = userUpdate.nationalId;
    if (Object.keys(userPatch).length > 0) {
      await db.update(usersTable).set(userPatch).where(eq(usersTable.id, user.id));
    }
  }

  if (!profileData) {
    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    return res.json({ user: updatedUser, tierProfile: null });
  }

  let tierProfile = null;
  const now = new Date();

  switch (user.tier) {
    case "PRODUCER": {
      const existing = await db
        .select()
        .from(producerProfilesTable)
        .where(eq(producerProfilesTable.userId, user.id))
        .limit(1);
      const data = {
        userId: user.id,
        entityName: profileData.entityName as string,
        registrationNumber: profileData.registrationNumber as string,
        kraPin: (profileData.kraPin as string) ?? null,
        officeAddress: (profileData.officeAddress as string) ?? null,
        gpsLatitude: (profileData.gpsLatitude as string) ?? null,
        gpsLongitude: (profileData.gpsLongitude as string) ?? null,
        adminFirstName: (profileData.adminFirstName as string) ?? null,
        adminLastName: (profileData.adminLastName as string) ?? null,
        adminNationalId: (profileData.adminNationalId as string) ?? null,
        adminPhone: (profileData.adminPhone as string) ?? null,
        adminEmail: (profileData.adminEmail as string) ?? null,
        factoryMarks: (profileData.factoryMarks as string) ?? null,
        bankName: (profileData.bankName as string) ?? null,
        bankBranch: (profileData.bankBranch as string) ?? null,
        bankSwiftCode: (profileData.bankSwiftCode as string) ?? null,
        bankAccountNumber: (profileData.bankAccountNumber as string) ?? null,
        mobileMoneyPaybill: (profileData.mobileMoneyPaybill as string) ?? null,
        updatedAt: now,
      };
      if (existing.length > 0) {
        [tierProfile] = await db.update(producerProfilesTable)
          .set(data)
          .where(eq(producerProfilesTable.userId, user.id))
          .returning();
      } else {
        [tierProfile] = await db.insert(producerProfilesTable).values({ ...data, createdAt: now }).returning();
      }
      break;
    }
    case "OFF_TAKER": {
      const existing = await db
        .select()
        .from(buyerProfilesTable)
        .where(eq(buyerProfilesTable.userId, user.id))
        .limit(1);
      const data = {
        userId: user.id,
        companyLegalName: profileData.companyLegalName as string,
        registrationNumber: profileData.registrationNumber as string,
        kraPin: (profileData.kraPin as string) ?? null,
        officeAddress: (profileData.officeAddress as string) ?? null,
        grainLicenseUrl: (profileData.grainLicenseUrl as string) ?? null,
        coffeeLicenseUrl: (profileData.coffeeLicenseUrl as string) ?? null,
        teaLicenseUrl: (profileData.teaLicenseUrl as string) ?? null,
        bankName: (profileData.bankName as string) ?? null,
        bankBranch: (profileData.bankBranch as string) ?? null,
        bankAccountNumber: (profileData.bankAccountNumber as string) ?? null,
        bankSwiftCode: (profileData.bankSwiftCode as string) ?? null,
        buyerPersonnelName: (profileData.buyerPersonnelName as string) ?? null,
        buyerPersonnelNationalId: (profileData.buyerPersonnelNationalId as string) ?? null,
        buyerPersonnelPhone: (profileData.buyerPersonnelPhone as string) ?? null,
        buyerPersonnelEmail: (profileData.buyerPersonnelEmail as string) ?? null,
        purchasingLimitUsd: (profileData.purchasingLimitUsd as string) ?? null,
        updatedAt: now,
      };
      if (existing.length > 0) {
        [tierProfile] = await db.update(buyerProfilesTable)
          .set(data)
          .where(eq(buyerProfilesTable.userId, user.id))
          .returning();
      } else {
        [tierProfile] = await db.insert(buyerProfilesTable).values({ ...data, createdAt: now }).returning();
      }
      break;
    }
    case "ENABLER": {
      const existing = await db
        .select()
        .from(warehouseProfilesTable)
        .where(eq(warehouseProfilesTable.userId, user.id))
        .limit(1);
      const data = {
        userId: user.id,
        operatorName: profileData.operatorName as string,
        wrscLicenseNumber: profileData.wrscLicenseNumber as string,
        wrscApiKey: (profileData.wrscApiKey as string) ?? null,
        facilityType: (profileData.facilityType as typeof warehouseProfilesTable.$inferInsert["facilityType"]) ?? null,
        capacityMt: (profileData.capacityMt as string) ?? null,
        handlesMaize: (profileData.handlesMaize as string) ?? null,
        handlesRice: (profileData.handlesRice as string) ?? null,
        handlesCoffee: (profileData.handlesCoffee as string) ?? null,
        handlesTea: (profileData.handlesTea as string) ?? null,
        handlesAvocado: (profileData.handlesAvocado as string) ?? null,
        insurerName: (profileData.insurerName as string) ?? null,
        insurancePolicyNumber: (profileData.insurancePolicyNumber as string) ?? null,
        insuranceUnderwrittenValue: (profileData.insuranceUnderwrittenValue as string) ?? null,
        insuranceExpiryDate: (profileData.insuranceExpiryDate as string) ?? null,
        warehouseInChargeName: (profileData.warehouseInChargeName as string) ?? null,
        warehouseInChargePhone: (profileData.warehouseInChargePhone as string) ?? null,
        warehouseInChargeEmail: (profileData.warehouseInChargeEmail as string) ?? null,
        updatedAt: now,
      };
      if (existing.length > 0) {
        [tierProfile] = await db.update(warehouseProfilesTable)
          .set(data)
          .where(eq(warehouseProfilesTable.userId, user.id))
          .returning();
      } else {
        [tierProfile] = await db.insert(warehouseProfilesTable).values({ ...data, createdAt: now }).returning();
      }
      break;
    }
    case "FINANCIER": {
      const existing = await db
        .select()
        .from(financierProfilesTable)
        .where(eq(financierProfilesTable.userId, user.id))
        .limit(1);
      const data = {
        userId: user.id,
        institutionName: profileData.institutionName as string,
        centralBankLicenseCode: profileData.centralBankLicenseCode as string,
        departmentDesignation: (profileData.departmentDesignation as string) ?? null,
        creditApproverName: (profileData.creditApproverName as string) ?? null,
        creditApproverDesignation: (profileData.creditApproverDesignation as string) ?? null,
        creditApproverEmail: (profileData.creditApproverEmail as string) ?? null,
        maxLiquidityPoolUsd: (profileData.maxLiquidityPoolUsd as string) ?? null,
        updatedAt: now,
      };
      if (existing.length > 0) {
        [tierProfile] = await db.update(financierProfilesTable)
          .set(data)
          .where(eq(financierProfilesTable.userId, user.id))
          .returning();
      } else {
        [tierProfile] = await db.insert(financierProfilesTable).values({ ...data, createdAt: now }).returning();
      }
      break;
    }
  }

  // Update onboarding status to WRSC_VERIFIED when profile is submitted
  await db.update(usersTable)
    .set({ onboardingStatus: "WRSC_VERIFIED" })
    .where(eq(usersTable.id, user.id));

  const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  return res.json({ user: updatedUser, tierProfile });
});

export default router;
