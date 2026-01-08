import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ===== DEAL SCORING ENGINE =====

// Calculate deal score for a property
export const calculateDealScore = query({
  args: {
    address: v.string(),
    strategy: v.optional(v.string()), // flip, brrrr, wholesale, rental
  },
  handler: async (ctx, args) => {
    const strategy = args.strategy || "flip";

    // Find the property
    const parcels = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const parcel = parcels[0];
    if (!parcel) {
      return { error: "Property not found", score: null };
    }

    // Get tax delinquency info
    const taxDelinquent = await ctx.db
      .query("taxDelinquent")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", parcel.parcelId))
      .first();

    // Get sheriff sale info
    const sheriffSale = await ctx.db
      .query("sheriffSales")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", parcel.parcelId))
      .first();

    // Get code violations
    const violations = await ctx.db
      .query("codeViolations")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", parcel.parcelId))
      .collect();

    // Get comparables for ARV
    const comps = await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", parcel.zipCode))
      .take(500);

    const recentComps = comps
      .filter(p => {
        if (p.parcelId === parcel.parcelId) return false;
        if (!p.lastSalePrice || !p.lastSaleDate) return false;
        const saleYear = parseInt(p.lastSaleDate.substring(0, 4));
        if (saleYear < 2022) return false;
        if (p.propertyClass !== parcel.propertyClass) return false;
        if (p.taxLuc !== parcel.taxLuc) return false;
        return true;
      })
      .slice(0, 10);

    // Calculate ARV from comps
    const compPrices = recentComps.map(c => c.lastSalePrice!);
    const estimatedArv = compPrices.length > 0
      ? Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length)
      : parcel.certifiedTaxTotal ? parcel.certifiedTaxTotal * 3 : null;

    // Calculate equity score (0-25)
    let equityScore = 0;
    if (estimatedArv && parcel.lastSalePrice) {
      const potentialEquity = estimatedArv - parcel.lastSalePrice;
      const equityPercent = (potentialEquity / estimatedArv) * 100;
      if (equityPercent >= 40) equityScore = 25;
      else if (equityPercent >= 30) equityScore = 20;
      else if (equityPercent >= 20) equityScore = 15;
      else if (equityPercent >= 10) equityScore = 10;
      else equityScore = 5;
    }

    // Calculate distress score (0-25)
    let distressScore = 0;
    if (taxDelinquent) {
      if (taxDelinquent.totalAmountOwed >= 10000) distressScore += 15;
      else if (taxDelinquent.totalAmountOwed >= 5000) distressScore += 12;
      else if (taxDelinquent.totalAmountOwed >= 2000) distressScore += 8;
      else distressScore += 5;

      if (taxDelinquent.yearsDelinquent && taxDelinquent.yearsDelinquent >= 3) distressScore += 5;
      if (taxDelinquent.certifiedForSale) distressScore += 5;
    }
    if (sheriffSale) {
      if (sheriffSale.status === "scheduled") distressScore += 10;
    }
    distressScore = Math.min(distressScore, 25);

    // Calculate motivation score (0-25)
    let motivationScore = 0;

    // Out of state owner check
    if (parcel.mailState && parcel.mailState !== "OH") {
      motivationScore += 10;
    }

    // Long ownership (inherited/tired landlord)
    if (parcel.lastSaleDate) {
      const saleYear = parseInt(parcel.lastSaleDate.substring(0, 4));
      const yearsOwned = new Date().getFullYear() - saleYear;
      if (yearsOwned >= 20) motivationScore += 10;
      else if (yearsOwned >= 10) motivationScore += 7;
      else if (yearsOwned >= 5) motivationScore += 3;
    }

    // Corporate/LLC/Trust ownership
    const owner = parcel.currentOwner || "";
    if (owner.includes("LLC") || owner.includes("TRUST") || owner.includes("INC") || owner.includes("CORP")) {
      motivationScore += 5;
    }

    motivationScore = Math.min(motivationScore, 25);

    // Calculate market score (0-15) - based on zip code health
    let marketScore = 10; // Default to average
    const zipParcels = await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", parcel.zipCode))
      .take(200);

    const recentSales = zipParcels.filter(p => {
      if (!p.lastSaleDate) return false;
      const saleYear = parseInt(p.lastSaleDate.substring(0, 4));
      return saleYear >= 2023;
    });

    if (recentSales.length >= 20) marketScore = 15; // Active market
    else if (recentSales.length >= 10) marketScore = 12;
    else if (recentSales.length >= 5) marketScore = 8;
    else marketScore = 5; // Slow market

    // Calculate compliance score (0-10) - fewer violations = higher score
    let complianceScore = 10;
    const openViolations = violations.filter(v => v.status === "open" || v.status === "in_progress");
    if (openViolations.length === 0) complianceScore = 10;
    else if (openViolations.length <= 2) complianceScore = 7;
    else if (openViolations.length <= 5) complianceScore = 4;
    else complianceScore = 1;

    // Calculate overall score
    const overallScore = equityScore + distressScore + motivationScore + marketScore + complianceScore;

    // Estimate repairs based on property age and condition signals
    let estimatedRepairs = 0;
    if (openViolations.length > 0) {
      estimatedRepairs += openViolations.length * 2500;
    }
    if (parcel.totalResLivingArea) {
      // Assume $30/sqft for moderate rehab
      estimatedRepairs += Math.round(parcel.totalResLivingArea * 15);
    } else {
      estimatedRepairs = 25000; // Default
    }

    // Calculate max offer (70% rule for flips)
    const maxOffer = estimatedArv
      ? Math.round(estimatedArv * 0.7 - estimatedRepairs)
      : null;

    // Build analysis notes
    const notes: string[] = [];
    if (taxDelinquent) notes.push(`Tax delinquent: $${taxDelinquent.totalAmountOwed.toLocaleString()} owed`);
    if (sheriffSale) notes.push(`Sheriff sale: ${sheriffSale.status}`);
    if (openViolations.length > 0) notes.push(`${openViolations.length} open code violations`);
    if (parcel.mailState !== "OH") notes.push(`Out-of-state owner (${parcel.mailState})`);
    if (parcel.taxAbatement) notes.push(`Has tax abatement`);

    return {
      parcel,
      score: {
        overall: overallScore,
        equity: equityScore,
        distress: distressScore,
        motivation: motivationScore,
        market: marketScore,
        compliance: complianceScore,
        rating: overallScore >= 70 ? "A" : overallScore >= 55 ? "B" : overallScore >= 40 ? "C" : "D",
      },
      analysis: {
        estimatedArv,
        estimatedRepairs,
        maxOffer,
        comparablesUsed: recentComps.length,
        strategy,
      },
      distressSignals: {
        taxDelinquent: taxDelinquent ? {
          amountOwed: taxDelinquent.totalAmountOwed,
          yearsDelinquent: taxDelinquent.yearsDelinquent,
          certifiedForSale: taxDelinquent.certifiedForSale,
        } : null,
        sheriffSale: sheriffSale ? {
          status: sheriffSale.status,
          openingBid: sheriffSale.openingBid,
          saleDate: sheriffSale.saleDate,
        } : null,
        openViolations: openViolations.length,
      },
      notes,
    };
  },
});

