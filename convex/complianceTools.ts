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
