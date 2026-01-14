import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ===== PRE-FORECLOSURE TIMELINE CONSTANTS =====
// Based on Cuyahoga County foreclosure process

const STAGE_TIMELINE = {
  lis_pendens: { daysBeforeSale: 200, description: "Lis Pendens filed - lawsuit pending notice recorded" },
  complaint_filed: { daysBeforeSale: 190, description: "Complaint filed with court" },
  summons_served: { daysBeforeSale: 175, description: "Summons served to homeowner" },
  answer_deadline: { daysBeforeSale: 147, description: "28-day answer deadline" },
  default_motion: { daysBeforeSale: 120, description: "Motion for default judgment filed" },
  default_judgment: { daysBeforeSale: 100, description: "Default judgment granted" },
  decree_issued: { daysBeforeSale: 90, description: "Decree of foreclosure issued" },
  praecipe_filed: { daysBeforeSale: 80, description: "Praecipe filed, appraisal ordered" },
  appraisal: { daysBeforeSale: 60, description: "Property appraised" },
  advertising: { daysBeforeSale: 21, description: "3-week advertising period begins" },
  scheduled: { daysBeforeSale: 0, description: "Sheriff sale scheduled" },
  completed: { daysBeforeSale: -1, description: "Sale completed" },
  dismissed: { daysBeforeSale: -1, description: "Case dismissed" },
};

// Calculate urgency score (1-10) based on stage and days until sale
function calculateUrgencyScore(stage: string, daysUntilSale: number | null): number {
  if (stage === "dismissed" || stage === "completed") return 0;

  if (daysUntilSale !== null) {
    if (daysUntilSale <= 14) return 10;  // Imminent
    if (daysUntilSale <= 30) return 9;   // Very urgent
    if (daysUntilSale <= 60) return 8;   // Urgent
    if (daysUntilSale <= 90) return 7;   // High priority
    if (daysUntilSale <= 120) return 6;  // Medium-high
    if (daysUntilSale <= 150) return 5;  // Medium
    if (daysUntilSale <= 180) return 4;  // Early stage
    return 3;                             // Very early
  }

  // Fallback based on stage
  const stageScores: Record<string, number> = {
    lis_pendens: 3,
    complaint_filed: 3,
    summons_served: 4,
    answer_deadline: 5,
    default_motion: 6,
    default_judgment: 7,
    decree_issued: 7,
    praecipe_filed: 8,
    appraisal: 8,
    advertising: 9,
    scheduled: 10,
  };

  return stageScores[stage] || 5;
}

// Generate investor recommendation based on stage
function getRecommendation(stage: string, daysUntilSale: number | null, answerFiled: boolean | null): string {
  if (stage === "dismissed") return "Case dismissed - owner resolved the situation";
  if (stage === "completed") return "Sale completed - check sheriff sale results";

  if (answerFiled === false) {
    return "Owner did NOT respond to lawsuit - likely overwhelmed. Prime contact opportunity!";
  }

  if (daysUntilSale !== null) {
    if (daysUntilSale > 150) return "Early stage - owner may not realize urgency. Soft outreach recommended.";
    if (daysUntilSale > 90) return "Mid stage - owner facing reality. Good time for direct contact.";
    if (daysUntilSale > 30) return "Advanced stage - owner likely motivated. Make offers now.";
    return "URGENT - sale imminent. Last chance for pre-auction deal.";
  }

  return "Monitor case progress and contact homeowner.";
}

// ===== QUERIES =====