// Find deals matching criteria
export const findDeals = query({
  args: {
    cities: v.optional(v.array(v.string())),
    minScore: v.optional(v.number()),
    maxArv: v.optional(v.number()),
    propertyTypes: v.optional(v.array(v.string())), // "5100" for SFR, etc.
    distressTypes: v.optional(v.array(v.string())), // "tax_delinquent", "foreclosure"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 25;
    const minScore = args.minScore || 50;
    const cities = args.cities?.map(c => c.toUpperCase());

    // Strategy: Find distressed properties first, then score them
    const deals: any[] = [];

    // Get tax delinquent properties
    if (!args.distressTypes || args.distressTypes.includes("tax_delinquent")) {
      let taxDelinquent;
      if (cities && cities.length === 1) {
        taxDelinquent = await ctx.db
          .query("taxDelinquent")
          .withIndex("by_city", (q) => q.eq("city", cities[0]))
          .take(100);
      } else {
        taxDelinquent = await ctx.db
          .query("taxDelinquent")
          .order("desc")
          .take(200);
        if (cities) {
          taxDelinquent = taxDelinquent.filter(t => cities.includes(t.city.toUpperCase()));
        }
      }

      // Get parcel details for each
      for (const td of taxDelinquent.slice(0, 50)) {
        const parcel = await ctx.db
          .query("parcels")
          .withIndex("by_parcel_id", (q) => q.eq("parcelId", td.parcelId))
          .first();

        if (parcel) {
          // Apply filters
          if (args.propertyTypes && !args.propertyTypes.includes(parcel.taxLuc || "")) continue;
          if (args.maxArv && parcel.certifiedTaxTotal && parcel.certifiedTaxTotal * 3 > args.maxArv) continue;

          deals.push({
            parcel,
            distressType: "tax_delinquent",
            distressDetails: td,
            quickScore: Math.min(25, Math.round(td.totalAmountOwed / 500)), // Quick distress score
          });
        }
      }
    }

    // Get sheriff sales
    if (!args.distressTypes || args.distressTypes.includes("foreclosure")) {
      let sheriffSales = await ctx.db
        .query("sheriffSales")
        .withIndex("by_status", (q) => q.eq("status", "scheduled"))
        .take(100);

      if (cities) {
        sheriffSales = sheriffSales.filter(s => cities.includes(s.city.toUpperCase()));
      }

      for (const ss of sheriffSales.slice(0, 50)) {
        if (!ss.parcelId) continue;

        const parcel = await ctx.db
          .query("parcels")
          .withIndex("by_parcel_id", (q) => q.eq("parcelId", ss.parcelId))
          .first();

        if (parcel) {
          if (args.propertyTypes && !args.propertyTypes.includes(parcel.taxLuc || "")) continue;
          if (args.maxArv && parcel.certifiedTaxTotal && parcel.certifiedTaxTotal * 3 > args.maxArv) continue;

          // Check if already in deals list
          const existing = deals.find(d => d.parcel.parcelId === parcel.parcelId);
          if (existing) {
            existing.distressType = "multiple";
            existing.sheriffSale = ss;
            existing.quickScore += 15;
          } else {
            deals.push({
              parcel,
              distressType: "foreclosure",
              distressDetails: ss,
              quickScore: 20,
            });
          }
        }
      }
    }

    // Sort by quick score and return top deals
    deals.sort((a, b) => b.quickScore - a.quickScore);

    return {
      deals: deals.slice(0, limit),
      totalFound: deals.length,
      filters: {
        cities: args.cities,
        minScore,
        maxArv: args.maxArv,
        propertyTypes: args.propertyTypes,
        distressTypes: args.distressTypes,
      },
    };
  },
});

