import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, marketplaceOnboardingProfilesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const roleSchema = z.enum(["producer", "trader", "buyer"]);
const allowedInterests = new Set([
  "access_to_markets", "better_prices", "reduce_post_harvest_losses", "quality_storage",
  "access_to_finance", "faster_payments", "find_buyers", "free_up_capital",
  "faster_payment", "access_to_financing", "simplify_logistics", "fair_trade",
  "traceable_sourcing", "impact", "direct_trade", "producer_welfare", "trade_financing",
  "secure_payments", "reliable_logistics", "insurance", "access_to_producers",
  "verified_quality", "consistent_supply", "gi_certification", "quality_assurance",
]);

const optionalText = z.string().trim().max(500).optional().nullable();
const entityTypes = new Set([
  "individual",
  "sole_proprietorship",
  "partnership",
  "limited_company",
  "cooperative",
  "ngo_nonprofit",
  "other",
]);
const coffeeOriginCatalog: Record<string, { regions: readonly string[]; varieties: readonly string[] }> = {
  Kenya: {
    regions: ["Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Embu", "Meru", "Machakos", "Nakuru", "Kericho", "Nandi", "Bungoma", "Kisii"],
    varieties: ["SL28", "SL34", "Batian", "Ruiru 11", "K7", "French Mission Bourbon", "Blue Mountain", "Other"],
  },
  Ethiopia: {
    regions: ["Yirgacheffe", "Sidama", "Guji", "Limu", "Jimma", "Harrar", "Kaffa", "Bench Maji", "Nekemte / Wellega"],
    varieties: ["Ethiopian Heirloom", "Landrace", "74110", "74112", "74158", "Other"],
  },
  Colombia: {
    regions: ["Huila", "Nariño", "Antioquia", "Tolima", "Cauca", "Caldas", "Risaralda", "Quindío", "Santander", "Sierra Nevada"],
    varieties: ["Castillo", "Caturra", "Colombia", "Bourbon", "Pink Bourbon", "Typica", "Geisha", "Pacamara", "Tabi", "Other"],
  },
  Brazil: {
    regions: ["Minas Gerais", "Sul de Minas", "Cerrado Mineiro", "Mogiana", "Chapada Diamantina", "Espírito Santo"],
    varieties: ["Bourbon", "Yellow Bourbon", "Mundo Novo", "Catuai", "Caturra", "Typica", "Geisha", "Other"],
  },
  Guatemala: {
    regions: ["Antigua", "Huehuetenango", "Atitlán", "Cobán", "Acatenango", "Fraijanes", "Nuevo Oriente", "San Marcos"],
    varieties: ["Bourbon", "Caturra", "Catuai", "Typica", "Pacamara", "Geisha", "Other"],
  },
  "Costa Rica": {
    regions: ["Tarrazú", "West Valley", "Central Valley", "Brunca", "Turrialba", "Orosi"],
    varieties: ["Caturra", "Catuai", "Bourbon", "Villa Sarchi", "Geisha", "SL28", "Other"],
  },
  Panama: {
    regions: ["Boquete", "Volcán", "Renacimiento", "Chiriquí"],
    varieties: ["Geisha / Gesha", "Caturra", "Catuai", "Typica", "Pacamara", "Other"],
  },
  Rwanda: {
    regions: ["Western Province", "Southern Province", "Northern Province", "Eastern Province"],
    varieties: ["Red Bourbon", "Bourbon", "Jackson", "Mibirizi", "Other"],
  },
  Burundi: {
    regions: ["Kayanza", "Ngozi", "Muyinga", "Kirundo", "Gitega", "Karusi"],
    varieties: ["Red Bourbon", "Bourbon", "Jackson", "Mibirizi", "Other"],
  },
  Uganda: {
    regions: ["Mount Elgon", "Bugisu", "Rwenzori", "West Nile", "Central Region", "Central"],
    varieties: ["SL14", "SL28", "Nyasaland", "Kent", "Robusta", "Other"],
  },
  Tanzania: {
    regions: ["Kilimanjaro", "Arusha", "Mbeya", "Mbinga", "Ruvuma", "Kigoma", "Kagera"],
    varieties: ["Kent", "Bourbon", "Typica", "N39", "Robusta", "Other"],
  },
};
const coffeeProcessingTypes = new Set([
  "Washed / Fully Washed",
  "Natural / Dry Process",
  "Honey",
  "Pulped Natural",
  "Semi-Washed",
  "Wet-Hulled",
  "Anaerobic",
  "Carbonic Maceration",
  "Lactic Fermentation",
  "Yeast Fermentation",
  "Extended Fermentation",
  "Co-Fermentation",
  "Double Fermentation",
  "Experimental",
  "Other",
]);
const commoditySubtypes: Record<string, readonly string[]> = {
  Coffee: ["Arabica AA", "Arabica AB", "Arabica PB", "Robusta"],
  Tea: ["Orthodox", "CTC", "Green Tea", "Purple Tea", "White Tea"],
  Grain: ["Maize", "Wheat", "Rice", "Sorghum", "Green Grams", "Beans"],
};
const commoditySelectionSchema = z.object({
  commodity: z.string().trim().min(1).max(80),
  subType: z.string().trim().min(1).max(80).nullable(),
}).superRefine((selection, ctx) => {
  const allowed = commoditySubtypes[selection.commodity];
  if (allowed && !selection.subType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subType"], message: `Select a ${selection.commodity} sub-type` });
  } else if (allowed && selection.subType && !allowed.includes(selection.subType)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subType"], message: "Invalid commodity sub-type" });
  } else if (!allowed && selection.subType !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subType"], message: "Sub-type is not supported for this commodity" });
  }
});
const onboardingSchema = z.object({
  market: z.enum(["grain", "coffee", "tea"]).optional(),
  marketplaceRole: roleSchema,
  fullName: z.string().trim().min(2).max(120),
  country: optionalText,
  region: optionalText,
  city: optionalText,
  coffeeOriginCountry: optionalText,
  coffeeOriginRegion: optionalText,
  coffeeVariety: optionalText,
  coffeeProcessingType: optionalText,
  commodities: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  commoditySelections: z.array(commoditySelectionSchema).max(20).default([]),
  payoutMobileMoney: optionalText,
  businessName: optionalText,
  businessRegistrationNumber: optionalText,
  entityType: optionalText,
  bankDetails: optionalText,
  sourcingCommodity: optionalText,
  expectedVolume: optionalText,
  destinationCountry: optionalText,
  interests: z.array(z.string()).max(20).default([]).refine(
    (values) => values.every((value) => allowedInterests.has(value)),
    "One or more interests are invalid",
  ),
  producerStory: z.string().trim().max(1000).optional().nullable(),
}).superRefine((data, ctx) => {
  const required = (key: keyof typeof data, message: string) => {
    const value = data[key];
    if (typeof value !== "string" || value.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
    }
  };

  required("payoutMobileMoney", "Mobile number is required");

  if (data.marketplaceRole === "producer") {
    required("country", "Country is required");
    required("region", "Region is required");
    required("city", "City is required");
    required("businessName", "Entity name is required");
    required("businessRegistrationNumber", "Entity registration number is required");
    required("entityType", "Entity type is required");
    if (data.entityType && !entityTypes.has(data.entityType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["entityType"], message: "Select a valid entity type" });
    }
    if (data.commoditySelections.length === 0 && data.commodities.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commoditySelections"], message: "Select at least one commodity" });
    }
  }

  if (data.marketplaceRole === "trader") {
    required("country", "Country is required");
    required("city", "City is required");
    required("businessName", "Entity name is required");
    required("businessRegistrationNumber", "Entity registration number is required");
    required("entityType", "Entity type is required");
    if (data.entityType && !entityTypes.has(data.entityType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["entityType"], message: "Select a valid entity type" });
    }
    if (data.commoditySelections.length === 0 && data.commodities.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commoditySelections"], message: "Select at least one commodity" });
    }
  }

  if (data.marketplaceRole === "buyer") {
    required("country", "Country is required");
    required("city", "City is required");
    required("businessName", "Entity name is required");
    required("businessRegistrationNumber", "Entity registration number is required");
    required("entityType", "Entity type is required");
    if (data.entityType && !entityTypes.has(data.entityType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["entityType"], message: "Select a valid entity type" });
    }
    if (data.commoditySelections.length === 0 && !data.sourcingCommodity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commoditySelections"], message: "Sourcing interest is required" });
    }
    required("expectedVolume", "Expected volume is required");
    required("destinationCountry", "Destination country is required");
  }

  if (data.market === "coffee") {
    if (!data.commoditySelections.some((selection) => selection.commodity === "Coffee")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commoditySelections"], message: "Select Coffee to continue" });
    }
    required("coffeeOriginCountry", "Country of origin is required");
    required("coffeeOriginRegion", "Region is required");
    required("coffeeVariety", "Variety is required");
    required("coffeeProcessingType", "Processing type is required");

    const origin = data.coffeeOriginCountry ? coffeeOriginCatalog[data.coffeeOriginCountry] : undefined;
    if (data.coffeeOriginCountry && !origin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coffeeOriginCountry"], message: "Select a valid country of origin" });
    }
    if (origin && data.coffeeOriginRegion && !origin.regions.includes(data.coffeeOriginRegion)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coffeeOriginRegion"], message: "Select a valid region for this country" });
    }
    if (origin && data.coffeeVariety && !origin.varieties.includes(data.coffeeVariety)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coffeeVariety"], message: "Select a valid variety for this country" });
    }
    if (data.coffeeProcessingType && !coffeeProcessingTypes.has(data.coffeeProcessingType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["coffeeProcessingType"], message: "Select a valid processing type" });
    }
  }
});