// Get pre-foreclosures by city (main query for LLM tool)
export const getPreForeclosuresByCity = query({
  args: {
    city: v.string(),
    stage: v.optional(v.string()),
    minUrgency: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const minUrgency = args.minUrgency || 1;

    let results = await ctx.db
      .query("preForeclosureEvents")
      .withIndex("by_city", (q) => q.eq("city", args.city.toUpperCase()))
      .collect();

    // Filter by stage if specified
    if (args.stage) {
      results = results.filter((r) => r.currentStage === args.stage);
    }

    // Filter by minimum urgency
    results = results.filter((r) => r.urgencyScore >= minUrgency);

    // Filter out completed/dismissed
    results = results.filter(
      (r) => r.currentStage !== "completed" && r.currentStage !== "dismissed"
    );

    // Sort by urgency (highest first)
    results.sort((a, b) => b.urgencyScore - a.urgencyScore);

    return results.slice(0, limit).map((r) => ({
      caseNumber: r.caseNumber,
      address: r.address,
      city: r.city,
      currentStage: r.currentStage,
      stageDescription: STAGE_TIMELINE[r.currentStage as keyof typeof STAGE_TIMELINE]?.description || r.currentStage,
      daysUntilSale: r.daysUntilSale,
      urgencyScore: r.urgencyScore,
      scheduledSaleDate: r.scheduledSaleDate,
      plaintiff: r.plaintiff,
      defendant: r.defendant,
      appraisedValue: r.appraisedValue,
      estimatedValue: r.estimatedValue,
      recommendation: r.recommendedAction || getRecommendation(r.currentStage, r.daysUntilSale || null, r.answerFiled ?? null),
      bestContactWindow: r.bestContactWindow,
      sourceUrl: r.sourceUrl,
      keyDates: {
        lisPendens: r.lisPendensDate,
        answerDeadline: r.answerDeadline,
        answerFiled: r.answerFiled,
        scheduledSale: r.scheduledSaleDate,
      },
    }));
  },
});

// Get all pre-foreclosures county-wide
export const getPreForeclosuresCountyWide = query({
  args: {
    stage: v.optional(v.string()),
    minUrgency: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const minUrgency = args.minUrgency || 1;

    let results = await ctx.db
      .query("preForeclosureEvents")
      .withIndex("by_urgency")
      .order("desc")
      .take(500); // Get more to filter

    // Filter by stage if specified
    if (args.stage) {
      results = results.filter((r) => r.currentStage === args.stage);
    }

    // Filter by minimum urgency
    results = results.filter((r) => r.urgencyScore >= minUrgency);

    // Filter out completed/dismissed
    results = results.filter(
      (r) => r.currentStage !== "completed" && r.currentStage !== "dismissed"
    );

    // Sort by urgency (highest first)
    results.sort((a, b) => b.urgencyScore - a.urgencyScore);

    // Group by city for summary
    const byCityCount: Record<string, number> = {};
    for (const r of results) {
      byCityCount[r.city] = (byCityCount[r.city] || 0) + 1;
    }

    return {
      totalCount: results.length,
      byCityCount,
      properties: results.slice(0, limit).map((r) => ({
        caseNumber: r.caseNumber,
        address: r.address,
        city: r.city,
        currentStage: r.currentStage,
        stageDescription: STAGE_TIMELINE[r.currentStage as keyof typeof STAGE_TIMELINE]?.description || r.currentStage,
        daysUntilSale: r.daysUntilSale,
        urgencyScore: r.urgencyScore,
        scheduledSaleDate: r.scheduledSaleDate,
        defendant: r.defendant,
        appraisedValue: r.appraisedValue,
        recommendation: r.recommendedAction || getRecommendation(r.currentStage, r.daysUntilSale || null, r.answerFiled ?? null),
      })),
    };
  },
});

// Get early-stage foreclosures (best leads - 4-6 months before sale)
export const getEarlyStageForeclosures = query({
  args: {
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const earlyStages = ["lis_pendens", "complaint_filed", "summons_served", "answer_deadline", "default_motion"];

    let results;
    if (args.city) {
      results = await ctx.db
        .query("preForeclosureEvents")
        .withIndex("by_city", (q) => q.eq("city", args.city!.toUpperCase()))
        .collect();
    } else {
      results = await ctx.db.query("preForeclosureEvents").collect();
    }

    // Filter for early stages only
    results = results.filter((r) => earlyStages.includes(r.currentStage));

    // Sort by days until sale (most time remaining first - these are the hidden gems)
    results.sort((a, b) => (b.daysUntilSale || 200) - (a.daysUntilSale || 200));

    return {
      message: "Early-stage foreclosures - contact these homeowners before other investors find them!",
      count: results.length,
      properties: results.slice(0, limit).map((r) => ({
        caseNumber: r.caseNumber,
        address: r.address,
        city: r.city,
        currentStage: r.currentStage,
        stageDescription: STAGE_TIMELINE[r.currentStage as keyof typeof STAGE_TIMELINE]?.description,
        daysUntilSale: r.daysUntilSale,
        estimatedTimeRemaining: r.daysUntilSale ? `~${Math.round(r.daysUntilSale / 30)} months` : "Unknown",
        defendant: r.defendant,
        answerFiled: r.answerFiled,
        investorTip: r.answerFiled === false
          ? "Owner did NOT respond to lawsuit - highly motivated!"
          : "Owner responded - may be fighting foreclosure",
        sourceUrl: r.sourceUrl,
      })),
    };
  },
});

