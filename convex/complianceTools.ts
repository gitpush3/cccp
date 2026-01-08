import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ===== CODE VIOLATIONS QUERIES =====

// Get violations for a property
export const getViolationsByAddress = query({
  args: {
    address: v.string(),
    city: v.optional(v.string()),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let violations = await ctx.db
      .query("codeViolations")
      .withSearchIndex("search_address", (q) => {
        let search = q.search("address", args.address);
        if (args.city) search = search.eq("city", args.city.toUpperCase());
        return search;
      })
      .take(50);

    if (!args.includeResolved) {
      violations = violations.filter(v =>
        v.status === "open" || v.status === "in_progress" || v.status === "hearing_scheduled"
      );
    }

    return violations;
  },
});

// Get violations by parcel ID
export const getViolationsByParcel = query({
  args: { parcelId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("codeViolations")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .collect();
  },
});

// Get violations by city (for market analysis)
export const getViolationsByCity = query({
  args: {
    city: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    let violations = await ctx.db
      .query("codeViolations")
      .withIndex("by_city", (q) => q.eq("city", args.city.toUpperCase()))
      .take(limit * 2);

    if (args.status) {
      violations = violations.filter(v => v.status === args.status);
    }

    return violations.slice(0, limit);
  },
});

// Calculate compliance risk score for a property
export const getComplianceRisk = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    // Find the property
    const parcels = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const parcel = parcels[0];
    if (!parcel) {
      return { error: "Property not found" };
    }

    // Get violations
    const violations = parcel.parcelId
      ? await ctx.db
          .query("codeViolations")
          .withIndex("by_parcel_id", (q) => q.eq("parcelId", parcel.parcelId))
          .collect()
      : [];

    const openViolations = violations.filter(v =>
      v.status === "open" || v.status === "in_progress" || v.status === "hearing_scheduled"
    );

    // Get building permits
    const permits = parcel.parcelId
      ? await ctx.db
          .query("buildingPermits")
          .withIndex("by_parcel_id", (q) => q.eq("parcelId", parcel.parcelId))
          .collect()
      : [];

    // Get POS requirements for this city
    const posReq = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", parcel.city))
      .first();

    // Calculate risk score (0-10, higher = more risk)
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Open violations add to risk
    if (openViolations.length > 0) {
      riskScore += Math.min(openViolations.length * 1.5, 4);
      riskFactors.push(`${openViolations.length} open code violations`);
    }

    // Critical violations add more
    const criticalViolations = openViolations.filter(v => v.severity === "critical");
    if (criticalViolations.length > 0) {
      riskScore += criticalViolations.length;
      riskFactors.push(`${criticalViolations.length} critical violations`);
    }

    // Liens from violations
    const lienViolations = violations.filter(v => v.status === "lien_placed");
    if (lienViolations.length > 0) {
      riskScore += 2;
      riskFactors.push(`${lienViolations.length} violation liens on property`);
    }

    // Check for unpermitted work indicators
    const unpermittedIndicators: string[] = [];

    // No permits but has renovations (check for high value discrepancy)
    if (permits.length === 0 && parcel.certifiedTaxBuilding && parcel.certifiedTaxBuilding > 50000) {
      const recentRoofPermit = permits.find(p =>
        p.permitType === "roofing" &&
        p.issueDate &&
        parseInt(p.issueDate.substring(0, 4)) >= 2015
      );
      if (!recentRoofPermit) {
        unpermittedIndicators.push("No roofing permits in 10+ years on older home");
      }
    }

    if (unpermittedIndicators.length > 0) {
      riskScore += 1;
      riskFactors.push("Possible unpermitted work detected");
    }

    // Estimate compliance cost
    let estimatedComplianceCost = 0;
    for (const v of openViolations) {
      if (v.severity === "critical") estimatedComplianceCost += 5000;
      else if (v.severity === "major") estimatedComplianceCost += 2000;
      else estimatedComplianceCost += 500;

      if (v.fineAmount) estimatedComplianceCost += v.fineAmount;
    }

    // Get neighborhood violation rate
    const neighborhoodViolations = await ctx.db
      .query("codeViolations")
      .withIndex("by_city", (q) => q.eq("city", parcel.city))
      .take(500);

    const openInNeighborhood = neighborhoodViolations.filter(v => v.status === "open").length;
    const violationRate = openInNeighborhood > 100 ? "high" : openInNeighborhood > 50 ? "medium" : "low";

    riskScore = Math.min(Math.round(riskScore * 10) / 10, 10);

    return {
      property: {
        address: parcel.fullAddress,
        parcelId: parcel.parcelId,
        city: parcel.city,
      },
      riskScore,
      riskLevel: riskScore >= 7 ? "High" : riskScore >= 4 ? "Medium" : "Low",
      riskFactors,
      violations: {
        open: openViolations.map(v => ({
          type: v.violationType,
          description: v.violationDescription,
          severity: v.severity,
          status: v.status,
          issuedDate: v.issuedDate,
          dueDate: v.dueDate,
          fineAmount: v.fineAmount,
        })),
        historical: violations.length - openViolations.length,
        lienPlaced: lienViolations.length > 0,
      },
      unpermittedWork: {
        indicators: unpermittedIndicators,
        confidence: unpermittedIndicators.length > 0 ? "medium" : "none",
      },
      permits: {
        count: permits.length,
        recent: permits.filter(p =>
          p.issueDate && parseInt(p.issueDate.substring(0, 4)) >= 2020
        ).length,
        types: [...new Set(permits.map(p => p.permitType))],
      },
      posRequirements: posReq ? {
        required: posReq.posRequired,
        cost: posReq.posCost,
        avgProcessingDays: posReq.avgProcessingDays,
        commonFailures: posReq.commonFailureItems,
      } : null,
      neighborhoodContext: {
        violationRate,
        investorNotes: violationRate === "high"
          ? "High enforcement area - expect strict inspections"
          : violationRate === "medium"
          ? "Moderate enforcement - standard inspections"
          : "Low enforcement area",
      },
      estimatedComplianceCost,
      investorRecommendation: riskScore >= 7
        ? "Significant compliance issues - factor into offer price or walk away"
        : riskScore >= 4
        ? "Some compliance issues - budget for repairs and delays"
        : "Low compliance risk - standard due diligence recommended",
    };
  },
});

