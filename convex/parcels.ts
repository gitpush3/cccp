import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ===== PARCEL QUERIES (LLM Tool Functions) =====

// Search for parcels by address (fuzzy search)
export const searchByAddress = query({
  args: { 
    address: v.string(),
    city: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    let query = ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => {
        let search = q.search("fullAddress", args.address);
        if (args.city) search = search.eq("city", args.city.toUpperCase());
        if (args.zipCode) search = search.eq("zipCode", args.zipCode);
        return search;
      });
    
    return await query.take(limit);
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

// Get parcels by city
export const getByCity = query({
  args: { 
    city: v.string(), 
    limit: v.optional(v.number()),
    propertyClass: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    let results = await ctx.db
      .query("parcels")
      .withIndex("by_city", (q) => q.eq("city", args.city.toUpperCase()))
      .take(limit * 2); // Get extra to filter
    
    if (args.propertyClass) {
      results = results.filter(p => p.propertyClass === args.propertyClass);
    }
    
    return results.slice(0, limit);
  },
});

// Get parcels by zip code
export const getByZipCode = query({
  args: { 
    zipCode: v.string(), 
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", args.zipCode))
      .take(limit);
  },
});

// Search parcels by owner name
export const searchByOwner = query({
  args: { 
    ownerName: v.string(),
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    let query = ctx.db
      .query("parcels")
      .withSearchIndex("search_owner", (q) => {
        let search = q.search("currentOwner", args.ownerName);
        if (args.city) search = search.eq("city", args.city.toUpperCase());
        return search;
      });
    
    return await query.take(limit);
  },
});

// Get most recent sales by city (for "most recent sale" queries)
export const getMostRecentSalesByCity = query({
  args: { 
    city: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // Get all parcels in the city with sales data
    const parcels = await ctx.db
      .query("parcels")
      .withIndex("by_city", (q) => q.eq("city", args.city.toUpperCase()))
      .collect();
    
    // Filter for properties with sales data and sort by date
    const withSales = parcels
      .filter(p => p.lastSaleDate && p.lastSalePrice && p.lastSalePrice > 0)
      .sort((a, b) => {
        // Sort by most recent sale date first
        const dateA = a.lastSaleDate || "0";
        const dateB = b.lastSaleDate || "0";
        return dateB.localeCompare(dateA);
      })
      .slice(0, limit);
    
    return withSales;
  },
});

// Get zip code market statistics (investor-critical)
// Uses sampling to avoid memory limits on large zip codes
export const getZipCodeStats = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    // Sample up to 2000 parcels to stay under memory limits
    const parcels = await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", args.zipCode))
      .take(2000);

    if (parcels.length === 0) {
      return null;
    }

    // Calculate statistics from sample
    const residential = parcels.filter(p => p.propertyClass === "R");
    const commercial = parcels.filter(p => p.propertyClass === "C");
    const withSales = parcels.filter(p => p.lastSalePrice && p.lastSalePrice > 0);
    const recentSales = withSales.filter(p => {
      if (!p.lastSaleDate) return false;
      const saleYear = parseInt(p.lastSaleDate.substring(0, 4));
      return saleYear >= 2022;
    });
    
    const totalAssessedValue = parcels.reduce((sum, p) => sum + (p.certifiedTaxTotal || 0), 0);
    const avgAssessedValue = parcels.length > 0 ? totalAssessedValue / parcels.length : 0;
    
    const salePrices = recentSales.map(p => p.lastSalePrice!).sort((a, b) => a - b);
    const medianSalePrice = salePrices.length > 0 
      ? salePrices[Math.floor(salePrices.length / 2)]
      : null;

    // Calculate price per sq ft for residential
    const resWithArea = residential.filter(p => p.totalResLivingArea && p.totalResLivingArea > 0 && p.lastSalePrice && p.lastSalePrice > 0);
    const avgPricePerSqFt = resWithArea.length > 0
      ? resWithArea.reduce((sum, p) => sum + (p.lastSalePrice! / p.totalResLivingArea!), 0) / resWithArea.length
      : null;

    return {
      zipCode: args.zipCode,
      totalParcels: parcels.length,
      residentialCount: residential.length,
      commercialCount: commercial.length,
      averageAssessedValue: Math.round(avgAssessedValue),
      medianRecentSalePrice: medianSalePrice ? Math.round(medianSalePrice) : null,
      recentSalesCount: recentSales.length,
      avgPricePerSqFt: avgPricePerSqFt ? Math.round(avgPricePerSqFt) : null,
      sampleSize: parcels.length,
      note: parcels.length === 2000 ? "Statistics based on sample of 2000 parcels" : undefined,
    };
  },
});

