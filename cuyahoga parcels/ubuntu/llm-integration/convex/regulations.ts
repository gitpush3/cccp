import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all regulations for a specific municipality
export const getRegulationsByMunicipality = query({
  args: { municipalityName: v.string() },
  handler: async (ctx, args) => {
    // Find the municipality
    const municipality = await ctx.db
      .query("municipalities")
      .withIndex("by_name", (q) => q.eq("name", args.municipalityName))
      .first();

    if (!municipality) {
      return null;
    }

    // Get all regulations for this municipality
    const regulations = await ctx.db
      .query("regulationUrls")
      .withIndex("by_municipality", (q) =>
        q.eq("municipalityId", municipality._id)
      )
      .collect();

    return {
      municipality,
      regulations: regulations.map((reg) => ({
        type: reg.regulationType,
        url: reg.url,
        status: reg.status,
        displayValue: reg.displayValue,
      })),
    };
  },
});

// Get a specific regulation type for a municipality
export const getRegulation = query({
  args: {
    municipalityName: v.string(),
    regulationType: v.string(),
  },
  handler: async (ctx, args) => {
    const municipality = await ctx.db
      .query("municipalities")
      .withIndex("by_name", (q) => q.eq("name", args.municipalityName))
      .first();

    if (!municipality) {
      return null;
    }

    const regulation = await ctx.db
      .query("regulationUrls")
      .withIndex("by_municipality_and_type", (q) =>
        q
          .eq("municipalityId", municipality._id)
          .eq("regulationType", args.regulationType as any)
      )
      .first();

    return regulation;
  },
});

// Search municipalities by name (fuzzy search)
export const searchMunicipalities = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const allMunicipalities = await ctx.db.query("municipalities").collect();

    // Simple fuzzy search
    const searchLower = args.searchTerm.toLowerCase();
    const matches = allMunicipalities.filter((m) =>
      m.name.toLowerCase().includes(searchLower)
    );

    return matches.slice(0, 10); // Return top 10 matches
  },
});

// Get all municipalities
export const getAllMunicipalities = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("municipalities").collect();
  },
});

// Get state-level codes (Ohio)
export const getStateCodes = query({
  args: {},
  handler: async (ctx) => {
    const ohio = await ctx.db
      .query("municipalities")
      .withIndex("by_name", (q) => q.eq("name", "Ohio State"))
      .first();

    if (!ohio) {
      return null;
    }

    const regulations = await ctx.db
      .query("regulationUrls")
      .withIndex("by_municipality", (q) => q.eq("municipalityId", ohio._id))
      .collect();

    return {
      municipality: ohio,
      regulations,
    };
  },
});

// Get county-level codes
export const getCountyCodes = query({
  args: {},
  handler: async (ctx) => {
    const county = await ctx.db
      .query("municipalities")
      .withIndex("by_name", (q) => q.eq("name", "Cuyahoga County"))
      .first();

    if (!county) {
      return null;
    }

    const regulations = await ctx.db
      .query("regulationUrls")
      .withIndex("by_municipality", (q) => q.eq("municipalityId", county._id))
      .collect();

    return {
      municipality: county,
      regulations,
    };
  },
});

// Compare regulations across multiple municipalities
export const compareRegulations = query({
  args: {
    municipalityNames: v.array(v.string()),
    regulationType: v.string(),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const name of args.municipalityNames) {
      const municipality = await ctx.db
        .query("municipalities")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();

      if (municipality) {
        const regulation = await ctx.db
          .query("regulationUrls")
          .withIndex("by_municipality_and_type", (q) =>
            q
              .eq("municipalityId", municipality._id)
              .eq("regulationType", args.regulationType as any)
          )
          .first();

        results.push({
          municipality: municipality.name,
          regulation: regulation || null,
        });
      }
    }

    return results;
  },
});

// Get cached regulation content
export const getRegulationContent = query({
  args: { regulationUrlId: v.id("regulationUrls") },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("regulationContent")
      .withIndex("by_regulation_url", (q) =>
        q.eq("regulationUrlId", args.regulationUrlId)
      )
      .first();

    return content;
  },
});
