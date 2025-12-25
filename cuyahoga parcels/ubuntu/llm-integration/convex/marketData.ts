import { query } from "./_generated/server";
import { v } from "convex/values";

// Get market data for a specific zip code
export const getMarketDataByZip = query({
  args: { zipCode: v.string(), month: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.month) {
      // Get data for specific month
      return await ctx.db
        .query("marketData")
        .withIndex("by_zip_and_month", (q) =>
          q.eq("zipCode", args.zipCode).eq("dataMonth", args.month)
        )
        .first();
    } else {
      // Get most recent data
      const allData = await ctx.db
        .query("marketData")
        .withIndex("by_zip", (q) => q.eq("zipCode", args.zipCode))
        .collect();
      
      // Sort by dataMonth descending to get most recent
      return allData.sort((a, b) => 
        b.dataMonth.localeCompare(a.dataMonth)
      )[0] || null;
    }
  },
});

// Get market data for a municipality
export const getMarketDataByMunicipality = query({
  args: { municipalityName: v.string() },
  handler: async (ctx, args) => {
    // Find municipality
    const municipality = await ctx.db
      .query("municipalities")
      .withIndex("by_name", (q) => q.eq("name", args.municipalityName))
      .first();

    if (!municipality) {
      return null;
    }

    // Get all zip codes for this municipality
    const zipMappings = await ctx.db
      .query("zipCodeMunicipalities")
      .withIndex("by_municipality", (q) =>
        q.eq("municipalityId", municipality._id)
      )
      .collect();

    // Get market data for each zip code
    const marketDataPromises = zipMappings.map(async (mapping) => {
      const data = await ctx.db
        .query("marketData")
        .withIndex("by_zip", (q) => q.eq("zipCode", mapping.zipCode))
        .collect();
      
      // Get most recent
      return data.sort((a, b) => 
        b.dataMonth.localeCompare(a.dataMonth)
      )[0];
    });

    const allMarketData = await Promise.all(marketDataPromises);
    
    // Filter out nulls and calculate aggregate
    const validData = allMarketData.filter(d => d != null);
    
    if (validData.length === 0) {
      return null;
    }

    // Calculate weighted averages
    const totalHomes = validData.reduce((sum, d) => sum + (d.homesSold || 0), 0);
    
    return {
      municipality: municipality.name,
      zipCodes: zipMappings.map(m => m.zipCode),
      aggregateData: {
        medianSalePrice: calculateWeightedAverage(
          validData,
          "medianSalePrice",
          "homesSold"
        ),
        totalHomesSold: totalHomes,
        averageDaysOnMarket: calculateAverage(validData, "medianDaysOnMarket"),
        yearOverYearPriceChange: calculateAverage(
          validData,
          "yearOverYearPriceChange"
        ),
      },
      byZipCode: validData,
    };
  },
});

// Compare market data across multiple municipalities
export const compareMarketData = query({
  args: { municipalityNames: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results = [];

    for (const name of args.municipalityNames) {
      const data = await ctx.runQuery(api.marketData.getMarketDataByMunicipality, {
        municipalityName: name,
      });
      results.push({
        municipality: name,
        data,
      });
    }

    return results;
  },
});

// Get property details by address
export const getPropertyByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    // Fuzzy search on address
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .collect();

    if (properties.length > 0) {
      return properties[0];
    }

    // If no exact match, try partial match
    const allProperties = await ctx.db.query("properties").collect();
    const addressLower = args.address.toLowerCase();
    const matches = allProperties.filter((p) =>
      p.address.toLowerCase().includes(addressLower)
    );

    return matches[0] || null;
  },
});

// Get demographics for a zip code
export const getDemographicsByZip = query({
  args: { zipCode: v.string() },
  handler: async (ctx, args) => {
    // Get most recent demographics
    const allDemographics = await ctx.db
      .query("demographics")
      .withIndex("by_zip", (q) => q.eq("zipCode", args.zipCode))
      .collect();

    // Sort by year descending
    return allDemographics.sort((a, b) => b.year - a.year)[0] || null;
  },
});

// Get market trends over time for a zip code
export const getMarketTrends = query({
  args: { zipCode: v.string(), months: v.number() },
  handler: async (ctx, args) => {
    const allData = await ctx.db
      .query("marketData")
      .withIndex("by_zip", (q) => q.eq("zipCode", args.zipCode))
      .collect();

    // Sort by month descending and take requested number
    const sorted = allData.sort((a, b) =>
      b.dataMonth.localeCompare(a.dataMonth)
    );

    return sorted.slice(0, args.months);
  },
});

// Get investment insights for a municipality
export const getInvestmentInsights = query({
  args: { municipalityName: v.string() },
  handler: async (ctx, args) => {
    const marketData = await ctx.runQuery(
      api.marketData.getMarketDataByMunicipality,
      { municipalityName: args.municipalityName }
    );

    if (!marketData || !marketData.byZipCode || marketData.byZipCode.length === 0) {
      return null;
    }

    // Calculate investment metrics
    const avgPriceChange = marketData.aggregateData.yearOverYearPriceChange || 0;
    const avgDaysOnMarket = marketData.aggregateData.averageDaysOnMarket || 0;
    const medianPrice = marketData.aggregateData.medianSalePrice || 0;

    // Simple scoring logic
    let marketScore = 0;
    let insights = [];

    // Price appreciation
    if (avgPriceChange > 5) {
      marketScore += 30;
      insights.push("Strong price appreciation (>5% YoY)");
    } else if (avgPriceChange > 0) {
      marketScore += 15;
      insights.push("Positive price growth");
    } else {
      insights.push("Declining or flat prices");
    }

    // Market velocity
    if (avgDaysOnMarket < 30) {
      marketScore += 25;
      insights.push("Hot market - homes selling quickly");
    } else if (avgDaysOnMarket < 60) {
      marketScore += 15;
      insights.push("Moderate market velocity");
    } else {
      insights.push("Slower market - longer days on market");
    }

    // Affordability (relative to county median)
    if (medianPrice < 200000) {
      marketScore += 20;
      insights.push("Affordable entry point");
    } else if (medianPrice < 300000) {
      marketScore += 10;
      insights.push("Mid-range pricing");
    } else {
      insights.push("Premium market");
    }

    return {
      municipality: args.municipalityName,
      marketScore, // 0-100
      insights,
      metrics: {
        medianPrice,
        priceChangeYoY: avgPriceChange,
        daysOnMarket: avgDaysOnMarket,
        totalSales: marketData.aggregateData.totalHomesSold,
      },
    };
  },
});

// Helper functions
function calculateWeightedAverage(
  data: any[],
  valueField: string,
  weightField: string
): number | null {
  let totalValue = 0;
  let totalWeight = 0;

  for (const item of data) {
    const value = item[valueField];
    const weight = item[weightField];
    if (value != null && weight != null && weight > 0) {
      totalValue += value * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? totalValue / totalWeight : null;
}

function calculateAverage(data: any[], field: string): number | null {
  const values = data.map((d) => d[field]).filter((v) => v != null);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