// Calculate ARV with repair estimates
export const calculateARV = query({
  args: {
    address: v.string(),
    conditionLevel: v.optional(v.string()), // cosmetic, moderate, heavy, gut
  },
  handler: async (ctx, args) => {
    const condition = args.conditionLevel || "moderate";

    // Find the property
    const parcels = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const subject = parcels[0];
    if (!subject) {
      return { error: "Property not found" };
    }

    // Find comparables
    const allInZip = await ctx.db
      .query("parcels")
      .withIndex("by_zip", (q) => q.eq("zipCode", subject.zipCode))
      .take(1000);

    const comps = allInZip
      .filter(p => {
        if (p.parcelId === subject.parcelId) return false;
        if (!p.lastSalePrice || !p.lastSaleDate) return false;
        const saleYear = parseInt(p.lastSaleDate.substring(0, 4));
        if (saleYear < 2022) return false;
        if (p.propertyClass !== subject.propertyClass) return false;
        if (p.taxLuc !== subject.taxLuc) return false;

        // Size match within 30%
        if (subject.totalResLivingArea && p.totalResLivingArea) {
          const sizeDiff = Math.abs(p.totalResLivingArea - subject.totalResLivingArea) / subject.totalResLivingArea;
          if (sizeDiff > 0.3) return false;
        }

        return true;
      })
      .sort((a, b) => (b.lastSaleDate || "").localeCompare(a.lastSaleDate || ""))
      .slice(0, 10);

    // Calculate ARV
    const compPrices = comps.map(c => c.lastSalePrice!);
    const avgPrice = compPrices.length > 0
      ? compPrices.reduce((a, b) => a + b, 0) / compPrices.length
      : null;

    // Adjustments based on size difference
    let adjustedArv = avgPrice;
    if (adjustedArv && subject.totalResLivingArea && comps[0]?.totalResLivingArea) {
      const avgCompSize = comps.reduce((sum, c) => sum + (c.totalResLivingArea || 0), 0) / comps.length;
      const sizeDiff = subject.totalResLivingArea - avgCompSize;
      const pricePerSqft = adjustedArv / avgCompSize;
      adjustedArv = Math.round(adjustedArv + (sizeDiff * pricePerSqft * 0.5)); // 50% adjustment factor
    }

    // Estimate repairs based on condition
    const sqft = subject.totalResLivingArea || 1200;
    const repairCosts: Record<string, number> = {
      cosmetic: 15, // $/sqft
      moderate: 30,
      heavy: 55,
      gut: 85,
    };
    const repairPerSqft = repairCosts[condition] || 30;
    const estimatedRepairs = Math.round(sqft * repairPerSqft);

    // Calculate max offer (70% rule)
    const maxOffer = adjustedArv
      ? Math.round(adjustedArv * 0.7 - estimatedRepairs)
      : null;

    // Potential profit
    const potentialProfit = adjustedArv && maxOffer
      ? adjustedArv - maxOffer - estimatedRepairs - Math.round(adjustedArv * 0.08) // 8% selling costs
      : null;

    return {
      subject: {
        address: subject.fullAddress,
        parcelId: subject.parcelId,
        sqft: subject.totalResLivingArea,
        propertyType: subject.taxLucDescription,
        lastSalePrice: subject.lastSalePrice,
        lastSaleDate: subject.lastSaleDate,
        assessedValue: subject.certifiedTaxTotal,
      },
      comparables: comps.map(c => ({
        address: c.fullAddress,
        salePrice: c.lastSalePrice,
        saleDate: c.lastSaleDate,
        sqft: c.totalResLivingArea,
        pricePerSqft: c.totalResLivingArea && c.lastSalePrice
          ? Math.round(c.lastSalePrice / c.totalResLivingArea)
          : null,
      })),
      analysis: {
        estimatedArv: adjustedArv ? Math.round(adjustedArv) : null,
        conditionLevel: condition,
        estimatedRepairs,
        maxOffer,
        potentialProfit,
        comparablesUsed: comps.length,
      },
      breakdown: {
        arvSource: `Average of ${comps.length} comparable sales`,
        repairEstimate: `${sqft} sqft × $${repairPerSqft}/sqft (${condition} rehab)`,
        maxOfferFormula: adjustedArv ? `$${Math.round(adjustedArv).toLocaleString()} × 70% - $${estimatedRepairs.toLocaleString()} repairs` : "N/A",
      },
    };
  },
});