async function getCurrentUser(clerkId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  return user;
}

router.get("/onboarding/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const user = await getCurrentUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [onboarding] = await db
    .select()
    .from(marketplaceOnboardingProfilesTable)
    .where(eq(marketplaceOnboardingProfilesTable.userId, user.id))
    .limit(1);

  if (!onboarding) return res.status(404).json({ error: "Onboarding profile not found" });
  return res.json(onboarding);
});

router.put("/onboarding/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Please check the highlighted fields",
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const user = await getCurrentUser(clerkId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const data = parsed.data;
  const commoditySelections = data.commoditySelections.length > 0
    ? data.commoditySelections
    : data.commodities.map((commodity) => ({ commodity, subType: null }));
  const legacyCommodityNames = commoditySelections.map(({ commodity, subType }) => subType ? `${commodity}: ${subType}` : commodity);
  const tier = data.marketplaceRole === "producer" ? "PRODUCER" : "OFF_TAKER";
  const now = new Date();
  const values = {
    userId: user.id,
    marketplaceRole: data.marketplaceRole,
    fullName: data.fullName,
    country: data.country || null,
    region: data.region || null,
    city: data.city || null,
    commodities: legacyCommodityNames,
    commoditySelections,
    payoutMobileMoney: data.payoutMobileMoney || null,
    businessName: data.businessName || null,
    businessRegistrationNumber: data.businessRegistrationNumber || null,
    entityType: data.entityType || null,
    bankDetails: data.bankDetails || null,
    sourcingCommodity: data.marketplaceRole === "buyer" ? legacyCommodityNames.join(", ") || data.sourcingCommodity || null : null,
    expectedVolume: data.expectedVolume || null,
    destinationCountry: data.destinationCountry || null,
    interests: data.interests,
    producerStory: data.marketplaceRole === "producer" ? data.producerStory || null : null,
    updatedAt: now,
    ...(data.market === "coffee"
      ? {
          coffeeOriginCountry: data.coffeeOriginCountry || null,
          coffeeOriginRegion: data.coffeeOriginRegion || null,
          coffeeVariety: data.coffeeVariety || null,
          coffeeProcessingType: data.coffeeProcessingType || null,
        }
      : {}),
  };

  const [existing] = await db
    .select({ id: marketplaceOnboardingProfilesTable.id })
    .from(marketplaceOnboardingProfilesTable)
    .where(eq(marketplaceOnboardingProfilesTable.userId, user.id))
    .limit(1);

  const [onboarding] = existing
    ? await db.update(marketplaceOnboardingProfilesTable)
        .set(values)
        .where(eq(marketplaceOnboardingProfilesTable.userId, user.id))
        .returning()
    : await db.insert(marketplaceOnboardingProfilesTable)
        .values({ ...values, createdAt: now })
        .returning();

  const [updatedUser] = await db.update(usersTable)
    .set({
      name: data.fullName,
      company: data.businessName || null,
      tier,
      onboardingStatus: "WRSC_VERIFIED",
    })
    .where(eq(usersTable.id, user.id))
    .returning();

  return res.json({ user: updatedUser, onboarding });
});

export default router;