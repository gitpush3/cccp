import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Search code content by text
export const searchContent = query({
  args: {
    searchText: v.string(),
    municipality: v.optional(v.string()),
    codeType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    let query = ctx.db
      .query("codeContent")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.searchText);
        if (args.municipality) {
          search = search.eq("municipality", args.municipality);
        }
        if (args.codeType) {
          search = search.eq("codeType", args.codeType);
        }
        return search;
      });
    
    return await query.take(limit);
  },
});

// Search code content by title
export const searchByTitle = query({
  args: {
    searchText: v.string(),
    municipality: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    let query = ctx.db
      .query("codeContent")
      .withSearchIndex("search_title", (q) => {
        let search = q.search("title", args.searchText);
        if (args.municipality) {
          search = search.eq("municipality", args.municipality);
        }
        return search;
      });
    
    return await query.take(limit);
  },
});

// Get all code content for a municipality
export const getByMunicipality = query({
  args: {
    municipality: v.string(),
    codeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.codeType) {
      const codeType = args.codeType;
      return await ctx.db
        .query("codeContent")
        .withIndex("by_municipality_and_type", (q) => 
          q.eq("municipality", args.municipality).eq("codeType", codeType)
        )
        .collect();
    }
    
    return await ctx.db
      .query("codeContent")
      .withIndex("by_municipality", (q) => q.eq("municipality", args.municipality))
      .collect();
  },
});

// Get code content by type across all municipalities
export const getByCodeType = query({
  args: {
    codeType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    return await ctx.db
      .query("codeContent")
      .withIndex("by_code_type", (q) => q.eq("codeType", args.codeType))
      .take(limit);
  },
});

// Get investor guides
export const getInvestorGuides = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("codeContent")
      .withIndex("by_code_type", (q) => q.eq("codeType", "investor-guide"))
      .collect();
  },
});

// Get all code content (for debugging/admin)
export const getAll = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db.query("codeContent").take(limit);
  },
});

// Insert code content (for import script)
export const insert = mutation({
  args: {
    municipality: v.string(),
    codeType: v.string(),
    section: v.string(),
    title: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
    investorNotes: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("codeContent", args);
  },
});

// Clear all code content (for re-import)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("codeContent").collect();
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: all.length };
  },
});

// Get count of code content entries
export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("codeContent").collect();
    return { count: all.length };
  },
});

// ===== SMART CODE SEARCH =====
// Combines multiple search strategies for best results

export const smartSearch = query({
  args: {
    query: v.string(),
    municipality: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const results: Map<string, any> = new Map();

    // Strategy 1: Search content
    const contentResults = await ctx.db
      .query("codeContent")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.query);
        if (args.municipality) {
          search = search.eq("municipality", args.municipality);
        }
        return search;
      })
      .take(limit);

    for (const r of contentResults) {
      results.set(r._id.toString(), { ...r, matchType: "content", score: 1 });
    }

    // Strategy 2: Search title
    const titleResults = await ctx.db
      .query("codeContent")
      .withSearchIndex("search_title", (q) => {
        let search = q.search("title", args.query);
        if (args.municipality) {
          search = search.eq("municipality", args.municipality);
        }
        return search;
      })
      .take(limit);

    for (const r of titleResults) {
      const existing = results.get(r._id.toString());
      if (existing) {
        existing.score += 1;
        existing.matchType = "both";
      } else {
        results.set(r._id.toString(), { ...r, matchType: "title", score: 0.8 });
      }
    }

    // Sort by score and return
    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Group by code type for better organization
    const grouped: Record<string, any[]> = {};
    for (const r of sortedResults) {
      if (!grouped[r.codeType]) grouped[r.codeType] = [];
      grouped[r.codeType].push({
        section: r.section,
        title: r.title,
        summary: r.summary,
        content: r.content?.substring(0, 500) + (r.content?.length > 500 ? "..." : ""),
        investorNotes: r.investorNotes,
        sourceUrl: r.sourceUrl,
        matchType: r.matchType,
      });
    }

    return {
      query: args.query,
      municipality: args.municipality || "all",
      totalResults: sortedResults.length,
      resultsByType: grouped,
      topResult: sortedResults[0] ? {
        title: sortedResults[0].title,
        section: sortedResults[0].section,
        content: sortedResults[0].content,
        investorNotes: sortedResults[0].investorNotes,
        sourceUrl: sortedResults[0].sourceUrl,
      } : null,
    };
  },
});