// ===== POINT OF SALE REQUIREMENTS =====

export const getPOSRequirements = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    const posReq = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", args.city.toUpperCase()))
      .first();

    if (!posReq) {
      // Return default info if not in database
      return {
        city: args.city,
        posRequired: null,
        message: "POS requirements not yet loaded for this city. Contact the building department directly.",
        recommendation: "Call the building department before closing to confirm requirements.",
      };
    }

    return {
      city: posReq.city,
      posRequired: posReq.posRequired,
      details: {
        cost: posReq.posCost,
        inspectionType: posReq.inspectionType,
        avgProcessingDays: posReq.avgProcessingDays,
        escrowRequired: posReq.escrowRequired,
        escrowPercent: posReq.escrowPercent,
        transferRestrictions: posReq.transferRestrictions,
      },
      commonFailures: posReq.commonFailureItems,
      investorNotes: posReq.investorNotes,
      contact: {
        phone: posReq.contactPhone,
        website: posReq.contactWebsite,
      },
    };
  },
});

// Get permit history for a property
export const getPermitHistory = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    // Find the property
    const parcels = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const parcel = parcels[0];
    if (!parcel) {
      return { error: "Property not found" };
    }

    // Get permits
    const permits = parcel.parcelId
      ? await ctx.db
          .query("buildingPermits")
          .withIndex("by_parcel_id", (q) => q.eq("parcelId", parcel.parcelId))
          .collect()
      : [];

    // Sort by date
    permits.sort((a, b) => (b.issueDate || "").localeCompare(a.issueDate || ""));

    // Analyze for unpermitted work
    const unpermittedIndicators: { indicator: string; confidence: string }[] = [];

    // Check property age vs permit history
    const hasRoofingPermit = permits.some(p => p.permitType === "roofing");
    const hasHVACPermit = permits.some(p => p.permitType === "hvac");

    if (!hasRoofingPermit && parcel.parcelYear && parcel.parcelYear < 2000) {
      unpermittedIndicators.push({
        indicator: "No roofing permits found for 25+ year old property",
        confidence: "medium",
      });
    }

    if (!hasHVACPermit && parcel.parcelYear && parcel.parcelYear < 1990) {
      unpermittedIndicators.push({
        indicator: "No HVAC permits found - system likely replaced without permit",
        confidence: "medium",
      });
    }

    // Check for renovation permits if assessed value increased significantly
    const hasRenovationPermit = permits.some(p =>
      p.permitType === "renovation" || p.permitType === "new_construction"
    );

    if (!hasRenovationPermit && parcel.certifiedTaxBuilding && parcel.certifiedTaxBuilding > 100000) {
      unpermittedIndicators.push({
        indicator: "High building value with no major renovation permits on file",
        confidence: "low",
      });
    }

    // Count open vs completed
    const openPermits = permits.filter(p =>
      p.status === "applied" || p.status === "approved" || p.status === "issued"
    );
    const expiredPermits = permits.filter(p => p.status === "expired");

    return {
      property: {
        address: parcel.fullAddress,
        parcelId: parcel.parcelId,
        yearBuilt: parcel.parcelYear,
        city: parcel.city,
      },
      permits: permits.map(p => ({
        permitNumber: p.permitNumber,
        type: p.permitType,
        description: p.workDescription,
        status: p.status,
        issueDate: p.issueDate,
        expirationDate: p.expirationDate,
        estimatedValue: p.estimatedValue,
        contractor: p.contractor,
      })),
      summary: {
        totalPermits: permits.length,
        openPermits: openPermits.length,
        expiredPermits: expiredPermits.length,
        permitTypes: [...new Set(permits.map(p => p.permitType))],
      },
      unpermittedWorkIndicators: unpermittedIndicators,
      investorWarning: unpermittedIndicators.length > 0
        ? "Possible unpermitted work detected. May need to disclose or remediate before sale."
        : openPermits.length > 0
        ? "Open permits found - verify work completion before closing."
        : expiredPermits.length > 0
        ? "Expired permits found - may need to re-permit or obtain final inspection."
        : null,
    };
  },
});

