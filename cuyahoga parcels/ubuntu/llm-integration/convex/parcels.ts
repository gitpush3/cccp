import { query } from "./_generated/server";
import { v } from "convex/values";

// Search for parcels by address
export const searchByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    // Use search index for fuzzy matching
    const results = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) =>
        q.search("fullAddress", args.address)
      )
      .take(10);
    
    return results;
  },
});

// Get parcel by exact parcel ID
export const getByParcelId = query({
  args: { parcelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parcels")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .first();
  },
});

// Get parcel by exact address
export const getByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parcels")
      .withIndex("by_address", (q) => q.eq("fullAddress", args.address.toUpperCase()))
      .first();
  },
});

// Get all parcels in a zip code
export const getByZipCode = query({
  args: { zipCode: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", args.zipCode))
      .take(limit);
  },
});

// Get all parcels in a city
export const getByCity = query({
  args: { city: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("parcels")
      .withIndex("by_city", (q) => q.eq("city", args.city.toUpperCase()))
      .take(limit);
  },
});

// Get parcels by owner name
export const getByOwner = query({
  args: { ownerName: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("parcels")
      .withIndex("by_owner", (q) => q.eq("currentOwner", args.ownerName.toUpperCase()))
      .take(limit);
  },
});

// Get parcel statistics for a zip code
export const getZipCodeStats = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    const parcels = await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", args.zipCode))
      .collect();

    if (parcels.length === 0) {
      return null;
    }

    // Calculate statistics
    const residential = parcels.filter(p => p.resBuildingCount && p.resBuildingCount > 0);
    const withSales = parcels.filter(p => p.lastSalePrice && p.lastSalePrice > 0);
    
    const totalValue = parcels.reduce((sum, p) => sum + (p.certifiedTaxTotal || 0), 0);
    const avgValue = totalValue / parcels.length;
    
    const salePrices = withSales.map(p => p.lastSalePrice!).sort((a, b) => a - b);
    const medianSalePrice = salePrices.length > 0 
      ? salePrices[Math.floor(salePrices.length / 2)]
      : null;

    return {
      zipCode: args.zipCode,
      totalParcels: parcels.length,
      residentialCount: residential.length,
      averageAssessedValue: Math.round(avgValue),
      medianSalePrice: medianSalePrice ? Math.round(medianSalePrice) : null,
      parcelsWithRecentSales: withSales.length,
    };
  },
});

// Get comparable properties (comps)
export const getComparables = query({
  args: {
    address: v.string(),
    radius: v.optional(v.number()), // Not implemented yet - would need lat/long
  },
  handler: async (ctx, args) => {
    // Get the subject property
    const subject = await ctx.db
      .query("parcels")
      .withIndex("by_address", (q) => q.eq("fullAddress", args.address.toUpperCase()))
      .first();

    if (!subject) {
      return null;
    }

    // Find similar properties in same zip code
    const allInZip = await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", subject.zipCode || ""))
      .collect();

    // Filter for similar properties
    const comps = allInZip
      .filter(p => {
        // Exclude the subject property
        if (p.parcelId === subject.parcelId) return false;
        
        // Must have recent sale
        if (!p.lastSalePrice || !p.lastSaleDate) return false;
        
        // Must be same property type
        if (p.landUseCode !== subject.landUseCode) return false;
        
        // Similar size (within 30%)
        if (subject.totalLivingArea && p.totalLivingArea) {
          const sizeDiff = Math.abs(p.totalLivingArea - subject.totalLivingArea) / subject.totalLivingArea;
          if (sizeDiff > 0.3) return false;
        }
        
        // Similar bedrooms
        if (subject.bedrooms && p.bedrooms) {
          if (Math.abs(p.bedrooms - subject.bedrooms) > 1) return false;
        }
        
        return true;
      })
      .sort((a, b) => (b.lastSaleDate || 0) - (a.lastSaleDate || 0))
      .slice(0, 10);

    return {
      subject,
      comparables: comps,
    };
  },
});

// Get property investment analysis
export const getInvestmentAnalysis = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const parcel = await ctx.db
      .query("parcels")
      .withIndex("by_address", (q) => q.eq("fullAddress", args.address.toUpperCase()))
      .first();

    if (!parcel) {
      return null;
    }

    // Calculate metrics
    const assessedValue = parcel.certifiedTaxTotal || 0;
    const lastSalePrice = parcel.lastSalePrice || 0;
    const pricePerSqFt = parcel.totalLivingArea && lastSalePrice > 0
      ? lastSalePrice / parcel.totalLivingArea
      : null;

    // Appreciation since last sale
    const appreciation = lastSalePrice > 0 && assessedValue > 0
      ? ((assessedValue - lastSalePrice) / lastSalePrice) * 100
      : null;

    // Get zip code stats for context
    const zipStats = parcel.zipCode
      ? await ctx.runQuery(api.parcels.getZipCodeStats, { zipCode: parcel.zipCode })
      : null;

    return {
      parcel,
      metrics: {
        assessedValue,
        lastSalePrice,
        pricePerSqFt: pricePerSqFt ? Math.round(pricePerSqFt) : null,
        appreciationPercent: appreciation ? Math.round(appreciation * 10) / 10 : null,
      },
      zipCodeContext: zipStats,
    };
  },
});
