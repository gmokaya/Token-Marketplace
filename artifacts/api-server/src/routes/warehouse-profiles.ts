/**
 * Warehouse Profile routes
 *
 * GET /warehouse-profiles/:warehouseCode  — look up a registered warehouse profile by WRSC code
 */

import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { warehouseProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/warehouse-profiles/:warehouseCode", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const warehouseCode = req.params.warehouseCode;
  if (!warehouseCode || warehouseCode.trim().length === 0) {
    return res.status(400).json({ error: "Warehouse code is required" });
  }

  const [profile] = await db
    .select({
      operatorName: warehouseProfilesTable.operatorName,
      wrscLicenseNumber: warehouseProfilesTable.wrscLicenseNumber,
      facilityType: warehouseProfilesTable.facilityType,
      capacityMt: warehouseProfilesTable.capacityMt,
      warehouseInChargeName: warehouseProfilesTable.warehouseInChargeName,
      warehouseInChargePhone: warehouseProfilesTable.warehouseInChargePhone,
      warehouseInChargeEmail: warehouseProfilesTable.warehouseInChargeEmail,
      handlesTea: warehouseProfilesTable.handlesTea,
      insurerName: warehouseProfilesTable.insurerName,
    })
    .from(warehouseProfilesTable)
    .where(eq(warehouseProfilesTable.wrscLicenseNumber, warehouseCode))
    .limit(1);

  if (!profile) {
    return res.status(404).json({ error: "Warehouse profile not found" });
  }

  return res.json(profile);
});

export default router;
