import { mutation, action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ===== IMPORT DEMOGRAPHICS FROM CENSUS DATA =====
export const importDemographics = mutation({
  args: {
    demographics: v.array(v.object({
      zipCode: v.string(),
      city: v.optional(v.string()),
      population: v.optional(v.number()),
      medianHouseholdIncome: v.optional(v.number()),
      medianAge: v.optional(v.number()),
      ownerOccupiedPercent: v.optional(v.number()),
      renterOccupiedPercent: v.optional(v.number()),
      vacancyRate: v.optional(v.number()),
      medianHomeValue: v.optional(v.number()),
      medianRent: v.optional(v.number()),
      povertyRate: v.optional(v.number()),
      unemploymentRate: v.optional(v.number()),
      collegeEducatedPercent: v.optional(v.number()),
      dataYear: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const demo of args.demographics) {
      const existing = await ctx.db
        .query("demographics")
        .withIndex("by_zip_code", (q) => q.eq("zipCode", demo.zipCode))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...demo, lastUpdated: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("demographics", { ...demo, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// ===== IMPORT SCHOOLS =====
export const importSchools = mutation({
  args: {
    schools: v.array(v.object({
      schoolId: v.string(),
      name: v.string(),
      schoolType: v.union(
        v.literal("elementary"),
        v.literal("middle"),
        v.literal("high"),
        v.literal("k8"),
        v.literal("k12"),
        v.literal("other")
      ),
      address: v.string(),
      city: v.string(),
      zipCode: v.string(),
      district: v.optional(v.string()),
      rating: v.optional(v.number()),
      testScoreRating: v.optional(v.number()),
      studentTeacherRatio: v.optional(v.number()),
      totalStudents: v.optional(v.number()),
      gradeRange: v.optional(v.string()),
      website: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const school of args.schools) {
      const existing = await ctx.db
        .query("schools")
        .filter((q) => q.eq(q.field("schoolId"), school.schoolId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...school, lastUpdated: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("schools", { ...school, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// ===== IMPORT CRIME INCIDENTS =====
export const importCrimeIncidents = mutation({
  args: {
    incidents: v.array(v.object({
      incidentNumber: v.string(),
      crimeType: v.string(),
      crimeCategory: v.optional(v.union(
        v.literal("violent"),
        v.literal("property"),
        v.literal("drug"),
        v.literal("other")
      )),
      address: v.optional(v.string()),
      city: v.string(),
      zipCode: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      occurredDate: v.string(),
      occurredTime: v.optional(v.string()),
      reportedDate: v.optional(v.string()),
      disposition: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;

    for (const incident of args.incidents) {
      // Check if exists
      const existing = await ctx.db
        .query("crimeIncidents")
        .filter((q) => q.eq(q.field("incidentNumber"), incident.incidentNumber))
        .first();

      if (!existing) {
        await ctx.db.insert("crimeIncidents", { ...incident, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted };
  },
});

// ===== IMPORT WALK SCORES =====
export const importWalkScores = mutation({
  args: {
    scores: v.array(v.object({
      address: v.optional(v.string()),
      zipCode: v.string(),
      city: v.string(),
      walkScore: v.optional(v.number()),
      transitScore: v.optional(v.number()),
      bikeScore: v.optional(v.number()),
      walkDescription: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const score of args.scores) {
      const existing = await ctx.db
        .query("walkScores")
        .withIndex("by_zip_code", (q) => q.eq("zipCode", score.zipCode))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...score, lastUpdated: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("walkScores", { ...score, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// ===== IMPORT CODE VIOLATIONS (FROM CLEVELAND OPEN DATA) =====
export const importCodeViolations = mutation({
  args: {
    violations: v.array(v.object({
      parcelId: v.optional(v.string()),
      address: v.string(),
      city: v.string(),
      zipCode: v.optional(v.string()),
      violationType: v.string(),
      violationCode: v.optional(v.string()),
      violationDescription: v.string(),
      severity: v.union(v.literal("minor"), v.literal("major"), v.literal("critical")),
      status: v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("corrected"),
        v.literal("hearing_scheduled"),
        v.literal("lien_placed"),
        v.literal("closed")
      ),
      issuedDate: v.string(),
      dueDate: v.optional(v.string()),
      closedDate: v.optional(v.string()),
      fineAmount: v.optional(v.number()),
      inspectorNotes: v.optional(v.string()),
      caseNumber: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const violation of args.violations) {
      if (violation.caseNumber) {
        const existing = await ctx.db
          .query("codeViolations")
          .filter((q) => q.eq(q.field("caseNumber"), violation.caseNumber))
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, { ...violation, lastUpdated: Date.now() });
          updated++;
          continue;
        }
      }

      await ctx.db.insert("codeViolations", { ...violation, lastUpdated: Date.now() });
      inserted++;
    }

    return { inserted, updated };
  },
});

// ===== IMPORT BUILDING PERMITS =====
export const importBuildingPermits = mutation({
  args: {
    permits: v.array(v.object({
      permitNumber: v.string(),
      parcelId: v.optional(v.string()),
      address: v.string(),
      city: v.string(),
      zipCode: v.optional(v.string()),
      permitType: v.union(
        v.literal("new_construction"),
        v.literal("renovation"),
        v.literal("demolition"),
        v.literal("electrical"),
        v.literal("plumbing"),
        v.literal("hvac"),
        v.literal("roofing"),
        v.literal("other")
      ),
      workDescription: v.optional(v.string()),
      estimatedValue: v.optional(v.number()),
      contractor: v.optional(v.string()),
      issueDate: v.optional(v.string()),
      expirationDate: v.optional(v.string()),
      status: v.union(
        v.literal("applied"),
        v.literal("approved"),
        v.literal("issued"),
        v.literal("completed"),
        v.literal("expired"),
        v.literal("denied")
      ),
      inspectionStatus: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const permit of args.permits) {
      const existing = await ctx.db
        .query("buildingPermits")
        .withIndex("by_permit_number", (q) => q.eq("permitNumber", permit.permitNumber))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...permit, lastUpdated: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("buildingPermits", { ...permit, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// ===== IMPORT FLOOD ZONES =====
export const importFloodZones = mutation({
  args: {
    zones: v.array(v.object({
      parcelId: v.optional(v.string()),
      address: v.optional(v.string()),
      zipCode: v.string(),
      city: v.string(),
      floodZone: v.string(),
      floodZoneDescription: v.optional(v.string()),
      specialFloodHazardArea: v.boolean(),
      baseFloodElevation: v.optional(v.number()),
      insuranceRequired: v.optional(v.boolean()),
      mapPanel: v.optional(v.string()),
      effectiveDate: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;

    for (const zone of args.zones) {
      await ctx.db.insert("floodZones", { ...zone, lastUpdated: Date.now() });
      inserted++;
    }

    return { inserted };
  },
});

// ===== BULK IMPORT TAX DELINQUENT =====
export const importTaxDelinquentBatch = mutation({
  args: {
    records: v.array(v.object({
      parcelId: v.string(),
      address: v.string(),
      city: v.string(),
      zipCode: v.optional(v.string()),
      ownerName: v.string(),
      totalAmountOwed: v.number(),
      yearsDelinquent: v.optional(v.number()),
      oldestDelinquentYear: v.optional(v.number()),
      paymentPlanStatus: v.optional(v.union(
        v.literal("none"),
        v.literal("active"),
        v.literal("defaulted")
      )),
      certifiedForSale: v.optional(v.boolean()),
      lastPaymentDate: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const record of args.records) {
      const existing = await ctx.db
        .query("taxDelinquent")
        .withIndex("by_parcel_id", (q) => q.eq("parcelId", record.parcelId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...record, lastUpdated: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("taxDelinquent", { ...record, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// ===== BULK IMPORT SHERIFF SALES =====
export const importSheriffSalesBatch = mutation({
  args: {
    sales: v.array(v.object({
      caseNumber: v.string(),
      parcelId: v.optional(v.string()),
      address: v.string(),
      city: v.string(),
      zipCode: v.optional(v.string()),
      saleDate: v.optional(v.string()),
      saleTime: v.optional(v.string()),
      openingBid: v.optional(v.number()),
      appraisedValue: v.optional(v.number()),
      plaintiff: v.optional(v.string()),
      defendant: v.optional(v.string()),
      status: v.union(
        v.literal("scheduled"),
        v.literal("sold"),
        v.literal("withdrawn"),
        v.literal("cancelled"),
        v.literal("continued"),
        v.literal("redeemed")
      ),
      propertyType: v.optional(v.string()),
      caseType: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const sale of args.sales) {
      const existing = await ctx.db
        .query("sheriffSales")
        .withIndex("by_case_number", (q) => q.eq("caseNumber", sale.caseNumber))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...sale, lastUpdated: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("sheriffSales", { ...sale, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// ===== CLEAR TABLES FOR RE-IMPORT =====
export const clearTable = mutation({
  args: {
    tableName: v.union(
      v.literal("demographics"),
      v.literal("schools"),
      v.literal("crimeIncidents"),
      v.literal("walkScores"),
      v.literal("codeViolations"),
      v.literal("buildingPermits"),
      v.literal("floodZones"),
      v.literal("taxDelinquent"),
      v.literal("sheriffSales"),
      v.literal("posRequirements"),
      v.literal("rentalComps")
    ),
  },
  handler: async (ctx, args) => {
    const tables: Record<string, any> = {
      demographics: "demographics",
      schools: "schools",
      crimeIncidents: "crimeIncidents",
      walkScores: "walkScores",
      codeViolations: "codeViolations",
      buildingPermits: "buildingPermits",
      floodZones: "floodZones",
      taxDelinquent: "taxDelinquent",
      sheriffSales: "sheriffSales",
      posRequirements: "posRequirements",
      rentalComps: "rentalComps",
    };

    const tableName = tables[args.tableName];
    const records = await ctx.db.query(tableName).collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    return { deleted: records.length };
  },
});

// ===== WEEKLY DATA REFRESH TRIGGER =====
// Called by cron job weekly - triggers n8n webhook or logs for manual run
export const triggerWeeklyRefresh = internalAction({
  args: {},
  handler: async (ctx) => {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    const timestamp = new Date().toISOString();

    console.log(`[WEEKLY REFRESH] Triggered at ${timestamp}`);

    // If n8n webhook is configured, trigger the scraper workflow
    if (n8nWebhookUrl) {
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trigger: "weekly_refresh",
            timestamp,
            targets: ["tax_delinquent", "sheriff_sales", "code_violations"],
          }),
        });

        if (response.ok) {
          console.log(`[WEEKLY REFRESH] n8n webhook triggered successfully`);
          return { success: true, method: "n8n_webhook", timestamp };
        } else {
          console.error(`[WEEKLY REFRESH] n8n webhook failed: ${response.status}`);
          return { success: false, method: "n8n_webhook", error: response.statusText };
        }
      } catch (error: any) {
        console.error(`[WEEKLY REFRESH] n8n webhook error: ${error.message}`);
        return { success: false, method: "n8n_webhook", error: error.message };
      }
    }

    // No webhook configured - log for manual intervention
    console.log(`[WEEKLY REFRESH] No N8N_WEBHOOK_URL configured. Run manually:`);
    console.log(`  - npx convex run seedData:seedSampleTaxDelinquent`);
    console.log(`  - npx convex run seedData:seedSampleSheriffSales`);
    console.log(`  - Or import real data via dataImports:importTaxDelinquentBatch`);

    return {
      success: true,
      method: "manual",
      message: "No N8N_WEBHOOK_URL configured. Run seed functions manually or set up n8n workflow.",
      timestamp,
    };
  },
});

// ===== DATA STATS =====
// Get current data counts for monitoring
export const getDataStats = action({
  args: {},
  handler: async (ctx): Promise<{ taxDelinquent: number; sheriffSales: number; lastChecked: string }> => {
    const taxDelinquent: any[] = await ctx.runQuery(api.distressedData.getAllTaxDelinquent, { limit: 1000 });
    const sheriffSales: any[] = await ctx.runQuery(api.distressedData.getAllSheriffSales, { limit: 1000 });

    return {
      taxDelinquent: taxDelinquent.length,
      sheriffSales: sheriffSales.length,
      lastChecked: new Date().toISOString(),
    };
  },
});