// ===== PERMIT REQUIREMENTS LOOKUP =====
// Common permit questions with built-in knowledge + DB lookup

export const getPermitRequirements = query({
  args: {
    workType: v.string(), // "roof", "hvac", "electrical", "plumbing", "fence", "deck", "addition", "renovation"
    municipality: v.string(),
  },
  handler: async (ctx, args) => {
    const workType = args.workType.toLowerCase();
    const municipality = args.municipality;

    // Built-in permit knowledge base
    const PERMIT_KNOWLEDGE: Record<string, {
      permitRequired: boolean;
      permitType: string;
      typicalCost: string;
      inspectionsRequired: string[];
      commonRequirements: string[];
      investorTips: string;
    }> = {
      roof: {
        permitRequired: true,
        permitType: "Building Permit",
        typicalCost: "$75-150",
        inspectionsRequired: ["Final roofing inspection"],
        commonRequirements: [
          "Must use licensed contractor in most cities",
          "Existing roof layer count matters (max 2 layers typically)",
          "Ice/water shield required in valleys and at eaves",
          "Proper ventilation required",
        ],
        investorTips: "Always pull permit - insurance claims need proof. Can be homeowner permit in some cities.",
      },
      hvac: {
        permitRequired: true,
        permitType: "Mechanical Permit",
        typicalCost: "$50-125",
        inspectionsRequired: ["Rough mechanical", "Final mechanical"],
        commonRequirements: [
          "Licensed HVAC contractor required",
          "Gas line work needs separate gas permit",
          "Ductwork changes may need additional permit",
          "Load calculation required for new systems",
        ],
        investorTips: "HVAC permits are strictly enforced. Always use licensed contractor. Check for rebates.",
      },
      electrical: {
        permitRequired: true,
        permitType: "Electrical Permit",
        typicalCost: "$50-150",
        inspectionsRequired: ["Rough electrical", "Final electrical"],
        commonRequirements: [
          "Licensed electrician required in most cities",
          "Panel upgrades need utility coordination",
          "GFCI required in wet locations",
          "AFCI required in bedrooms (newer code)",
        ],
        investorTips: "Electrical is highest liability. Never skip permits. Insurance won't cover unpermitted work.",
      },
      plumbing: {
        permitRequired: true,
        permitType: "Plumbing Permit",
        typicalCost: "$50-125",
        inspectionsRequired: ["Rough plumbing", "Final plumbing"],
        commonRequirements: [
          "Licensed plumber required",
          "Water heater replacement needs permit",
          "Fixture relocation needs permit",
          "Sewer line work needs separate permit",
        ],
        investorTips: "Water heater permits often missed - inspectors check for strapping and proper venting.",
      },
      fence: {
        permitRequired: true,
        permitType: "Fence Permit or Zoning Permit",
        typicalCost: "$25-75",
        inspectionsRequired: ["Final fence inspection (some cities)"],
        commonRequirements: [
          "Height limits: 4ft front yard, 6ft side/rear typically",
          "Setback from property line (usually on your side)",
          "Survey may be required",
          "HOA approval may be needed",
        ],
        investorTips: "Check zoning before installing. Corner lots have special rules. Survey prevents neighbor disputes.",
      },
      deck: {
        permitRequired: true,
        permitType: "Building Permit",
        typicalCost: "$100-250",
        inspectionsRequired: ["Footing inspection", "Framing inspection", "Final inspection"],
        commonRequirements: [
          "Engineered plans may be required for large decks",
          "Ledger board attachment to house is critical",
          "Guardrails required over 30 inches",
          "Proper footing depth (below frost line)",
        ],
        investorTips: "Decks are heavily inspected. Ledger board failures are common - inspectors focus here.",
      },
      addition: {
        permitRequired: true,
        permitType: "Building Permit + Trade Permits",
        typicalCost: "$500-2000+",
        inspectionsRequired: [
          "Foundation/footing", "Framing", "Rough electrical",
          "Rough plumbing", "Rough mechanical", "Insulation", "Final",
        ],
        commonRequirements: [
          "Architectural plans required",
          "Zoning review for setbacks and lot coverage",
          "May need variance if close to property lines",
          "Energy code compliance",
        ],
        investorTips: "Additions are complex. Budget 3-6 months for permits. Zoning is the first hurdle.",
      },
      renovation: {
        permitRequired: true,
        permitType: "Building Permit (scope dependent)",
        typicalCost: "$100-500",
        inspectionsRequired: ["Varies by scope"],
        commonRequirements: [
          "Structural changes always need permit",
          "Moving walls needs permit",
          "Cosmetic-only work usually doesn't need permit",
          "Lead paint rules for pre-1978 homes",
        ],
        investorTips: "Define scope carefully. 'Like for like' repairs often don't need permits. Document everything.",
      },
      "water heater": {
        permitRequired: true,
        permitType: "Plumbing Permit",
        typicalCost: "$50-75",
        inspectionsRequired: ["Final plumbing"],
        commonRequirements: [
          "Temperature/pressure relief valve required",
          "Proper venting for gas units",
          "Seismic strapping required",
          "Expansion tank may be required",
        ],
        investorTips: "Most missed permit. Inspectors always check strapping and venting. POS inspection catches this.",
      },
      window: {
        permitRequired: true,
        permitType: "Building Permit",
        typicalCost: "$50-100",
        inspectionsRequired: ["Final inspection"],
        commonRequirements: [
          "Same size opening: usually simple permit",
          "New/larger opening: structural review needed",
          "Egress requirements for bedrooms",
          "Energy code compliance",
        ],
        investorTips: "Replacing windows same-size is easy permit. Changing sizes is much harder.",
      },
      siding: {
        permitRequired: false,
        permitType: "Usually no permit needed",
        typicalCost: "$0",
        inspectionsRequired: [],
        commonRequirements: [
          "Like-for-like replacement: no permit",
          "Changing material type: check with city",
          "Lead paint rules for pre-1978",
          "May need permit if structural repairs underneath",
        ],
        investorTips: "Siding alone rarely needs permit. But if you find rot, structural repair does need permit.",
      },
      driveway: {
        permitRequired: true,
        permitType: "Driveway/Paving Permit",
        typicalCost: "$50-100",
        inspectionsRequired: ["Sometimes"],
        commonRequirements: [
          "Impervious surface limits",
          "Drainage requirements",
          "Apron connection to street",
          "Width limits in some cities",
        ],
        investorTips: "Check impervious surface limits before expanding. Some cities very strict.",
      },
    };

    // Get permit info from knowledge base
    const knowledgeBase = PERMIT_KNOWLEDGE[workType] || {
      permitRequired: true,
      permitType: "Check with building department",
      typicalCost: "Varies",
      inspectionsRequired: ["Contact city for specifics"],
      commonRequirements: ["Contact building department to verify requirements"],
      investorTips: "When in doubt, call the building department before starting work.",
    };

    // Search DB for municipality-specific info
    const dbResults = await ctx.db
      .query("codeContent")
      .withSearchIndex("search_content", (q) =>
        q.search("content", `${workType} permit`).eq("municipality", municipality)
      )
      .take(3);

    // Get POS requirements for context
    const posReq = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", municipality.toUpperCase()))
      .first();

    // Build response
    return {
      workType,
      municipality,
      permitRequired: knowledgeBase.permitRequired,
      permitType: knowledgeBase.permitType,
      typicalCost: knowledgeBase.typicalCost,
      inspectionsRequired: knowledgeBase.inspectionsRequired,
      commonRequirements: knowledgeBase.commonRequirements,
      investorTips: knowledgeBase.investorTips,
      municipalitySpecific: dbResults.map(r => ({
        section: r.section,
        title: r.title,
        excerpt: r.content?.substring(0, 300),
        sourceUrl: r.sourceUrl,
      })),
      posRelevance: posReq ? {
        posRequired: posReq.posRequired,
        commonFailures: posReq.commonFailureItems,
        note: `${municipality} has POS inspection - unpermitted work will be flagged`,
      } : null,
      nextSteps: [
        `Contact ${municipality} Building Department to confirm requirements`,
        knowledgeBase.permitRequired ? "Apply for permit before starting work" : "Verify with city that no permit needed",
        "Get contractor quotes (use licensed contractor if required)",
        "Schedule inspections at each required stage",
      ],
    };
  },
});