// Verify zoning for intended use
export const verifyZoning = query({
  args: {
    address: v.string(),
    intendedUse: v.string(), // sfr, duplex, triplex, fourplex, airbnb, commercial
  },
  handler: async (ctx, args) => {
    // Find the property
    const parcels = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const parcel = parcels[0];
    if (!parcel) {
      return { error: "Property not found" };
    }

    const currentZoning = parcel.zoningCode || "Unknown";
    const currentUse = parcel.zoningUse || parcel.taxLucDescription;

    // Zoning compatibility matrix (simplified)
    const zoningRules: Record<string, { allows: string[]; conditional: string[]; prohibited: string[] }> = {
      "R-1": { allows: ["sfr"], conditional: ["airbnb"], prohibited: ["duplex", "triplex", "fourplex", "commercial"] },
      "R-2": { allows: ["sfr", "duplex"], conditional: ["airbnb"], prohibited: ["triplex", "fourplex", "commercial"] },
      "R-3": { allows: ["sfr", "duplex", "triplex", "fourplex"], conditional: ["airbnb"], prohibited: ["commercial"] },
      "R-4": { allows: ["sfr", "duplex", "triplex", "fourplex"], conditional: ["airbnb", "commercial"], prohibited: [] },
      "C-1": { allows: ["sfr", "commercial"], conditional: ["duplex", "airbnb"], prohibited: [] },
      "C-2": { allows: ["sfr", "duplex", "triplex", "fourplex", "commercial", "airbnb"], conditional: [], prohibited: [] },
      "M-1": { allows: ["commercial"], conditional: [], prohibited: ["sfr", "duplex", "triplex", "fourplex", "airbnb"] },
    };

    // Try to match zoning
    let rules = null;
    for (const [zone, r] of Object.entries(zoningRules)) {
      if (currentZoning.toUpperCase().includes(zone)) {
        rules = r;
        break;
      }
    }

    let allowed = false;
    let conditional = false;
    let varianceRequired = false;
    let notes = "";

    if (rules) {
      if (rules.allows.includes(args.intendedUse)) {
        allowed = true;
        notes = `${args.intendedUse} is permitted by-right in ${currentZoning} zoning`;
      } else if (rules.conditional.includes(args.intendedUse)) {
        conditional = true;
        notes = `${args.intendedUse} may be allowed with conditional use permit in ${currentZoning}`;
      } else if (rules.prohibited.includes(args.intendedUse)) {
        varianceRequired = true;
        notes = `${args.intendedUse} is not permitted in ${currentZoning} - variance required`;
      }
    } else {
      notes = `Zoning code ${currentZoning} not in database - verify with city planning department`;
    }

    // Get code content for this city's zoning
    const zoningContent = await ctx.db
      .query("codeContent")
      .withIndex("by_municipality_and_type", (q) =>
        q.eq("municipality", parcel.city).eq("codeType", "zoning")
      )
      .take(5);

    return {
      property: {
        address: parcel.fullAddress,
        parcelId: parcel.parcelId,
        city: parcel.city,
      },
      currentZoning: {
        code: currentZoning,
        description: currentUse,
        propertyClass: parcel.propertyClass,
        landUseCode: parcel.taxLuc,
      },
      intendedUse: args.intendedUse,
      analysis: {
        allowed,
        conditionalUseRequired: conditional,
        varianceRequired,
        notes,
      },
      zoningInfo: zoningContent.map(z => ({
        section: z.section,
        title: z.title,
        summary: z.summary,
      })),
      nextSteps: varianceRequired
        ? [
            "Contact city planning department for variance application",
            "Expect 60-90 day process",
            "May require public hearing",
            "Success not guaranteed - consider alternative properties",
          ]
        : conditional
        ? [
            "Apply for conditional use permit",
            "Review specific conditions with planning department",
            "May have restrictions on operation",
          ]
        : allowed
        ? [
            "Zoning allows intended use",
            "Verify with building department for any additional requirements",
            "Obtain necessary permits before starting work",
          ]
        : [
            "Verify zoning requirements with city planning department",
            `Contact: ${parcel.city} Building Department`,
          ],
    };
  },
});

