import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// This script imports the regulations data into Convex
// Run with: npx convex run importRegulations:importData --data regulations_llm_optimized.json

export const importData = internalMutation({
  args: {
    data: v.any(), // The JSON data from regulations_llm_optimized.json
  },
  handler: async (ctx, args) => {
    const data = args.data;

    console.log(`Importing ${data.jurisdictions.length} jurisdictions...`);

    for (const jurisdiction of data.jurisdictions) {
      // Insert municipality
      const municipalityId = await ctx.db.insert("municipalities", {
        name: jurisdiction.name,
        type: jurisdiction.type,
        county: "Cuyahoga",
        state: "Ohio",
      });

      console.log(`Inserted municipality: ${jurisdiction.name}`);

      // Insert regulations for this municipality
      for (const [regType, regData] of Object.entries(jurisdiction.regulations)) {
        await ctx.db.insert("regulationUrls", {
          municipalityId,
          regulationType: regType as any,
          url: (regData as any).url || undefined,
          status: (regData as any).status,
          displayValue: (regData as any).display_value,
          lastVerified: Date.now(),
        });
      }

      console.log(`  - Inserted ${Object.keys(jurisdiction.regulations).length} regulations`);
    }

    console.log("Import complete!");
    return { success: true, count: data.jurisdictions.length };
  },
});

// Clear all data (use with caution!)
export const clearAllData = internalMutation({
  args: {},
  handler: async (ctx) => {
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

    console.log("All data cleared!");
    return { success: true };
  },
});