// ===== COMPARE CODES ACROSS CITIES =====

export const compareCodes = query({
  args: {
    codeType: v.string(), // "zoning", "permits", "building"
    municipalities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const comparison: Record<string, any[]> = {};

    for (const muni of args.municipalities) {
      const codes = await ctx.db
        .query("codeContent")
        .withIndex("by_municipality_and_type", (q) =>
          q.eq("municipality", muni).eq("codeType", args.codeType)
        )
        .take(10);

      comparison[muni] = codes.map(c => ({
        section: c.section,
        title: c.title,
        summary: c.summary,
        investorNotes: c.investorNotes,
      }));
    }

    // Also get POS requirements for comparison
    const posComparison: Record<string, any> = {};
    for (const muni of args.municipalities) {
      const posReq = await ctx.db
        .query("posRequirements")
        .withIndex("by_city", (q) => q.eq("city", muni.toUpperCase()))
        .first();

      if (posReq) {
        posComparison[muni] = {
          posRequired: posReq.posRequired,
          cost: posReq.posCost,
          processingDays: posReq.avgProcessingDays,
          escrowRequired: posReq.escrowRequired,
        };
      }
    }

    return {
      codeType: args.codeType,
      municipalities: args.municipalities,
      comparison,
      posComparison,
      summary: `Comparing ${args.codeType} codes across ${args.municipalities.length} municipalities`,
    };
  },
});