// ===== DATA IMPORT MUTATIONS =====

export const insertCodeViolation = mutation({
  args: {
    parcelId: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    zipCode: v.optional(v.string()),
    violationType: v.string(),
    violationCode: v.optional(v.string()),
    violationDescription: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("critical")),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("corrected"),
      v.literal("hearing_scheduled"),
      v.literal("lien_placed"),
      v.literal("closed")
    ),
    issuedDate: v.string(),
    dueDate: v.optional(v.string()),
    closedDate: v.optional(v.string()),
    fineAmount: v.optional(v.number()),
    inspectorNotes: v.optional(v.string()),
    caseNumber: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if exists by case number
    if (args.caseNumber) {
      const existing = await ctx.db
        .query("codeViolations")
        .filter((q) => q.eq(q.field("caseNumber"), args.caseNumber))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...args, lastUpdated: Date.now() });
        return existing._id;
      }
    }

    return await ctx.db.insert("codeViolations", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

export const insertPOSRequirement = mutation({
  args: {
    city: v.string(),
    posRequired: v.boolean(),
    posCost: v.optional(v.number()),
    inspectionType: v.optional(v.string()),
    avgProcessingDays: v.optional(v.number()),
    escrowRequired: v.optional(v.boolean()),
    escrowPercent: v.optional(v.number()),
    transferRestrictions: v.optional(v.string()),
    commonFailureItems: v.optional(v.array(v.string())),
    investorNotes: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactWebsite: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", args.city.toUpperCase()))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        city: args.city.toUpperCase(),
        lastUpdated: Date.now()
      });
      return existing._id;
    }

    return await ctx.db.insert("posRequirements", {
      ...args,
      city: args.city.toUpperCase(),
      lastUpdated: Date.now(),
    });
  },
});