// Get comparable properties (comps) for valuation
export const getComparables = query({
  args: {
    address: v.string(),
    radiusMiles: v.optional(v.number()), // Not implemented - would need geocoding
  },
  handler: async (ctx, args) => {
    // First find the subject property
    const searchResults = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const subject = searchResults[0];
    if (!subject) {
      return { error: "Property not found", subject: null, comparables: [] };
    }

    // Find similar properties in same zip code (sample to avoid memory limits)
    const allInZip = await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", subject.zipCode))
      .take(1500);

    // Filter for comparable properties
    const comps = allInZip
      .filter(p => {
        // Exclude subject
        if (p.parcelId === subject.parcelId) return false;
        
        // Must have recent sale (2020+)
        if (!p.lastSalePrice || !p.lastSaleDate) return false;
        const saleYear = parseInt(p.lastSaleDate.substring(0, 4));
        if (saleYear < 2020) return false;
        
        // Same property class
        if (p.propertyClass !== subject.propertyClass) return false;
        
        // Same land use code
        if (p.taxLuc !== subject.taxLuc) return false;
        
        // Similar size (within 30%)
        if (subject.totalResLivingArea && p.totalResLivingArea) {
          const sizeDiff = Math.abs(p.totalResLivingArea - subject.totalResLivingArea) / subject.totalResLivingArea;
          if (sizeDiff > 0.3) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by most recent sale first
        const dateA = a.lastSaleDate || "0";
        const dateB = b.lastSaleDate || "0";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 10);

    // Calculate comp statistics
    const compPrices = comps.map(c => c.lastSalePrice!);
    const avgCompPrice = compPrices.length > 0 
      ? compPrices.reduce((a, b) => a + b, 0) / compPrices.length 
      : null;

    return {
      subject,
      comparables: comps,
      analysis: {
        compCount: comps.length,
        avgCompPrice: avgCompPrice ? Math.round(avgCompPrice) : null,
        priceRange: compPrices.length > 0 ? {
          low: Math.min(...compPrices),
          high: Math.max(...compPrices),
        } : null,
      },
    };
  },
});

// Get investment analysis for a property
export const getInvestmentAnalysis = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    // Find the property
    const searchResults = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const parcel = searchResults[0];
    if (!parcel) {
      return { error: "Property not found", parcel: null, metrics: null };
    }

    // Calculate investment metrics
    const assessedValue = parcel.certifiedTaxTotal || 0;
    const lastSalePrice = parcel.lastSalePrice || 0;
    const grossValue = parcel.grossCertifiedTotal || 0;
    
    const pricePerSqFt = parcel.totalResLivingArea && lastSalePrice > 0
      ? lastSalePrice / parcel.totalResLivingArea
      : null;

    // Appreciation since last sale (assessed vs purchase)
    const appreciation = lastSalePrice > 0 && assessedValue > 0
      ? ((assessedValue - lastSalePrice) / lastSalePrice) * 100
      : null;

    // Tax abatement opportunity
    const hasAbatement = parcel.taxAbatement && parcel.taxAbatement.length > 0;
    const abatedAmount = parcel.certifiedAbatedTotal || 0;

    // Get zip code context
    const zipStats = await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", parcel.zipCode))
      .collect();
    
    const zipAvgValue = zipStats.length > 0
      ? zipStats.reduce((sum, p) => sum + (p.certifiedTaxTotal || 0), 0) / zipStats.length
      : null;

    return {
      parcel,
      metrics: {
        assessedValue,
        lastSalePrice,
        grossValue,
        pricePerSqFt: pricePerSqFt ? Math.round(pricePerSqFt) : null,
        appreciationPercent: appreciation ? Math.round(appreciation * 10) / 10 : null,
        hasAbatement,
        abatedAmount,
        zipCodeAvgValue: zipAvgValue ? Math.round(zipAvgValue) : null,
        valueVsZipAvg: zipAvgValue && assessedValue 
          ? Math.round(((assessedValue - zipAvgValue) / zipAvgValue) * 100) 
          : null,
      },
    };
  },
});