// ===== ANSWER COMMON CODE QUESTIONS =====
// Maps common investor questions to relevant code sections

export const answerCodeQuestion = query({
  args: {
    question: v.string(),
    municipality: v.string(),
  },
  handler: async (ctx, args) => {
    const question = args.question.toLowerCase();
    const municipality = args.municipality;

    // Question patterns and what to search for
    const QUESTION_PATTERNS: {
      patterns: string[];
      searchTerms: string[];
      codeTypes: string[];
      directAnswer?: string;
    }[] = [
      {
        patterns: ["setback", "how close", "property line", "lot line"],
        searchTerms: ["setback", "yard requirement"],
        codeTypes: ["zoning"],
      },
      {
        patterns: ["permit", "do i need", "required"],
        searchTerms: ["permit required", "permit"],
        codeTypes: ["permits", "building"],
      },
      {
        patterns: ["height", "how tall", "maximum height"],
        searchTerms: ["height limit", "maximum height"],
        codeTypes: ["zoning", "building"],
      },
      {
        patterns: ["fence", "fencing"],
        searchTerms: ["fence", "fencing"],
        codeTypes: ["zoning"],
      },
      {
        patterns: ["adu", "accessory dwelling", "in-law", "granny flat"],
        searchTerms: ["accessory dwelling", "ADU"],
        codeTypes: ["zoning"],
      },
      {
        patterns: ["rental", "landlord", "tenant"],
        searchTerms: ["rental", "landlord tenant"],
        codeTypes: ["rental", "housing"],
      },
      {
        patterns: ["airbnb", "short-term", "vacation rental"],
        searchTerms: ["short-term rental", "transient"],
        codeTypes: ["zoning", "rental"],
      },
      {
        patterns: ["duplex", "two-family", "multi-family", "convert"],
        searchTerms: ["two-family", "multi-family", "duplex"],
        codeTypes: ["zoning"],
      },
      {
        patterns: ["parking", "driveway", "garage"],
        searchTerms: ["parking requirement", "off-street parking"],
        codeTypes: ["zoning"],
      },
      {
        patterns: ["fire", "smoke detector", "alarm"],
        searchTerms: ["smoke detector", "fire alarm", "fire code"],
        codeTypes: ["fire", "building"],
      },
    ];

    // Find matching pattern
    let matchedPattern = null;
    for (const pattern of QUESTION_PATTERNS) {
      if (pattern.patterns.some(p => question.includes(p))) {
        matchedPattern = pattern;
        break;
      }
    }

    // Search for relevant codes
    let searchResults: any[] = [];

    if (matchedPattern) {
      for (const term of matchedPattern.searchTerms) {
        const results = await ctx.db
          .query("codeContent")
          .withSearchIndex("search_content", (q) =>
            q.search("content", term).eq("municipality", municipality)
          )
          .take(3);

        searchResults = [...searchResults, ...results];
      }

      // Also search by code type
      for (const codeType of matchedPattern.codeTypes) {
        const typeResults = await ctx.db
          .query("codeContent")
          .withIndex("by_municipality_and_type", (q) =>
            q.eq("municipality", municipality).eq("codeType", codeType)
          )
          .take(3);

        searchResults = [...searchResults, ...typeResults];
      }
    } else {
      // Generic search
      searchResults = await ctx.db
        .query("codeContent")
        .withSearchIndex("search_content", (q) =>
          q.search("content", args.question).eq("municipality", municipality)
        )
        .take(5);
    }

    // Deduplicate
    const seen = new Set();
    const uniqueResults = searchResults.filter(r => {
      if (seen.has(r._id.toString())) return false;
      seen.add(r._id.toString());
      return true;
    });

    // Get POS info
    const posReq = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", municipality.toUpperCase()))
      .first();

    return {
      question: args.question,
      municipality,
      relevantCodes: uniqueResults.slice(0, 5).map(r => ({
        section: r.section,
        title: r.title,
        content: r.content,
        summary: r.summary,
        investorNotes: r.investorNotes,
        sourceUrl: r.sourceUrl,
        codeType: r.codeType,
      })),
      posInfo: posReq ? {
        posRequired: posReq.posRequired,
        investorNotes: posReq.investorNotes,
        contactPhone: posReq.contactPhone,
        contactWebsite: posReq.contactWebsite,
      } : null,
      searchStrategy: matchedPattern
        ? `Searched for: ${matchedPattern.searchTerms.join(", ")} in ${matchedPattern.codeTypes.join(", ")}`
        : "General search",
      recommendation: uniqueResults.length === 0
        ? `No specific code found for "${args.question}" in ${municipality}. Contact the building department directly.`
        : `Found ${uniqueResults.length} relevant code sections. Review the codes above and contact ${municipality} Building Department to confirm.`,
    };
  },
});

