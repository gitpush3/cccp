import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ===== CRIME DATA QUERIES =====

export const getCrimeByCity = query({
  args: { city: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crimeIncidents")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .order("desc")
      .take(args.limit || 100);
  },
});

export const getCrimeByZipCode = query({
  args: { zipCode: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crimeIncidents")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .order("desc")
      .take(args.limit || 100);
  },
});

export const getCrimeStats = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    const crimes = await ctx.db
      .query("crimeIncidents")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .take(500);
    
    const total = crimes.length;
    const violent = crimes.filter(c => c.crimeCategory === "violent").length;
    const property = crimes.filter(c => c.crimeCategory === "property").length;
    
    return {
      zipCode: args.zipCode,
      totalIncidents: total,
      violentCrimes: violent,
      propertyCrimes: property,
      violentPercent: total > 0 ? Math.round((violent / total) * 100) : 0,
    };
  },
});

// ===== SCHOOL QUERIES =====

export const getSchoolsByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();
  },
});

export const getSchoolsByZipCode = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("schools")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .collect();
  },
});

export const getTopRatedSchools = query({
  args: { city: v.optional(v.string()), minRating: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let schools;
    if (args.city) {
      schools = await ctx.db
        .query("schools")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .collect();
    } else {
      schools = await ctx.db
        .query("schools")
        .take(500);
    }
    
    const minRating = args.minRating || 7;
    return schools
      .filter(s => s.rating && s.rating >= minRating)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 20);
  },
});

// ===== WALK SCORE QUERIES =====

export const getWalkScoreByZip = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("walkScores")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .first();
  },
});

export const getWalkScoresByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("walkScores")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();
  },
});

// ===== MUTATIONS FOR DATA IMPORT =====

export const insertCrimeIncident = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("crimeIncidents", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

export const insertSchool = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("schools")
      .filter((q) => q.eq(q.field("schoolId"), args.schoolId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
      return existing._id;
    }
    
    return await ctx.db.insert("schools", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

export const insertWalkScore = mutation({
  args: {
    address: v.optional(v.string()),
    zipCode: v.string(),
    city: v.string(),
    walkScore: v.optional(v.number()),
    transitScore: v.optional(v.number()),
    bikeScore: v.optional(v.number()),
    walkDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already exists for this zip
    const existing = await ctx.db
      .query("walkScores")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", args.zipCode))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
      return existing._id;
    }
    
    return await ctx.db.insert("walkScores", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});