// Get land use code description
export const getLandUseCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("landUseCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

// Get all land use codes (for LLM reference)
export const getAllLandUseCodes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("landUseCodes").collect();
  },
});

// ===== IMPORT MUTATIONS =====

// Insert a batch of parcels (for import script)
export const insertParcelBatch = mutation({
  args: {
    parcels: v.array(v.object({
      parcelId: v.string(),
      parcelPin: v.optional(v.string()),
      bookPage: v.optional(v.string()),
      parcelType: v.optional(v.string()),
      parcelYear: v.optional(v.number()),
      fullAddress: v.string(),
      streetNumber: v.optional(v.string()),
      streetPredir: v.optional(v.string()),
      streetName: v.optional(v.string()),
      streetSuffix: v.optional(v.string()),
      unit: v.optional(v.string()),
      city: v.string(),
      zipCode: v.string(),
      currentOwner: v.optional(v.string()),
      grantee: v.optional(v.string()),
      grantor: v.optional(v.string()),
      mailName: v.optional(v.string()),
      mailAddress: v.optional(v.string()),
      mailCity: v.optional(v.string()),
      mailState: v.optional(v.string()),
      mailZip: v.optional(v.string()),
      lastSaleDate: v.optional(v.string()),
      lastSalePrice: v.optional(v.number()),
      taxLuc: v.optional(v.string()),
      taxLucDescription: v.optional(v.string()),
      extLuc: v.optional(v.string()),
      extLucDescription: v.optional(v.string()),
      zoningCode: v.optional(v.string()),
      zoningUse: v.optional(v.string()),
      propertyClass: v.optional(v.string()),
      taxDistrict: v.optional(v.string()),
      neighborhoodCode: v.optional(v.string()),
      totalAcreage: v.optional(v.number()),
      totalSquareFt: v.optional(v.number()),
      totalLegalFront: v.optional(v.number()),
      resBuildingCount: v.optional(v.number()),
      totalResLivingArea: v.optional(v.number()),
      totalResRooms: v.optional(v.number()),
      comBuildingCount: v.optional(v.number()),
      totalComUseArea: v.optional(v.number()),
      comLivingUnits: v.optional(v.number()),
      certifiedTaxLand: v.optional(v.number()),
      certifiedTaxBuilding: v.optional(v.number()),
      certifiedTaxTotal: v.optional(v.number()),
      certifiedExemptTotal: v.optional(v.number()),
      certifiedAbatedTotal: v.optional(v.number()),
      grossCertifiedLand: v.optional(v.number()),
      grossCertifiedBuilding: v.optional(v.number()),
      grossCertifiedTotal: v.optional(v.number()),
      taxYear: v.optional(v.number()),
      roadType: v.optional(v.string()),
      water: v.optional(v.string()),
      sewer: v.optional(v.string()),
      gas: v.optional(v.string()),
      electricity: v.optional(v.string()),
      taxAbatement: v.optional(v.string()),
      condoComplexId: v.optional(v.string()),
      dataSource: v.string(),
      lastUpdated: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const parcel of args.parcels) {
      await ctx.db.insert("parcels", parcel);
    }
    return { inserted: args.parcels.length };
  },
});

// Clear all parcels (for re-import)
export const clearAllParcels = mutation({
  args: {},
  handler: async (ctx) => {
    const parcels = await ctx.db.query("parcels").collect();
    for (const parcel of parcels) {
      await ctx.db.delete(parcel._id);
    }
    return { deleted: parcels.length };
  },
});

// Insert land use codes
export const insertLandUseCodes = mutation({
  args: {
    codes: v.array(v.object({
      code: v.string(),
      description: v.string(),
      category: v.string(),
      investorNotes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    for (const code of args.codes) {
      // Check if exists
      const existing = await ctx.db
        .query("landUseCodes")
        .withIndex("by_code", (q) => q.eq("code", code.code))
        .first();
      
      if (!existing) {
        await ctx.db.insert("landUseCodes", code);
      }
    }
    return { inserted: args.codes.length };
  },
});