// ===== GET ALL CODE TYPES FOR A CITY =====

export const getCodeSummary = query({
  args: {
    municipality: v.string(),
  },
  handler: async (ctx, args) => {
    const allCodes = await ctx.db
      .query("codeContent")
      .withIndex("by_municipality", (q) => q.eq("municipality", args.municipality))
      .collect();

    // Group by code type
    const byType: Record<string, { count: number; sections: string[] }> = {};
    for (const code of allCodes) {
      if (!byType[code.codeType]) {
        byType[code.codeType] = { count: 0, sections: [] };
      }
      byType[code.codeType].count++;
      byType[code.codeType].sections.push(`${code.section}: ${code.title}`);
    }

    // Get POS info
    const posReq = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", args.municipality.toUpperCase()))
      .first();

    // Get contact info
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_city", (q) => q.eq("city", args.municipality.toUpperCase()))
      .first();

    return {
      municipality: args.municipality,
      totalCodeSections: allCodes.length,
      codeTypes: Object.entries(byType).map(([type, data]) => ({
        type,
        count: data.count,
        sections: data.sections.slice(0, 5),
      })),
      posRequirements: posReq ? {
        required: posReq.posRequired,
        cost: posReq.posCost,
        processingDays: posReq.avgProcessingDays,
        commonFailures: posReq.commonFailureItems,
        investorNotes: posReq.investorNotes,
      } : null,
      contact: contact || null,
      dataQuality: allCodes.length >= 10 ? "Good" : allCodes.length >= 5 ? "Partial" : "Limited",
    };
  },
});