// ===== PRE-INSPECTION CHECKLIST GENERATOR =====
// This is the killer feature for someone with an inspector coming next week

export const generatePreInspectionChecklist = query({
  args: {
    address: v.string(),
    city: v.optional(v.string()),
    inspectionType: v.optional(v.string()), // "pos", "rental_registration", "general"
  },
  handler: async (ctx, args) => {
    // Find the property
    const parcels = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const parcel = parcels[0];
    const city = args.city?.toUpperCase() || parcel?.city || "UNKNOWN";

    // Get POS requirements for this city
    const posReq = await ctx.db
      .query("posRequirements")
      .withIndex("by_city", (q) => q.eq("city", city))
      .first();

    // Get any existing violations for this property
    let existingViolations: any[] = [];
    if (parcel?.parcelId) {
      existingViolations = await ctx.db
        .query("codeViolations")
        .withIndex("by_parcel_id", (q) => q.eq("parcelId", parcel.parcelId))
        .collect();
    }

    const openViolations = existingViolations.filter(v =>
      v.status === "open" || v.status === "in_progress"
    );

    // Master checklist items with repair costs
    const CHECKLIST_ITEMS = [
      // SAFETY - Always checked first
      {
        category: "Safety - Critical",
        item: "Smoke detectors in all bedrooms and hallways",
        costLow: 15, costHigh: 30, perUnit: "each",
        diy: true, priority: 1,
        notes: "Hardwired preferred in some cities. Replace batteries first."
      },
      {
        category: "Safety - Critical",
        item: "Carbon monoxide detectors (if gas appliances)",
        costLow: 20, costHigh: 40, perUnit: "each",
        diy: true, priority: 1,
        notes: "Required within 10 feet of sleeping areas"
      },
      {
        category: "Safety - Critical",
        item: "GFCI outlets in kitchen, bathroom, basement, garage",
        costLow: 15, costHigh: 25, perUnit: "each",
        diy: false, priority: 1,
        notes: "Most common fail item. Test with GFCI tester."
      },
      {
        category: "Safety - Critical",
        item: "Handrails on all stairs (3+ steps)",
        costLow: 50, costHigh: 200, perUnit: "per staircase",
        diy: true, priority: 1,
        notes: "Must be graspable, 34-38 inches high, return to wall"
      },
      {
        category: "Safety - Critical",
        item: "Guardrails on porches/decks over 30 inches",
        costLow: 200, costHigh: 800, perUnit: "per area",
        diy: false, priority: 1,
        notes: "42 inch height, 4 inch max gap between balusters"
      },

      // ELECTRICAL
      {
        category: "Electrical",
        item: "No exposed wiring or junction boxes",
        costLow: 50, costHigh: 150, perUnit: "per repair",
        diy: false, priority: 2,
        notes: "Cover plates on all boxes, no wire nuts visible"
      },
      {
        category: "Electrical",
        item: "All outlets and switches functional",
        costLow: 10, costHigh: 25, perUnit: "each",
        diy: false, priority: 2,
        notes: "Test every outlet, check for reverse polarity"
      },
      {
        category: "Electrical",
        item: "Panel box properly labeled and accessible",
        costLow: 0, costHigh: 50, perUnit: "one-time",
        diy: true, priority: 2,
        notes: "30 inches clearance, all breakers labeled"
      },
      {
        category: "Electrical",
        item: "No double-tapped breakers",
        costLow: 100, costHigh: 300, perUnit: "per repair",
        diy: false, priority: 2,
        notes: "One wire per breaker unless rated for two"
      },

      // PLUMBING
      {
        category: "Plumbing",
        item: "No active leaks under sinks or at fixtures",
        costLow: 50, costHigh: 200, perUnit: "per repair",
        diy: true, priority: 2,
        notes: "Check all supply and drain lines"
      },
      {
        category: "Plumbing",
        item: "Hot water at all fixtures",
        costLow: 0, costHigh: 100, perUnit: "varies",
        diy: true, priority: 2,
        notes: "120°F max for safety, check water heater temp"
      },
      {
        category: "Plumbing",
        item: "Water heater strapped (seismic) and vented properly",
        costLow: 30, costHigh: 100, perUnit: "one-time",
        diy: true, priority: 2,
        notes: "Double straps required, proper flue clearance"
      },
      {
        category: "Plumbing",
        item: "Toilets secure and not leaking at base",
        costLow: 10, costHigh: 50, perUnit: "each",
        diy: true, priority: 3,
        notes: "Replace wax ring if rocking or water stains"
      },

      // HVAC
      {
        category: "HVAC",
        item: "Furnace operational with clean filter",
        costLow: 5, costHigh: 30, perUnit: "filter",
        diy: true, priority: 2,
        notes: "Test heating, check for gas smells"
      },
      {
        category: "HVAC",
        item: "Furnace flue properly connected and sealed",
        costLow: 50, costHigh: 200, perUnit: "per repair",
        diy: false, priority: 1,
        notes: "CO hazard if disconnected or leaking"
      },
      {
        category: "HVAC",
        item: "AC operational (if present)",
        costLow: 100, costHigh: 400, perUnit: "service call",
        diy: false, priority: 3,
        notes: "Check both cooling and fan operation"
      },

      // STRUCTURE/EXTERIOR
      {
        category: "Exterior",
        item: "No peeling/chipping paint (lead hazard pre-1978)",
        costLow: 500, costHigh: 3000, perUnit: "varies",
        diy: false, priority: 2,
        notes: "Lead-safe work practices required for pre-1978"
      },
      {
        category: "Exterior",
        item: "Windows operational and not broken",
        costLow: 100, costHigh: 400, perUnit: "per window",
        diy: true, priority: 3,
        notes: "Egress windows must open, screens intact"
      },
      {
        category: "Exterior",
        item: "Roof in serviceable condition",
        costLow: 200, costHigh: 1000, perUnit: "repair",
        diy: false, priority: 3,
        notes: "No active leaks, look for stains inside"
      },
      {
        category: "Exterior",
        item: "Gutters and downspouts attached, directing water away",
        costLow: 100, costHigh: 300, perUnit: "repair",
        diy: true, priority: 3,
        notes: "Extend downspouts 4+ feet from foundation"
      },
      {
        category: "Exterior",
        item: "Foundation visible and no major cracks",
        costLow: 200, costHigh: 2000, perUnit: "varies",
        diy: false, priority: 2,
        notes: "Horizontal cracks are serious, vertical less so"
      },
      {
        category: "Exterior",
        item: "Walkways and steps in safe condition",
        costLow: 100, costHigh: 500, perUnit: "per area",
        diy: true, priority: 2,
        notes: "No trip hazards, must be stable"
      },

      // INTERIOR
      {
        category: "Interior",
        item: "All doors open/close/latch properly",
        costLow: 20, costHigh: 100, perUnit: "per door",
        diy: true, priority: 3,
        notes: "Bedroom doors must latch for fire safety"
      },
      {
        category: "Interior",
        item: "No holes in walls/ceilings",
        costLow: 20, costHigh: 100, perUnit: "per repair",
        diy: true, priority: 3,
        notes: "Patch and paint as needed"
      },
      {
        category: "Interior",
        item: "No signs of mold or water damage",
        costLow: 500, costHigh: 5000, perUnit: "varies",
        diy: false, priority: 1,
        notes: "Address source first, then remediate"
      },
      {
        category: "Interior",
        item: "Basement dry and no standing water",
        costLow: 200, costHigh: 2000, perUnit: "varies",
        diy: false, priority: 2,
        notes: "Check sump pump operation if present"
      },

      // EGRESS
      {
        category: "Egress/Safety",
        item: "Bedroom windows meet egress requirements",
        costLow: 300, costHigh: 1500, perUnit: "per window",
        diy: false, priority: 1,
        notes: "20 inch width, 24 inch height min openings"
      },
      {
        category: "Egress/Safety",
        item: "Basement bedrooms have proper egress",
        costLow: 2000, costHigh: 6000, perUnit: "per window",
        diy: false, priority: 1,
        notes: "Egress window or door required for legal bedroom"
      },
    ];

    // Build checklist based on city requirements
    let checklistItems = [...CHECKLIST_ITEMS];

    // Add city-specific items
    if (posReq?.commonFailureItems) {
      const citySpecificItems = posReq.commonFailureItems.map((item: string) => ({
        category: `${city}-Specific`,
        item,
        costLow: 100,
        costHigh: 500,
        perUnit: "varies",
        diy: false,
        priority: 2,
        notes: `Common failure in ${city} inspections`
      }));

      // Add at top priority
      checklistItems = [...citySpecificItems, ...checklistItems];
    }

    // Flag items that match existing violations
    const flaggedItems = checklistItems.map(item => {
      const matchingViolation = openViolations.find(v =>
        v.violationDescription?.toLowerCase().includes(item.item.toLowerCase().slice(0, 20)) ||
        item.item.toLowerCase().includes(v.violationType?.toLowerCase() || "")
      );

      return {
        ...item,
        hasExistingViolation: !!matchingViolation,
        violationDetails: matchingViolation ? {
          caseNumber: matchingViolation.caseNumber,
          description: matchingViolation.violationDescription,
          dueDate: matchingViolation.dueDate,
        } : null,
      };
    });

    // Sort by priority, then by existing violations
    flaggedItems.sort((a, b) => {
      if (a.hasExistingViolation !== b.hasExistingViolation) {
        return a.hasExistingViolation ? -1 : 1;
      }
      return a.priority - b.priority;
    });

    // Calculate total estimated repair cost
    const costEstimate = {
      low: flaggedItems.reduce((sum, i) => sum + i.costLow, 0),
      high: flaggedItems.reduce((sum, i) => sum + i.costHigh, 0),
      critical: flaggedItems
        .filter(i => i.priority === 1)
        .reduce((sum, i) => sum + i.costHigh, 0),
    };

    // Generate timeline
    const criticalItems = flaggedItems.filter(i => i.priority === 1);
    const diyItems = flaggedItems.filter(i => i.diy);
    const contractorItems = flaggedItems.filter(i => !i.diy);

    return {
      property: parcel ? {
        address: parcel.fullAddress,
        parcelId: parcel.parcelId,
        yearBuilt: parcel.parcelYear,
        city: parcel.city,
      } : { address: args.address, city },

      inspectionInfo: {
        city,
        posRequired: posReq?.posRequired ?? null,
        posCost: posReq?.posCost,
        processingDays: posReq?.avgProcessingDays,
        escrowRequired: posReq?.escrowRequired,
        escrowPercent: posReq?.escrowPercent,
        investorNotes: posReq?.investorNotes,
      },

      existingViolations: openViolations.map(v => ({
        type: v.violationType,
        description: v.violationDescription,
        severity: v.severity,
        dueDate: v.dueDate,
        fineAmount: v.fineAmount,
      })),

      checklist: {
        critical: flaggedItems.filter(i => i.priority === 1).map(i => ({
          item: i.item,
          category: i.category,
          estimatedCost: `$${i.costLow}-${i.costHigh}`,
          diy: i.diy,
          notes: i.notes,
          hasViolation: i.hasExistingViolation,
        })),
        important: flaggedItems.filter(i => i.priority === 2).map(i => ({
          item: i.item,
          category: i.category,
          estimatedCost: `$${i.costLow}-${i.costHigh}`,
          diy: i.diy,
          notes: i.notes,
          hasViolation: i.hasExistingViolation,
        })),
        standard: flaggedItems.filter(i => i.priority === 3).map(i => ({
          item: i.item,
          category: i.category,
          estimatedCost: `$${i.costLow}-${i.costHigh}`,
          diy: i.diy,
          notes: i.notes,
          hasViolation: i.hasExistingViolation,
        })),
      },

      costEstimate: {
        totalLow: costEstimate.low,
        totalHigh: costEstimate.high,
        criticalItemsOnly: costEstimate.critical,
        formatted: `$${costEstimate.low.toLocaleString()}-$${costEstimate.high.toLocaleString()}`,
      },

      oneWeekGamePlan: {
        day1_2: {
          title: "Walk-through & Assessment",
          tasks: [
            "Walk entire property with this checklist",
            "Take photos of every potential issue",
            "Test all GFCI outlets with tester ($15 at hardware store)",
            "Test all smoke/CO detectors",
            "Check water heater temp and strapping",
          ]
        },
        day3_4: {
          title: "DIY Fixes",
          tasks: [
            "Replace smoke detector batteries or units",
            "Add CO detectors if needed",
            "Tighten loose handrails",
            "Replace missing outlet/switch covers",
            "Fix any leaky faucets or running toilets",
            "Change furnace filter",
          ],
          itemCount: diyItems.length,
        },
        day5_6: {
          title: "Contractor Work",
          tasks: [
            "GFCI outlet installation (electrician)",
            "Handrail installation if needed",
            "Any electrical panel issues",
            "Plumbing repairs beyond DIY",
          ],
          itemCount: contractorItems.filter(i => i.priority <= 2).length,
          note: "Book contractors ASAP - they're often booked out",
        },
        day7: {
          title: "Final Check",
          tasks: [
            "Re-walk property with checklist",
            "Verify all repairs completed",
            "Clean property (inspectors notice this)",
            "Ensure all areas accessible for inspector",
            "Have paperwork ready (permits, receipts)",
          ]
        }
      },

      proTips: [
        "GFCI outlets are the #1 fail item - test and replace proactively",
        "Inspectors can't fail you for cosmetic issues - focus on safety",
        "If you're not sure about an item, fix it anyway - it's cheaper than failing",
        "Be present at inspection to address questions immediately",
        "Some cities allow escrow for uncompleted items - ask upfront",
        "Clean properties get more favorable treatment",
        city === "CLEVELAND HEIGHTS" ? "Cleveland Heights is notoriously strict - over-prepare" : null,
        city === "LAKEWOOD" ? "Lakewood focuses heavily on exterior maintenance" : null,
        city === "PARMA" ? "Parma requires Certificate of Disclosure" : null,
      ].filter(Boolean),

      urgentWarning: criticalItems.length > 5
        ? "⚠️ High number of critical items - consider requesting inspection delay"
        : openViolations.length > 0
        ? "⚠️ Existing violations must be addressed - inspector will check these first"
        : null,
    };
  },
});

export const insertRentalComp = mutation({
  args: {
    parcelId: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    zipCode: v.string(),
    propertyType: v.string(),
    bedrooms: v.number(),
    bathrooms: v.number(),
    sqft: v.optional(v.number()),
    monthlyRent: v.number(),
    listDate: v.optional(v.string()),
    rentedDate: v.optional(v.string()),
    daysOnMarket: v.optional(v.number()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("rentalComps", {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});
