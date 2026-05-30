import { Router } from "express";
import { db } from "@workspace/db";
import { siteContentTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Public — no auth needed
router.get("/content/:key", async (req, res): Promise<void> => {
  const [row] = await db.select().from(siteContentTable).where(eq(siteContentTable.key, req.params.key)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ key: row.key, value: row.value, updatedAt: row.updatedAt });
});

// Admin write — behind requireAuth in router/index.ts
router.put("/content/:key", async (req, res): Promise<void> => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined) { res.status(400).json({ error: "value is required" }); return; }

  const [row] = await db
    .insert(siteContentTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteContentTable.key, set: { value, updatedAt: new Date() } })
    .returning();

  res.json({ key: row.key, value: row.value, updatedAt: row.updatedAt });
});

export default router;