// ===== COMPREHENSIVE COVERAGE VERIFICATION =====
// Check what's in the database for all areas

export const verifyCoverage = query({
  args: {},
  handler: async (ctx) => {
    // Get all code content
    const allCodes = await ctx.db.query("codeContent").collect();

    // Get all POS requirements
    const allPOS = await ctx.db.query("posRequirements").collect();

    // Group codes by municipality
    const byMunicipality: Record<string, { codeTypes: Set<string>; count: number }> = {};
    for (const code of allCodes) {
      if (!byMunicipality[code.municipality]) {
        byMunicipality[code.municipality] = { codeTypes: new Set(), count: 0 };
      }
      byMunicipality[code.municipality].codeTypes.add(code.codeType);
      byMunicipality[code.municipality].count++;
    }

    // Group codes by type
    const byCodeType: Record<string, number> = {};
    for (const code of allCodes) {
      byCodeType[code.codeType] = (byCodeType[code.codeType] || 0) + 1;
    }

    // Expected municipalities (59 + Ohio State + Cuyahoga County)
    const EXPECTED_MUNICIPALITIES = [
      "Ohio State", "Cuyahoga County", "Cleveland",
      "Parma", "Lakewood", "Euclid", "Cleveland Heights", "Parma Heights",
      "Shaker Heights", "Garfield Heights", "South Euclid", "Maple Heights",
      "North Olmsted", "Strongsville", "Westlake", "North Royalton", "Brunswick",
      "Solon", "Broadview Heights", "Bay Village", "Fairview Park", "Rocky River",
      "Lyndhurst", "Mayfield Heights", "University Heights", "Richmond Heights",
      "Bedford", "Bedford Heights", "Warrensville Heights", "East Cleveland",
      "Berea", "Middleburg Heights", "Brook Park", "Seven Hills", "Independence",
      "Brooklyn", "Olmsted Falls", "Highland Heights", "Mayfield Village",
      "Beachwood", "Pepper Pike", "Orange Village", "Moreland Hills",
      "Hunting Valley", "Gates Mills", "Chagrin Falls", "Bentleyville",
      "Bratenahl", "Woodmere", "Valley View", "Brooklyn Heights",
      "Cuyahoga Heights", "Glenwillow", "Linndale", "Newburgh Heights",
      "North Randall", "Highland Hills", "Oakwood Village", "Walton Hills",
      "Olmsted Township",
    ];

    // Check coverage
    const covered = Object.keys(byMunicipality);
    const missing = EXPECTED_MUNICIPALITIES.filter(m => !covered.includes(m));
    const unexpected = covered.filter(m => !EXPECTED_MUNICIPALITIES.includes(m));

    // Municipalities with limited data (< 3 code entries)
    const limited = Object.entries(byMunicipality)
      .filter(([_, data]) => data.count < 3)
      .map(([name, data]) => ({ name, count: data.count }));

    // Code type coverage
    const EXPECTED_CODE_TYPES = ["permits", "zoning", "rental", "fire", "building", "residential", "electrical", "plumbing", "mechanical", "investor-guide", "land-bank", "tax", "recording", "health"];
    const missingCodeTypes = EXPECTED_CODE_TYPES.filter(t => !byCodeType[t]);

    return {
      summary: {
        totalCodeEntries: allCodes.length,
        totalMunicipalitiesWithCodes: covered.length,
        expectedMunicipalities: EXPECTED_MUNICIPALITIES.length,
        posRequirementsCount: allPOS.length,
      },
      coverage: {
        ohioState: byMunicipality["Ohio State"] || { count: 0, codeTypes: [] },
        county: byMunicipality["Cuyahoga County"] || { count: 0, codeTypes: [] },
        cleveland: byMunicipality["Cleveland"] || { count: 0, codeTypes: [] },
      },
      codeTypeBreakdown: Object.entries(byCodeType).map(([type, count]) => ({ type, count })),
      issues: {
        missingMunicipalities: missing,
        unexpectedMunicipalities: unexpected,
        limitedCoverage: limited,
        missingCodeTypes: missingCodeTypes,
      },
      municipalityCoverage: Object.entries(byMunicipality)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20)
        .map(([name, data]) => ({
          name,
          count: data.count,
          codeTypes: Array.from(data.codeTypes),
        })),
      recommendations: [
        missing.length > 0 ? `Run seedAllMunicipalities:seedEverything to add ${missing.length} missing municipalities` : null,
        allPOS.length < 24 ? "Run seedData:seedPOSRequirements to add POS data for 24 cities" : null,
        allCodes.length < 100 ? "Run seedData:seedCodeContent to add detailed code content" : null,
        missingCodeTypes.length > 0 ? `Missing code types: ${missingCodeTypes.join(", ")}` : null,
      ].filter(Boolean),
    };
  },
});