// Get owner intelligence
export const getOwnerIntelligence = query({
  args: {
    ownerName: v.optional(v.string()),
    parcelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let targetParcel;
    let ownerName = args.ownerName;

    if (args.parcelId) {
      targetParcel = await ctx.db
        .query("parcels")
        .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
        .first();
      ownerName = targetParcel?.currentOwner;
    }

    if (!ownerName) {
      return { error: "Owner name or parcel ID required" };
    }

    // Find all properties by this owner
    const ownerProperties = await ctx.db
      .query("parcels")
      .withSearchIndex("search_owner", (q) => q.search("currentOwner", ownerName!))
      .take(100);

    // Analyze portfolio
    const totalProperties = ownerProperties.length;
    const totalValue = ownerProperties.reduce((sum, p) => sum + (p.certifiedTaxTotal || 0), 0);
    const cities = [...new Set(ownerProperties.map(p => p.city))];

    // Check for out-of-state
    const mailStates = [...new Set(ownerProperties.map(p => p.mailState).filter(Boolean))];
    const isOutOfState = mailStates.length > 0 && !mailStates.includes("OH");

    // Check ownership type
    const ownerUpper = ownerName.toUpperCase();
    const ownerType = ownerUpper.includes("LLC") ? "LLC" :
                      ownerUpper.includes("TRUST") ? "Trust" :
                      ownerUpper.includes("INC") || ownerUpper.includes("CORP") ? "Corporation" :
                      ownerUpper.includes("BANK") ? "Bank/Lender" :
                      ownerUpper.includes("LAND BANK") || ownerUpper.includes("LAND REUTILIZATION") ? "Land Bank" :
                      "Individual";

    // Calculate average years owned
    const yearsOwned = ownerProperties
      .filter(p => p.lastSaleDate)
      .map(p => new Date().getFullYear() - parseInt(p.lastSaleDate!.substring(0, 4)));
    const avgYearsOwned = yearsOwned.length > 0
      ? Math.round(yearsOwned.reduce((a, b) => a + b, 0) / yearsOwned.length)
      : null;

    // Check for distress across portfolio
    const distressedCount = await Promise.all(
      ownerProperties.slice(0, 20).map(async p => {
        const td = await ctx.db
          .query("taxDelinquent")
          .withIndex("by_parcel_id", (q) => q.eq("parcelId", p.parcelId))
          .first();
        return td ? 1 : 0;
      })
    );
    const hasDistressedProperties = distressedCount.reduce((a, b) => a + b, 0);

    // Calculate motivation score
    let motivationScore = 0;
    if (isOutOfState) motivationScore += 20;
    if (totalProperties >= 5) motivationScore += 10; // Portfolio owner
    if (avgYearsOwned && avgYearsOwned >= 15) motivationScore += 15;
    if (hasDistressedProperties > 0) motivationScore += 15;
    if (ownerType === "Individual" && totalProperties === 1) motivationScore += 10;
    motivationScore = Math.min(motivationScore, 100);

    // Suggest approach
    let suggestedApproach = "";
    if (isOutOfState && totalProperties >= 3) {
      suggestedApproach = "Direct mail campaign - out of state landlord with portfolio";
    } else if (hasDistressedProperties > 0) {
      suggestedApproach = "Focus on tax relief/subject-to opportunity";
    } else if (avgYearsOwned && avgYearsOwned >= 20) {
      suggestedApproach = "Inheritance/estate situation possible - gentle approach";
    } else if (ownerType === "LLC" || ownerType === "Corporation") {
      suggestedApproach = "Business transaction - focus on quick close and terms";
    } else {
      suggestedApproach = "Standard direct mail or door knock";
    }

    return {
      owner: {
        name: ownerName,
        type: ownerType,
        isOutOfState,
        mailingAddress: targetParcel?.mailAddress || ownerProperties[0]?.mailAddress,
        mailingCity: targetParcel?.mailCity || ownerProperties[0]?.mailCity,
        mailingState: targetParcel?.mailState || ownerProperties[0]?.mailState,
      },
      portfolio: {
        totalProperties,
        totalAssessedValue: totalValue,
        cities,
        avgYearsOwned,
        distressedCount: hasDistressedProperties,
      },
      analysis: {
        motivationScore,
        motivationLevel: motivationScore >= 50 ? "High" : motivationScore >= 25 ? "Medium" : "Low",
        suggestedApproach,
      },
      properties: ownerProperties.slice(0, 10).map(p => ({
        address: p.fullAddress,
        parcelId: p.parcelId,
        city: p.city,
        assessedValue: p.certifiedTaxTotal,
        lastSaleDate: p.lastSaleDate,
      })),
    };
  },
});