// Get foreclosure timeline for a specific property
export const getForeclosureTimeline = query({
  args: {
    caseNumber: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let record = null;

    if (args.caseNumber) {
      record = await ctx.db
        .query("preForeclosureEvents")
        .withIndex("by_case_number", (q) => q.eq("caseNumber", args.caseNumber!))
        .first();
    } else if (args.address) {
      const results = await ctx.db
        .query("preForeclosureEvents")
        .withSearchIndex("search_address", (q) => q.search("address", args.address!))
        .take(1);
      record = results[0];
    }

    if (!record) {
      return { error: "No foreclosure case found for this property" };
    }

    // Build timeline
    const timeline: Array<{ date: string | null; event: string; status: string }> = [];

    if (record.lisPendensDate) {
      timeline.push({ date: record.lisPendensDate, event: "Lis Pendens Filed", status: "completed" });
    }
    if (record.complaintFiledDate) {
      timeline.push({ date: record.complaintFiledDate, event: "Complaint Filed", status: "completed" });
    }
    if (record.summonsServedDate) {
      timeline.push({ date: record.summonsServedDate, event: "Summons Served", status: "completed" });
    }
    if (record.answerDeadline) {
      timeline.push({
        date: record.answerDeadline,
        event: `Answer Deadline (${record.answerFiled ? "Owner Responded" : "NO RESPONSE"})`,
        status: "completed",
      });
    }
    if (record.defaultMotionDate) {
      timeline.push({ date: record.defaultMotionDate, event: "Motion for Default Judgment", status: "completed" });
    }
    if (record.defaultJudgmentDate) {
      timeline.push({ date: record.defaultJudgmentDate, event: "Default Judgment Granted", status: "completed" });
    }
    if (record.decreeDate) {
      timeline.push({ date: record.decreeDate, event: "Decree of Foreclosure", status: "completed" });
    }
    if (record.praecipeDate) {
      timeline.push({ date: record.praecipeDate, event: "Praecipe Filed ($500 deposit)", status: "completed" });
    }
    if (record.appraisalDate) {
      timeline.push({ date: record.appraisalDate, event: `Property Appraised ($${record.appraisedValue?.toLocaleString() || "Unknown"})`, status: "completed" });
    }
    if (record.advertisingStartDate) {
      timeline.push({ date: record.advertisingStartDate, event: "Advertising Started (3 weeks)", status: "completed" });
    }
    if (record.scheduledSaleDate) {
      const saleDate = new Date(record.scheduledSaleDate);
      const today = new Date();
      const isPast = saleDate < today;
      timeline.push({
        date: record.scheduledSaleDate,
        event: "Sheriff Sale",
        status: isPast ? "completed" : "upcoming",
      });
    }

    return {
      caseNumber: record.caseNumber,
      address: record.address,
      city: record.city,
      defendant: record.defendant,
      plaintiff: record.plaintiff,
      currentStage: record.currentStage,
      stageDescription: STAGE_TIMELINE[record.currentStage as keyof typeof STAGE_TIMELINE]?.description,
      urgencyScore: record.urgencyScore,
      daysUntilSale: record.daysUntilSale,
      appraisedValue: record.appraisedValue,
      timeline,
      investorAnalysis: {
        answerFiled: record.answerFiled,
        ownerMotivation: record.answerFiled === false ? "HIGH - owner not fighting" : "Medium - owner engaged",
        recommendation: getRecommendation(record.currentStage, record.daysUntilSale || null, record.answerFiled ?? null),
        bestAction: record.daysUntilSale && record.daysUntilSale > 60
          ? "Contact owner directly - offer to buy or help with short sale"
          : "Prepare for auction - research title and property condition",
      },
      sourceUrl: record.sourceUrl,
    };
  },
});