// ===== INVESTOR CONTEXT QUERY =====
// Returns everything an investor needs to know about a city

export const getInvestorBriefing = query({
  args: {
    municipality: v.string(),
  },
  handler: async (ctx, args) => {
    const municipality = args.municipality;

    // Get all codes for this municipality
    const codes = await ctx.db
      .query("codeContent")
      .withIndex("by_municipality", (q) => q.eq("municipality", municipality))
      .collect();

    // Get POS requirements
    const posReq = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", municipality.toUpperCase()))
      .first();

    // Get Ohio State codes (always relevant)
    const stateCodes = await ctx.db
      .query("codeContent")
      .withIndex("by_municipality", (q) => q.eq("municipality", "Ohio State"))
      .collect();

    // Get county codes (always relevant)
    const countyCodes = await ctx.db
      .query("codeContent")
      .withIndex("by_municipality", (q) => q.eq("municipality", "Cuyahoga County"))
      .collect();

    // Organize by category
    const permits = codes.filter(c => c.codeType === "permits");
    const zoning = codes.filter(c => c.codeType === "zoning");
    const rental = codes.filter(c => c.codeType === "rental");
    const fire = codes.filter(c => c.codeType === "fire");
    const building = codes.filter(c => c.codeType === "building");

    // Extract key investor notes
    const investorNotes = codes
      .filter(c => c.investorNotes)
      .map(c => c.investorNotes);

    return {
      municipality,
      overview: {
        totalLocalCodes: codes.length,
        hasDetailedData: codes.length >= 5,
        posRequired: posReq?.posRequired ?? "Unknown",
        posCost: posReq?.posCost ?? "Unknown",
      },
      pointOfSale: posReq ? {
        required: posReq.posRequired,
        cost: posReq.posCost,
        processingDays: posReq.avgProcessingDays,
        escrowRequired: posReq.escrowRequired,
        escrowPercent: posReq.escrowPercent,
        commonFailures: posReq.commonFailureItems,
        investorAdvice: posReq.investorNotes,
        contactPhone: posReq.contactPhone,
        contactWebsite: posReq.contactWebsite,
      } : { message: "No POS data - check if this municipality requires POS inspection" },
      permits: permits.map(p => ({
        title: p.title,
        summary: p.summary,
        investorNotes: p.investorNotes,
      })),
      zoning: zoning.map(z => ({
        title: z.title,
        summary: z.summary,
        investorNotes: z.investorNotes,
      })),
      rentalRules: rental.length > 0 ? rental.map(r => ({
        title: r.title,
        summary: r.summary,
        investorNotes: r.investorNotes,
      })) : [{ message: "No specific rental registration info. Check with building department." }],
      fireAndSafety: fire.map(f => ({
        title: f.title,
        summary: f.summary,
      })),
      stateCodeHighlights: stateCodes.slice(0, 3).map(s => ({
        title: s.title,
        summary: s.summary,
        investorNotes: s.investorNotes,
      })),
      countyResources: countyCodes.map(c => ({
        title: c.title,
        summary: c.summary,
      })),
      keyInvestorTakeaways: investorNotes.slice(0, 5),
      quickReference: {
        posFee: posReq?.posCost ? `$${posReq.posCost}` : "Check with city",
        typicalPOSBudget: posReq?.posRequired ? "$2,000-$10,000 for repairs" : "N/A - No POS",
        processingTime: posReq?.avgProcessingDays ? `${posReq.avgProcessingDays} days` : "Unknown",
        rentalRegistration: rental.length > 0 ? "Required - see rental rules above" : "Check with city",
      },
    };
  },
});

