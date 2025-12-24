import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

// Type definitions for the JSON data structure
interface RegulationData {
  status: "adopts_state" | "local_code" | "not_found" | "not_applicable";
  url: string | null;
  display_value: string;
}

interface JurisdictionData {
  name: string;
  type: string; // JSON may have "municipality" which we need to map
  regulations: Record<string, RegulationData>;
}

interface ImportData {
  metadata: {
    database_name: string;
    total_jurisdictions: number;
    last_updated: string;
  };
  jurisdictions: JurisdictionData[];
}

// Villages in Cuyahoga County
const VILLAGES = [
  "Bentleyville", "Bratenahl", "Brooklyn Heights", "Chagrin Falls", "Cuyahoga Heights",
  "Gates Mills", "Glenwillow", "Highland Hills", "Hunting Valley", "Linndale",
  "Mayfield", "Moreland Hills", "Newburgh Heights", "North Randall", "Oakwood",
  "Orange", "Valley View", "Walton Hills", "Woodmere"
];

// Townships in Cuyahoga County
const TOWNSHIPS = ["Chagrin Falls Township", "Olmsted Township"];

// Map JSON type to schema type
function getMunicipalityType(name: string, jsonType: string): "state" | "county" | "city" | "village" | "township" {
  if (jsonType === "state") return "state";
  if (jsonType === "county") return "county";
  if (VILLAGES.includes(name)) return "village";
  if (TOWNSHIPS.includes(name)) return "township";
  return "city"; // Default to city for all other municipalities
}

// Import regulations data from JSON
// Run with: npx convex run importRegulations:importData
export const importData = mutation({
  args: {
    data: v.any(), // The JSON data from regulations_llm_optimized.json
  },
  handler: async (ctx, args) => {
    const data = args.data as ImportData;

    console.log(`Importing ${data.jurisdictions.length} jurisdictions...`);

    let importedCount = 0;
    let regulationsCount = 0;

    for (const jurisdiction of data.jurisdictions) {
      // Check if municipality already exists
      const existing = await ctx.db
        .query("municipalities")
        .withIndex("by_name", (q) => q.eq("name", jurisdiction.name))
        .first();

      if (existing) {
        console.log(`Skipping existing municipality: ${jurisdiction.name}`);
        continue;
      }

      // Insert municipality with correct type mapping
      const municipalityType = getMunicipalityType(jurisdiction.name, jurisdiction.type);
      const municipalityId = await ctx.db.insert("municipalities", {
        name: jurisdiction.name,
        type: municipalityType,
        county: "Cuyahoga",
        state: "Ohio",
      });

      console.log(`Inserted municipality: ${jurisdiction.name}`);

      // Insert regulations for this municipality
      for (const [regType, regData] of Object.entries(jurisdiction.regulations)) {
        await ctx.db.insert("regulationUrls", {
          municipalityId,
          regulationType: regType as any,
          url: regData.url || undefined,
          status: regData.status,
          displayValue: regData.display_value,
          lastVerified: Date.now(),
        });
        regulationsCount++;
      }

      console.log(`  - Inserted ${Object.keys(jurisdiction.regulations).length} regulations`);
      importedCount++;
    }

    console.log("Import complete!");
    return { 
      success: true, 
      municipalitiesImported: importedCount,
      regulationsImported: regulationsCount,
      totalJurisdictions: data.jurisdictions.length,
    };
  },
});

// Clear all regulation data (use with caution!)
export const clearAllData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete all regulation content cache
    const content = await ctx.db.query("regulationContent").collect();
    for (const c of content) {
      await ctx.db.delete(c._id);
    }

    // Delete all regulations
    const regulations = await ctx.db.query("regulationUrls").collect();
    for (const reg of regulations) {
      await ctx.db.delete(reg._id);
    }

    // Delete all municipalities
    const municipalities = await ctx.db.query("municipalities").collect();
    for (const muni of municipalities) {
      await ctx.db.delete(muni._id);
    }

    console.log("All regulation data cleared!");
    return { 
      success: true,
      deletedContent: content.length,
      deletedRegulations: regulations.length,
      deletedMunicipalities: municipalities.length,
    };
  },
});

// Get import status
export const getImportStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const municipalities = await ctx.db.query("municipalities").collect();
    const regulations = await ctx.db.query("regulationUrls").collect();

    // Count by type
    const byType = municipalities.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMunicipalities: municipalities.length,
      totalRegulations: regulations.length,
      byType,
    };
  },
});
