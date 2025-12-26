import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ===== BUILDING PERMITS QUERIES =====

export const getPermitsByCity = query({
  args: { city: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("buildingPermits")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .order("desc")
      .take(args.limit || 100);
  },
});

export const getPermitsByParcel = query({
  args: { parcelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("buildingPermits")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .collect();
  },
});

export const getRecentPermits = query({
  args: { city: v.optional(v.string()), permitType: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    if (args.city) {
      return await ctx.db
        .query("buildingPermits")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .order("desc")
        .take(limit);
    }
    
    if (args.permitType) {
      return await ctx.db
        .query("buildingPermits")
        .withIndex("by_permit_type", (q) => q.eq("permitType", args.permitType as "new_construction" | "renovation" | "demolition" | "electrical" | "plumbing" | "hvac" | "roofing" | "other"))
        .order("desc")
        .take(limit);
    }
    
    return await ctx.db
      .query("buildingPermits")
      .order("desc")
      .take(limit);
  },
});

// ===== DEMOGRAPHICS QUERIES =====

export const getDemographicsByZip = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("demographics")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .first();
  },
});

export const getDemographicsByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("demographics")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();
  },
});

export const getNeighborhoodAnalysis = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    const demographics = await ctx.db
      .query("demographics")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .first();
    
    const walkScore = await ctx.db
      .query("walkScores")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .first();
    
    const schools = await ctx.db
      .query("schools")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .collect();
    
    const avgSchoolRating = schools.length > 0
      ? schools.reduce((sum, s) => sum + (s.rating || 0), 0) / schools.length
      : null;
    
    return {
      zipCode: args.zipCode,
      demographics,
      walkScore,
      schoolCount: schools.length,
      avgSchoolRating: avgSchoolRating ? Math.round(avgSchoolRating * 10) / 10 : null,
    };
  },
});

// ===== FLOOD ZONE QUERIES =====

export const getFloodZoneByParcel = query({
  args: { parcelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("floodZones")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .first();
  },
});

export const getFloodZonesByZip = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("floodZones")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .collect();
  },
});

export const getHighRiskFloodZones = query({
  args: { city: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.city) {
      const zones = await ctx.db
        .query("floodZones")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .collect();
      return zones.filter(z => z.specialFloodHazardArea);
    }
    
    const zones = await ctx.db
      .query("floodZones")
      .take(500);
    return zones.filter(z => z.specialFloodHazardArea).slice(0, 100);
  },
});

// ===== MUTATIONS FOR DATA IMPORT =====

export const insertBuildingPermit = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("buildingPermits")
      .withIndex("by_permit_number", (q) => q.eq("permitNumber", args.permitNumber))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
      return existing._id;
    }
    
    return await ctx.db.insert("buildingPermits", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

export const insertDemographics = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("demographics")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
      return existing._id;
    }
    
    return await ctx.db.insert("demographics", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

export const insertFloodZone = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    if (args.parcelId) {
      const existing = await ctx.db
        .query("floodZones")
        .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
        .first();
      
      if (existing) {
        await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
        return existing._id;
      }
    }
    
    return await ctx.db.insert("floodZones", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});