// Search pre-foreclosures by defendant name (find all properties for an owner)
export const searchByDefendant = query({
  args: {
    name: v.string(),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("preForeclosureEvents")
      .withSearchIndex("search_defendant", (q) => {
        let search = q.search("defendant", args.name);
        if (args.city) search = search.eq("city", args.city.toUpperCase());
        return search;
      })
      .take(20);

    return results.map((r) => ({
      caseNumber: r.caseNumber,
      address: r.address,
      city: r.city,
      defendant: r.defendant,
      currentStage: r.currentStage,
      urgencyScore: r.urgencyScore,
      scheduledSaleDate: r.scheduledSaleDate,
    }));
  },
});

// Get summary stats for pre-foreclosures
export const getPreForeclosureStats = query({
  args: {
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.city) {
      results = await ctx.db
        .query("preForeclosureEvents")
        .withIndex("by_city", (q) => q.eq("city", args.city!.toUpperCase()))
        .collect();
    } else {
      results = await ctx.db.query("preForeclosureEvents").collect();
    }

    // Filter out completed/dismissed
    const active = results.filter(
      (r) => r.currentStage !== "completed" && r.currentStage !== "dismissed"
    );

    // Group by stage
    const byStage: Record<string, number> = {};
    for (const r of active) {
      byStage[r.currentStage] = (byStage[r.currentStage] || 0) + 1;
    }

    // Group by urgency level
    const byUrgency = {
      critical: active.filter((r) => r.urgencyScore >= 9).length,
      high: active.filter((r) => r.urgencyScore >= 7 && r.urgencyScore < 9).length,
      medium: active.filter((r) => r.urgencyScore >= 5 && r.urgencyScore < 7).length,
      low: active.filter((r) => r.urgencyScore < 5).length,
    };

    // Group by city (if county-wide)
    const byCity: Record<string, number> = {};
    if (!args.city) {
      for (const r of active) {
        byCity[r.city] = (byCity[r.city] || 0) + 1;
      }
    }

    return {
      city: args.city || "Cuyahoga County",
      totalActive: active.length,
      byStage,
      byUrgency,
      byCity: args.city ? undefined : byCity,
      investorInsight: `${byUrgency.critical + byUrgency.high} properties need immediate attention. ${active.filter((r) => r.answerFiled === false).length} owners did NOT respond to lawsuit (highly motivated).`,
    };
  },
});

// ===== MUTATIONS =====

