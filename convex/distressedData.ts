import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ===== SHERIFF SALES QUERIES =====

export const getSheriffSalesByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sheriffSales")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .order("desc")
      .take(100);
  },
});

export const getUpcomingSheriffSales = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sheriffSales")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .order("desc")
      .take(100);
  },
});

export const getSheriffSaleByParcel = query({
  args: { parcelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sheriffSales")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .first();
  },
});

export const searchSheriffSales = query({
  args: { 
    city: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    if (args.city) {
      return await ctx.db
        .query("sheriffSales")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .order("desc")
        .take(limit);
    }
    
    if (args.status) {
      return await ctx.db
        .query("sheriffSales")
        .withIndex("by_status", (q) => q.eq("status", args.status as "scheduled" | "sold" | "withdrawn" | "cancelled" | "continued" | "redeemed"))
        .order("desc")
        .take(limit);
    }
    
    return await ctx.db
      .query("sheriffSales")
      .order("desc")
      .take(limit);
  },
});

// ===== TAX DELINQUENT QUERIES =====

export const getTaxDelinquentByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taxDelinquent")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .order("desc")
      .take(100);
  },
});

export const getTaxDelinquentByParcel = query({
  args: { parcelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taxDelinquent")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .first();
  },
});

export const getHighValueDelinquent = query({
  args: { minAmount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("taxDelinquent")
      .order("desc")
      .take(200);
    
    const minAmount = args.minAmount || 5000;
    return results
      .filter(r => r.totalAmountOwed >= minAmount)
      .slice(0, 50);
  },
});

// ===== TAX LIEN CERTIFICATES QUERIES =====

export const getAvailableTaxLiens = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("taxLienCertificates")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .order("desc")
      .take(100);
  },
});

export const getTaxLienByParcel = query({
  args: { parcelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taxLienCertificates")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .first();
  },
});

// ===== MUTATIONS FOR DATA IMPORT =====

export const insertSheriffSale = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("sheriffSales")
      .withIndex("by_case_number", (q) => q.eq("caseNumber", args.caseNumber))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
      return existing._id;
    }
    
    return await ctx.db.insert("sheriffSales", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

export const insertTaxDelinquent = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("taxDelinquent")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
      return existing._id;
    }
    
    return await ctx.db.insert("taxDelinquent", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

export const insertTaxLien = mutation({
  args: {
    parcelId: v.string(),
    address: v.string(),
    city: v.string(),
    certificateNumber: v.optional(v.string()),
    saleDate: v.optional(v.string()),
    minimumBid: v.optional(v.number()),
    faceValue: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    redemptionDeadline: v.optional(v.string()),
    status: v.union(
      v.literal("available"),
      v.literal("sold"),
      v.literal("redeemed"),
      v.literal("foreclosed")
    ),
    purchaser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("taxLienCertificates")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
      return existing._id;
    }
    
    return await ctx.db.insert("taxLienCertificates", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});