// Rental analysis for BRRRR and buy-and-hold
export const getRentalAnalysis = query({
  args: {
    address: v.string(),
    purchasePrice: v.optional(v.number()),
    rehabCost: v.optional(v.number()),
    downPaymentPercent: v.optional(v.number()),
    interestRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const downPayment = args.downPaymentPercent || 25;
    const rate = args.interestRate || 7.5;

    // Find the property
    const parcels = await ctx.db
      .query("parcels")
      .withSearchIndex("search_address", (q) => q.search("fullAddress", args.address))
      .take(1);

    const parcel = parcels[0];
    if (!parcel) {
      return { error: "Property not found" };
    }

    // Estimate purchase price if not provided
    const purchasePrice = args.purchasePrice || parcel.lastSalePrice || parcel.certifiedTaxTotal || 0;
    const rehabCost = args.rehabCost || 0;
    const totalInvestment = purchasePrice + rehabCost;

    // Get rental comps from the rentalComps table
    const rentalComps = await ctx.db
      .query("rentalComps")
      .withIndex("by_zip", (q) => q.eq("zipCode", parcel.zipCode))
      .take(20);

    // Get demographics for median rent fallback
    const demographics = await ctx.db
      .query("demographics")
      .withIndex("by_zip_code", (q) => q.eq("zipCode", parcel.zipCode))
      .first();

    // Estimate rent
    let estimatedRent: number;
    if (rentalComps.length > 0) {
      // Filter by similar bedrooms if we have that data
      estimatedRent = Math.round(
        rentalComps.reduce((sum, c) => sum + c.monthlyRent, 0) / rentalComps.length
      );
    } else if (demographics?.medianRent) {
      estimatedRent = demographics.medianRent;
    } else {
      // Estimate based on 1% rule as fallback
      estimatedRent = Math.round(purchasePrice * 0.01);
    }

    // Calculate monthly expenses
    const monthlyTaxes = (parcel.certifiedTaxTotal || 0) * 0.035 / 12; // ~3.5% effective tax rate
    const monthlyInsurance = purchasePrice * 0.005 / 12; // ~0.5% annually
    const monthlyMaintenance = estimatedRent * 0.10; // 10% of rent
    const monthlyVacancy = estimatedRent * 0.08; // 8% vacancy
    const monthlyPropMgmt = estimatedRent * 0.10; // 10% property management

    // Calculate mortgage
    const loanAmount = totalInvestment * (1 - downPayment / 100);
    const monthlyRate = rate / 100 / 12;
    const numPayments = 30 * 12;
    const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalMonthlyExpenses = monthlyTaxes + monthlyInsurance + monthlyMaintenance + monthlyVacancy + monthlyPropMgmt + monthlyMortgage;
    const monthlyCashFlow = estimatedRent - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    // Calculate returns
    const cashInvested = totalInvestment * (downPayment / 100);
    const cashOnCashReturn = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
    const capRate = ((estimatedRent * 12 - (monthlyTaxes + monthlyInsurance + monthlyMaintenance + monthlyVacancy + monthlyPropMgmt) * 12) / totalInvestment) * 100;
    const dscr = monthlyMortgage > 0 ? (estimatedRent * 0.75) / monthlyMortgage : 0; // 75% of rent / mortgage

    // BRRRR analysis
    const arvEstimate = parcel.certifiedTaxTotal ? parcel.certifiedTaxTotal * 3 : totalInvestment * 1.3;
    const refinanceAmount = arvEstimate * 0.75; // 75% LTV
    const cashLeftInDeal = Math.max(0, totalInvestment - refinanceAmount);

    return {
      property: {
        address: parcel.fullAddress,
        parcelId: parcel.parcelId,
        propertyType: parcel.taxLucDescription,
        sqft: parcel.totalResLivingArea,
        assessedValue: parcel.certifiedTaxTotal,
      },
      assumptions: {
        purchasePrice,
        rehabCost,
        totalInvestment,
        downPaymentPercent: downPayment,
        interestRate: rate,
        loanAmount: Math.round(loanAmount),
      },
      rental: {
        estimatedMonthlyRent: estimatedRent,
        rentSource: rentalComps.length > 0 ? `${rentalComps.length} rental comps` : demographics?.medianRent ? "Census median rent" : "1% rule estimate",
        comparables: rentalComps.slice(0, 5).map(c => ({
          address: c.address,
          rent: c.monthlyRent,
          bedrooms: c.bedrooms,
        })),
      },
      expenses: {
        monthlyMortgage: Math.round(monthlyMortgage),
        monthlyTaxes: Math.round(monthlyTaxes),
        monthlyInsurance: Math.round(monthlyInsurance),
        monthlyMaintenance: Math.round(monthlyMaintenance),
        monthlyVacancy: Math.round(monthlyVacancy),
        monthlyPropMgmt: Math.round(monthlyPropMgmt),
        totalMonthly: Math.round(totalMonthlyExpenses),
      },
      returns: {
        monthlyCashFlow: Math.round(monthlyCashFlow),
        annualCashFlow: Math.round(annualCashFlow),
        cashOnCashReturn: Math.round(cashOnCashReturn * 10) / 10,
        capRate: Math.round(capRate * 10) / 10,
        dscr: Math.round(dscr * 100) / 100,
        cashInvested: Math.round(cashInvested),
      },
      brrrr: {
        estimatedArv: Math.round(arvEstimate),
        refinanceAmount: Math.round(refinanceAmount),
        cashLeftInDeal: Math.round(cashLeftInDeal),
        infiniteReturn: cashLeftInDeal <= 0,
      },
      verdict: {
        cashFlow: monthlyCashFlow >= 200 ? "Good" : monthlyCashFlow >= 0 ? "Break-even" : "Negative",
        cocReturn: cashOnCashReturn >= 12 ? "Excellent" : cashOnCashReturn >= 8 ? "Good" : cashOnCashReturn >= 4 ? "Fair" : "Poor",
        dscrQualifies: dscr >= 1.25 ? "Yes" : dscr >= 1.0 ? "Marginal" : "No",
      },
    };
  },
});

// ===== MUTATIONS FOR DATA IMPORT =====

export const insertDealScore = mutation({
  args: {
    parcelId: v.string(),
    address: v.string(),
    city: v.string(),
    zipCode: v.string(),
    overallScore: v.number(),
    equityScore: v.number(),
    distressScore: v.number(),
    motivationScore: v.number(),
    marketScore: v.number(),
    complianceScore: v.number(),
    estimatedArv: v.optional(v.number()),
    estimatedRepairs: v.optional(v.number()),
    maxOffer: v.optional(v.number()),
    strategy: v.string(),
    analysisNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if exists
    const existing = await ctx.db
      .query("dealScores")
      .withIndex("by_parcel_id", (q) => q.eq("parcelId", args.parcelId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, lastCalculated: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("dealScores", {
      ...args,
      lastCalculated: Date.now(),
    });
  },
});
