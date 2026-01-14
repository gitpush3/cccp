import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ===== MUNICIPALITY CODE MATRIX QUERIES =====

// Get code matrix for a specific municipality
export const getByMunicipality = query({
  args: { municipality: v.string() },
  handler: async (ctx, args) => {
    const name = args.municipality.toUpperCase().trim();

    // Handle common variations
    const searchName = name
      .replace("CITY OF ", "")
      .replace("VILLAGE OF ", "")
      .replace("TOWNSHIP", "TWP");

    // Try exact match first
    let result = await ctx.db
      .query("municipalityCodeMatrix")
      .withIndex("by_municipality", (q) => q.eq("municipality", searchName))
      .first();

    // If not found, try partial match
    if (!result) {
      const all = await ctx.db.query("municipalityCodeMatrix").collect();
      result = all.find(m =>
        m.municipality.includes(searchName) ||
        searchName.includes(m.municipality)
      ) || null;
    }

    // If still not found and asking for county/state, return those
    if (!result) {
      if (name.includes("CUYAHOGA") || name.includes("COUNTY")) {
        result = await ctx.db
          .query("municipalityCodeMatrix")
          .withIndex("by_municipality", (q) => q.eq("municipality", "CUYAHOGA COUNTY"))
          .first();
      } else if (name.includes("OHIO") || name.includes("STATE")) {
        result = await ctx.db
          .query("municipalityCodeMatrix")
          .withIndex("by_municipality", (q) => q.eq("municipality", "OHIO STATE"))
          .first();
      }
    }

    return result;
  },
});

// Get all municipalities with a specific code type
export const getByCodeType = query({
  args: {
    codeType: v.string(),
    value: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("municipalityCodeMatrix").collect();

    // Filter based on code type
    return all.filter(m => {
      const field = m[args.codeType as keyof typeof m];
      if (args.value) {
        return field === args.value;
      }
      return field === true || (typeof field === "string" && field !== "none");
    });
  },
});

// Get municipalities that require Point of Sale inspection
export const getMunicipalitiesWithPOS = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("municipalityCodeMatrix").collect();
    return all
      .filter(m => m.pointOfSaleRequired)
      .map(m => ({
        municipality: m.municipality,
        posRequirements: m.pointOfSaleNotes,
        fee: m.pointOfSaleFee,
      }));
  },
});

// Get municipalities that require rental registration
export const getMunicipalitiesWithRentalReg = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("municipalityCodeMatrix").collect();
    return all
      .filter(m => m.rentalRegistrationRequired)
      .map(m => ({
        municipality: m.municipality,
        fee: m.rentalRegistrationFee,
        notes: m.rentalRegistrationNotes,
      }));
  },
});

// Compare two municipalities
// Helper to resolve municipality name variations
async function resolveMunicipality(ctx: any, input: string) {
  const name = input.toUpperCase().trim()
    .replace("CITY OF ", "")
    .replace("VILLAGE OF ", "")
    .replace(" CODE", "")
    .replace(" CODES", "");

  // Try exact match first
  let result = await ctx.db
    .query("municipalityCodeMatrix")
    .withIndex("by_municipality", (q: any) => q.eq("municipality", name))
    .first();

  if (result) return result;

  // Handle state/county variations
  if (name.includes("OHIO") || name.includes("STATE")) {
    result = await ctx.db
      .query("municipalityCodeMatrix")
      .withIndex("by_municipality", (q: any) => q.eq("municipality", "OHIO STATE"))
      .first();
    if (result) return result;
  }

  if (name.includes("CUYAHOGA") || name.includes("COUNTY")) {
    result = await ctx.db
      .query("municipalityCodeMatrix")
      .withIndex("by_municipality", (q: any) => q.eq("municipality", "CUYAHOGA COUNTY"))
      .first();
    if (result) return result;
  }

  // Try partial match
  const all = await ctx.db.query("municipalityCodeMatrix").collect();
  return all.find((m: any) =>
    m.municipality.includes(name) ||
    name.includes(m.municipality)
  ) || null;
}

export const compareMunicipalities = query({
  args: {
    municipality1: v.string(),
    municipality2: v.string(),
  },
  handler: async (ctx, args) => {
    const m1 = await resolveMunicipality(ctx, args.municipality1);
    const m2 = await resolveMunicipality(ctx, args.municipality2);

    if (!m1 || !m2) {
      return { error: "One or both municipalities not found", searched: [args.municipality1, args.municipality2] };
    }

    // Find differences
    const differences: Record<string, { m1: any; m2: any }> = {};
    const keys = Object.keys(m1) as (keyof typeof m1)[];

    for (const key of keys) {
      if (key === "_id" || key === "_creationTime" || key === "municipality" || key === "lastUpdated") continue;
      if (m1[key] !== m2[key]) {
        differences[key as string] = { m1: m1[key], m2: m2[key] };
      }
    }

    return {
      municipality1: m1,
      municipality2: m2,
      differences,
    };
  },
});

// Get all municipalities (for dropdown/list)
export const getAllMunicipalities = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("municipalityCodeMatrix").collect();
    return all.map(m => ({
      municipality: m.municipality,
      municipalityType: m.municipalityType,
      population: m.population,
    })).sort((a, b) => a.municipality.localeCompare(b.municipality));
  },
});

// Check if permit is required
export const checkPermitRequired = query({
  args: {
    municipality: v.string(),
    permitType: v.string(), // roof, deck, fence, hvac, electrical, plumbing, demolition
  },
  handler: async (ctx, args) => {
    const matrix = await resolveMunicipality(ctx, args.municipality);

    if (!matrix) {
      return { error: "Municipality not found", required: null, searched: args.municipality };
    }

    const permitMap: Record<string, { required: keyof typeof matrix; fee: keyof typeof matrix; notes: keyof typeof matrix }> = {
      roof: { required: "roofPermitRequired", fee: "roofPermitFee", notes: "roofPermitNotes" },
      deck: { required: "deckPermitRequired", fee: "deckPermitFee", notes: "deckPermitNotes" },
      fence: { required: "fencePermitRequired", fee: "fencePermitFee", notes: "fencePermitNotes" },
      hvac: { required: "hvacPermitRequired", fee: "hvacPermitFee", notes: "hvacPermitNotes" },
      electrical: { required: "electricalPermitRequired", fee: "electricalPermitFee", notes: "electricalPermitNotes" },
      plumbing: { required: "plumbingPermitRequired", fee: "plumbingPermitFee", notes: "plumbingPermitNotes" },
      demolition: { required: "demolitionPermitRequired", fee: "demolitionPermitFee", notes: "demolitionPermitNotes" },
    };

    const permit = permitMap[args.permitType.toLowerCase()];
    if (!permit) {
      return { error: "Unknown permit type", required: null };
    }

    return {
      municipality: matrix.municipality,
      permitType: args.permitType,
      required: matrix[permit.required],
      fee: matrix[permit.fee],
      notes: matrix[permit.notes],
      buildingDeptPhone: matrix.buildingDeptPhone,
      buildingDeptWebsite: matrix.buildingDeptWebsite,
    };
  },
});