// Insert or update a pre-foreclosure event
export const upsertPreForeclosure = mutation({
  args: {
    caseNumber: v.string(),
    parcelId: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    zipCode: v.optional(v.string()),
    lisPendensDate: v.optional(v.string()),
    complaintFiledDate: v.optional(v.string()),
    summonsServedDate: v.optional(v.string()),
    answerDeadline: v.optional(v.string()),
    answerFiled: v.optional(v.boolean()),
    defaultMotionDate: v.optional(v.string()),
    defaultJudgmentDate: v.optional(v.string()),
    decreeDate: v.optional(v.string()),
    praecipeDate: v.optional(v.string()),
    appraisalDate: v.optional(v.string()),
    appraisedValue: v.optional(v.number()),
    advertisingStartDate: v.optional(v.string()),
    scheduledSaleDate: v.optional(v.string()),
    currentStage: v.string(),
    plaintiff: v.optional(v.string()),
    plaintiffAttorney: v.optional(v.string()),
    defendant: v.optional(v.string()),
    propertyType: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    totalOwed: v.optional(v.number()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate days until sale
    let daysUntilSale: number | undefined;
    if (args.scheduledSaleDate) {
      const saleDate = new Date(args.scheduledSaleDate);
      const today = new Date();
      daysUntilSale = Math.ceil((saleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate urgency score
    const urgencyScore = calculateUrgencyScore(args.currentStage, daysUntilSale || null);

    // Calculate days since filing
    let daysSinceFiling: number | undefined;
    const filingDate = args.lisPendensDate || args.complaintFiledDate;
    if (filingDate) {
      const filed = new Date(filingDate);
      const today = new Date();
      daysSinceFiling = Math.ceil((today.getTime() - filed.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Generate recommendation
    const recommendedAction = getRecommendation(args.currentStage, daysUntilSale || null, args.answerFiled ?? null);

    // Calculate equity estimate
    let equityEstimate: number | undefined;
    if (args.estimatedValue && args.totalOwed) {
      equityEstimate = args.estimatedValue - args.totalOwed;
    }

    // Best contact window
    let bestContactWindow: string | undefined;
    if (daysUntilSale) {
      if (daysUntilSale > 90) bestContactWindow = `${Math.round(daysUntilSale / 30)} months until sale - plenty of time`;
      else if (daysUntilSale > 30) bestContactWindow = `${daysUntilSale} days until sale - act soon`;
      else bestContactWindow = `URGENT: Only ${daysUntilSale} days until sale`;
    }

    // Check if exists
    const existing = await ctx.db
      .query("preForeclosureEvents")
      .withIndex("by_case_number", (q) => q.eq("caseNumber", args.caseNumber))
      .first();

    const data = {
      ...args,
      city: args.city.toUpperCase(),
      currentStage: args.currentStage as any,
      daysUntilSale,
      daysSinceFiling,
      urgencyScore,
      equityEstimate,
      recommendedAction,
      bestContactWindow,
      lastScrapedDate: new Date().toISOString(),
      lastUpdated: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("preForeclosureEvents", data);
  },
});

// Bulk insert pre-foreclosure events (for scraper)
export const bulkInsertPreForeclosures = mutation({
  args: {
    events: v.array(
      v.object({
        caseNumber: v.string(),
        address: v.string(),
        city: v.string(),
        currentStage: v.string(),
        lisPendensDate: v.optional(v.string()),
        scheduledSaleDate: v.optional(v.string()),
        defendant: v.optional(v.string()),
        plaintiff: v.optional(v.string()),
        answerFiled: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const event of args.events) {
      // Calculate urgency
      let daysUntilSale: number | undefined;
      if (event.scheduledSaleDate) {
        const saleDate = new Date(event.scheduledSaleDate);
        const today = new Date();
        daysUntilSale = Math.ceil((saleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      const urgencyScore = calculateUrgencyScore(event.currentStage, daysUntilSale || null);

      const existing = await ctx.db
        .query("preForeclosureEvents")
        .withIndex("by_case_number", (q) => q.eq("caseNumber", event.caseNumber))
        .first();

      const data = {
        ...event,
        city: event.city.toUpperCase(),
        currentStage: event.currentStage as any,
        daysUntilSale,
        urgencyScore,
        recommendedAction: getRecommendation(event.currentStage, daysUntilSale || null, event.answerFiled ?? null),
        lastUpdated: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
        updated++;
      } else {
        await ctx.db.insert("preForeclosureEvents", data);
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// Mark a case as dismissed (owner saved it)
export const markCaseDismissed = mutation({
  args: { caseNumber: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("preForeclosureEvents")
      .withIndex("by_case_number", (q) => q.eq("caseNumber", args.caseNumber))
      .first();

    if (!existing) return { error: "Case not found" };

    await ctx.db.patch(existing._id, {
      currentStage: "dismissed",
      urgencyScore: 0,
      recommendedAction: "Case dismissed - owner resolved the foreclosure",
      lastUpdated: Date.now(),
    });

    return { success: true };
  },
});

// Mark a case as completed (sale occurred)
export const markSaleCompleted = mutation({
  args: {
    caseNumber: v.string(),
    salePrice: v.optional(v.number()),
    purchaser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("preForeclosureEvents")
      .withIndex("by_case_number", (q) => q.eq("caseNumber", args.caseNumber))
      .first();

    if (!existing) return { error: "Case not found" };

    await ctx.db.patch(existing._id, {
      currentStage: "completed",
      urgencyScore: 0,
      investorNotes: args.salePrice
        ? `Sold for $${args.salePrice.toLocaleString()}${args.purchaser ? ` to ${args.purchaser}` : ""}`
        : "Sale completed",
      lastUpdated: Date.now(),
    });

    return { success: true };
  },
});