// ===== QUICK ANSWER - Common Questions =====
// Super fast answers to common investor questions

export const quickAnswer = query({
  args: {
    question: v.string(),
    municipality: v.string(),
  },
  handler: async (ctx, args) => {
    const q = args.question.toLowerCase();
    const muni = args.municipality;

    // Get POS requirements for most questions
    const posReq = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", muni.toUpperCase()))
      .first();

    // Quick answers for common questions
    if (q.includes("pos") || q.includes("point of sale")) {
      return {
        answer: posReq
          ? `${muni}: POS ${posReq.posRequired ? `required ($${posReq.posCost}), ~${posReq.avgProcessingDays} days processing` : "NOT required"}`
          : `No POS data for ${muni}. Contact building department.`,
        details: posReq?.commonFailureItems || [],
        contact: posReq?.contactPhone || "Contact building department",
      };
    }

    if (q.includes("permit") && q.includes("roof")) {
      return {
        answer: `Roofing permits are REQUIRED in ${muni}. Typical fee: $75-150.`,
        details: ["Must use licensed contractor", "2 layer maximum", "Ice/water shield required"],
        tip: "Always pull permit - insurance claims require proof of permitted work.",
      };
    }

    if (q.includes("rental") || q.includes("landlord")) {
      const rental = await ctx.db
        .query("codeContent")
        .withIndex("by_municipality_and_type", (q) =>
          q.eq("municipality", muni).eq("codeType", "rental")
        )
        .first();

      return {
        answer: rental
          ? `${muni} has rental registration requirements. See details.`
          : `Check with ${muni} building department for rental requirements.`,
        details: rental?.summary || "Contact building department",
        contact: posReq?.contactPhone || "Contact building department",
      };
    }

    if (q.includes("adu") || q.includes("accessory dwelling") || q.includes("in-law")) {
      return {
        answer: `ADU rules vary by municipality. ${muni} requires zoning check.`,
        details: [
          "Most Ohio suburbs restrict ADUs",
          "Cleveland permits ADUs with owner occupancy",
          "Check local zoning code for specific rules",
        ],
        tip: "Contact zoning department before planning ADU.",
      };
    }

    if (q.includes("airbnb") || q.includes("short-term") || q.includes("vacation rental")) {
      return {
        answer: `Short-term rental rules vary. Some cities (Lakewood) prohibit, others (Cleveland) permit with restrictions.`,
        details: [
          "Cleveland: Permit required, 120-day limit non-owner-occupied",
          "Lakewood: Prohibited in residential zones",
          "Other cities: Check local ordinance",
        ],
        tip: "Verify STR rules BEFORE purchasing for Airbnb strategy.",
      };
    }

    // Generic fallback - search for answer
    const results = await ctx.db
      .query("codeContent")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.question).eq("municipality", muni)
      )
      .take(2);

    return {
      answer: results.length > 0
        ? `Found ${results.length} relevant code sections. See details.`
        : `No specific answer found. Contact ${muni} building department.`,
      details: results.map(r => r.summary || r.title),
      contact: posReq?.contactPhone || "Contact building department",
    };
  },
});
