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
