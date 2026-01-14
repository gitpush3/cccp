import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // ===== PARCEL DATA - Complete Cuyahoga County (~520,000 parcels) =====
  // LLM-optimized with search indexes for address lookup, filtering by city/zip
  parcels: defineTable({
    // Identification
    parcelId: v.string(), // Primary identifier (parcelpin)
    parcelPin: v.optional(v.string()),
    bookPage: v.optional(v.string()),
    parcelType: v.optional(v.string()), // LAND, CONDO, etc.
    parcelYear: v.optional(v.number()),
    
    // Address (LLM searchable)
    fullAddress: v.string(), // PAR_ADDR_ALL - main search field
    streetNumber: v.optional(v.string()),
    streetPredir: v.optional(v.string()), // E, W, N, S
    streetName: v.optional(v.string()),
    streetSuffix: v.optional(v.string()), // ST, AVE, RD, etc.
    unit: v.optional(v.string()),
    city: v.string(),
    zipCode: v.string(),
    
    // Ownership (investor-critical)
    currentOwner: v.optional(v.string()), // DEEDED_OWNER
    grantee: v.optional(v.string()), // Current owner from deed
    grantor: v.optional(v.string()), // Previous owner
    
    // Mailing address
    mailName: v.optional(v.string()),
    mailAddress: v.optional(v.string()),
    mailCity: v.optional(v.string()),
    mailState: v.optional(v.string()),
    mailZip: v.optional(v.string()),
    
    // Sales history (investor-critical)
    lastSaleDate: v.optional(v.string()), // TRANSFER_DATE
    lastSalePrice: v.optional(v.number()), // SALES_AMOUNT
    
    // Land use codes (LLM reference)
    taxLuc: v.optional(v.string()), // Tax land use code
    taxLucDescription: v.optional(v.string()), // Human-readable description
    extLuc: v.optional(v.string()), // Extended land use code
    extLucDescription: v.optional(v.string()),
    zoningCode: v.optional(v.string()),
    zoningUse: v.optional(v.string()),
    propertyClass: v.optional(v.string()), // R=Residential, C=Commercial, etc.
    
    // Tax district & neighborhood
    taxDistrict: v.optional(v.string()),
    neighborhoodCode: v.optional(v.string()),
    
    // Property characteristics
    totalAcreage: v.optional(v.number()),
    totalSquareFt: v.optional(v.number()),
    totalLegalFront: v.optional(v.number()),
    
    // Building info (investor-critical)
    resBuildingCount: v.optional(v.number()),
    totalResLivingArea: v.optional(v.number()),
    totalResRooms: v.optional(v.number()),
    comBuildingCount: v.optional(v.number()),
    totalComUseArea: v.optional(v.number()),
    comLivingUnits: v.optional(v.number()),
    
    // Tax valuations (investor-critical)
    certifiedTaxLand: v.optional(v.number()),
    certifiedTaxBuilding: v.optional(v.number()),
    certifiedTaxTotal: v.optional(v.number()),
    certifiedExemptTotal: v.optional(v.number()),
    certifiedAbatedTotal: v.optional(v.number()),
    grossCertifiedLand: v.optional(v.number()),
    grossCertifiedBuilding: v.optional(v.number()),
    grossCertifiedTotal: v.optional(v.number()),
    taxYear: v.optional(v.number()),
    
    // Utilities
    roadType: v.optional(v.string()),
    water: v.optional(v.string()),
    sewer: v.optional(v.string()),
    gas: v.optional(v.string()),
    electricity: v.optional(v.string()),
    
    // Tax abatement (investor opportunity)
    taxAbatement: v.optional(v.string()),
    
    // Condo info
    condoComplexId: v.optional(v.string()),
    
    // Metadata
    dataSource: v.string(), // "cleveland" or "non_cleveland"
    lastUpdated: v.number(),
  })
    .index("by_parcel_id", ["parcelId"])
    .index("by_city", ["city"])
    .index("by_zip", ["zipCode"])
    .index("by_city_and_zip", ["city", "zipCode"])
    .index("by_owner", ["currentOwner"])
    .index("by_tax_luc", ["taxLuc"])
    .index("by_property_class", ["propertyClass"])
    .index("by_zoning", ["zoningCode"])
    .searchIndex("search_address", {
      searchField: "fullAddress",
      filterFields: ["city", "zipCode"],
    })
    .searchIndex("search_owner", {
      searchField: "currentOwner",
      filterFields: ["city"],
    }),

  // ===== LAND USE CODE REFERENCE (LLM lookup table) =====
  // Helps LLM understand what tax_luc codes mean
  landUseCodes: defineTable({
    code: v.string(),
    description: v.string(),
    category: v.string(), // residential, commercial, industrial, exempt, agricultural
    investorNotes: v.optional(v.string()), // Tips for investors about this property type
  }).index("by_code", ["code"]),


  users: defineTable({
    clerkId: v.optional(v.string()),
    googleId: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("none"))),
    endsAt: v.optional(v.number()),
    // Referral tracking
    referralCode: v.optional(v.string()),
    referredBy: v.optional(v.string()), // referralCode of the referrer
    stripeAccountId: v.optional(v.string()), // For Stripe Connect payouts
    totalReferralEarnings: v.optional(v.number()), // Total earned in cents
    // Usage tracking for billing
    questionsUsed: v.optional(v.number()),
    questionsLimit: v.optional(v.number()),
    // Track anonymous messages before signup
    anonymousMessageCount: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_google_id", ["googleId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_referral_code", ["referralCode"])
    .index("by_referred_by", ["referredBy"]),

  referralCommissions: defineTable({
    referrerId: v.id("users"),
    refereeId: v.id("users"),
    amount: v.number(), // Commission amount in cents (1% of gross)
    paymentIntentId: v.string(), // Stripe payment intent ID
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    createdAt: v.number(),
  })
    .index("by_referrer", ["referrerId"])
    .index("by_status", ["status"]),


  // Form submissions for alternative to payment
  formSubmissions: defineTable({
    email: v.string(),
    jobType: v.string(),
    useCase: v.string(), // What they plan to use it for / what features they need
    submittedAt: v.number(),
    clerkId: v.optional(v.string()), // Link to user if they're logged in
    status: v.union(v.literal("pending"), v.literal("processed"), v.literal("granted_access")),
  })
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"])
    .index("by_status", ["status"]),

  // Municipalities table - 59 Cuyahoga County cities/villages/townships + Ohio State + County
  municipalities: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("state"),
      v.literal("county"),
      v.literal("city"),
      v.literal("village"),
      v.literal("township")
    ),
    county: v.string(),
    state: v.string(),
    population: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_type", ["type"]),

  // Regulation URLs table - links to building codes, permits, zoning for each municipality
  regulationUrls: defineTable({
    municipalityId: v.id("municipalities"),
    regulationType: v.union(
      v.literal("building_code"),
      v.literal("residential_code"),
      v.literal("fire_code"),
      v.literal("mechanical_code"),
      v.literal("plumbing_code"),
      v.literal("electrical_code"),
      v.literal("energy_code"),
      v.literal("zoning_code"),
      v.literal("permitting_information"),
      v.literal("property_maintenance_code"),
      v.literal("flood_plain_regulations"),
      v.literal("demolition_regulations")
    ),
    url: v.optional(v.string()),
    status: v.union(
      v.literal("adopts_state"),
      v.literal("local_code"),
      v.literal("not_found"),
      v.literal("not_applicable")
    ),
    displayValue: v.string(),
    lastVerified: v.number(),
  })
    .index("by_municipality", ["municipalityId"])
    .index("by_type", ["regulationType"])
    .index("by_municipality_and_type", ["municipalityId", "regulationType"]),

  // Regulation content cache (for frequently accessed regulations)
  regulationContent: defineTable({
    regulationUrlId: v.id("regulationUrls"),
    content: v.string(),
    summary: v.string(),
    lastFetched: v.number(),
    fetchCount: v.number(),
  }).index("by_regulation_url", ["regulationUrlId"]),

  // ===== CODE CONTENT - LLM-searchable code excerpts =====
  // Stores actual code text for semantic search by the LLM
  codeContent: defineTable({
    municipality: v.string(), // "Cleveland", "Lakewood", "Ohio State", etc.
    codeType: v.string(), // "building", "zoning", "fire", "residential", "permits", etc.
    section: v.string(), // Section number or title
    title: v.string(), // Human-readable title
    content: v.string(), // Actual code text
    summary: v.optional(v.string()), // LLM-friendly summary
    investorNotes: v.optional(v.string()), // Tips for real estate investors
    sourceUrl: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_municipality", ["municipality"])
    .index("by_code_type", ["codeType"])
    .index("by_municipality_and_type", ["municipality", "codeType"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["municipality", "codeType"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["municipality", "codeType"],
    }),

  // Legacy muniCodes table (for vector search - kept for backward compatibility)
  muniCodes: defineTable({
    jurisdiction: v.string(),
    category: v.union(v.literal("zoning"), v.literal("building"), v.literal("fire")),
    text: v.string(),
    embedding: v.array(v.number()),
  })
    .index("by_jurisdiction", ["jurisdiction"]),

  architectLore: defineTable({
    title: v.string(),
    tip: v.string(),
    jurisdiction: v.optional(v.string()),
    embedding: v.array(v.number()),
  }),

  contacts: defineTable({
    city: v.string(),
    type: v.union(
      v.literal("building_dept"),
      v.literal("planning_dept"),
      v.literal("fire_dept"),
      v.literal("city_hall"),
      v.literal("mayor"),
      v.literal("council"),
      v.literal("lender"),
      v.literal("title_company"),
      v.literal("contractor"),
      v.literal("inspector"),
      v.literal("utility"),
      v.literal("other")
    ),
    name: v.string(),
    title: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    investorNotes: v.optional(v.string()),
    lastVerified: v.optional(v.number()),
  })
    .index("by_city", ["city"])
    .index("by_type", ["type"])
    .index("by_city_and_type", ["city", "type"]),

  // Service providers and resources for investors
  serviceProviders: defineTable({
    category: v.union(
      v.literal("lender"),
      v.literal("hard_money"),
      v.literal("title_company"),
      v.literal("contractor_platform"),
      v.literal("property_manager"),
      v.literal("inspector"),
      v.literal("attorney"),
      v.literal("accountant"),
      v.literal("insurance"),
      v.literal("wholesaler"),
      v.literal("other")
    ),
    name: v.string(),
    description: v.string(),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    serviceArea: v.optional(v.string()), // "Cuyahoga County", "Northeast Ohio", "Ohio", "National"
    specialties: v.optional(v.array(v.string())),
    investorNotes: v.optional(v.string()),
    featured: v.optional(v.boolean()), // For preferred partners like 3bids.io
    lastVerified: v.optional(v.number()),
  })
    .index("by_category", ["category"])
    .index("by_featured", ["featured"]),

  // Chat sessions for history
  chats: defineTable({
    chatId: v.string(),
    clerkId: v.string(),
    title: v.string(), // Auto-generated from first message or city
    city: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_chat_id", ["chatId"])
    .index("by_clerk_id_and_updated", ["clerkId", "updatedAt"]),

  messages: defineTable({
    chatId: v.string(),
    userId: v.optional(v.string()), // Make optional for anonymous users
    sessionId: v.optional(v.string()), // For anonymous sessions
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    // New fields for RAG citations
    citedRegulations: v.optional(v.array(v.id("regulationUrls"))),
    citedMunicipalities: v.optional(v.array(v.id("municipalities"))),
    tokenCount: v.optional(v.number()),
    cost: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()), // Track if message was sent anonymously
  })
    .index("by_chat_id", ["chatId"])
    .index("by_user_id", ["userId"])
    .index("by_session_id", ["sessionId"]),

  // LLM response cache for common queries
  responseCache: defineTable({
    queryHash: v.string(),
    response: v.string(),
    citedRegulations: v.optional(v.array(v.id("regulationUrls"))),
    hitCount: v.number(),
    createdAt: v.number(),
    lastUsed: v.number(),
  }).index("by_query_hash", ["queryHash"]),

  // Usage tracking for billing
  usageLog: defineTable({
    clerkId: v.string(),
    chatId: v.string(),
    messageId: v.optional(v.id("messages")),
    action: v.union(
      v.literal("text_query"),
      v.literal("photo_analysis"),
      v.literal("regulation_fetch")
    ),
    tokenCount: v.number(),
    cost: v.number(),
    timestamp: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_clerk_id_and_timestamp", ["clerkId", "timestamp"]),

  // ===== TIER 1: DISTRESSED PROPERTY DATA =====
  
  // Sheriff Sales / Foreclosure Data
  sheriffSales: defineTable({
    caseNumber: v.string(),
    parcelId: v.optional(v.string()), // Link to parcels table
    address: v.string(),
    city: v.string(),
    zipCode: v.optional(v.string()),
    saleDate: v.optional(v.string()),
    saleTime: v.optional(v.string()),
    openingBid: v.optional(v.number()),
    appraisedValue: v.optional(v.number()),
    plaintiff: v.optional(v.string()), // Lender/bank name
    defendant: v.optional(v.string()), // Property owner
    status: v.union(
      v.literal("scheduled"),
      v.literal("sold"),
      v.literal("withdrawn"),
      v.literal("cancelled"),
      v.literal("continued"),
      v.literal("redeemed")
    ),
    propertyType: v.optional(v.string()), // Residential, Commercial, etc.
    caseType: v.optional(v.string()), // Foreclosure, Tax, etc.
    sourceUrl: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_case_number", ["caseNumber"])
    .index("by_parcel_id", ["parcelId"])
    .index("by_city", ["city"])
    .index("by_status", ["status"])
    .index("by_sale_date", ["saleDate"]),

  // Tax Delinquent Properties
  taxDelinquent: defineTable({
    parcelId: v.string(), // Link to parcels table
    address: v.string(),
    city: v.string(),
    zipCode: v.optional(v.string()),
    ownerName: v.string(),
    totalAmountOwed: v.number(),
    yearsDelinquent: v.optional(v.number()),
    oldestDelinquentYear: v.optional(v.number()),
    paymentPlanStatus: v.optional(v.union(
      v.literal("none"),
      v.literal("active"),
      v.literal("defaulted")
    )),
    certifiedForSale: v.optional(v.boolean()), // Going to tax lien sale
    lastPaymentDate: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_parcel_id", ["parcelId"])
    .index("by_city", ["city"])
    .index("by_amount_owed", ["totalAmountOwed"])
    .index("by_years_delinquent", ["yearsDelinquent"]),

  // Tax Lien Certificates
  taxLienCertificates: defineTable({
    parcelId: v.string(),
    address: v.string(),
    city: v.string(),
    certificateNumber: v.optional(v.string()),
    saleDate: v.optional(v.string()),
    minimumBid: v.optional(v.number()),
    faceValue: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    redemptionDeadline: v.optional(v.string()),
    status: v.union(
      v.literal("available"),
      v.literal("sold"),
      v.literal("redeemed"),
      v.literal("foreclosed")
    ),
    purchaser: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_parcel_id", ["parcelId"])
    .index("by_city", ["city"])
    .index("by_status", ["status"])
    .index("by_sale_date", ["saleDate"]),

  // ===== TIER 2: NEIGHBORHOOD QUALITY DATA =====

  // Crime Data (Cleveland + other municipalities as available)
  crimeIncidents: defineTable({
    incidentNumber: v.string(),
    crimeType: v.string(), // Assault, Theft, Burglary, etc.
    crimeCategory: v.optional(v.union(
      v.literal("violent"),
      v.literal("property"),
      v.literal("drug"),
      v.literal("other")
    )),
    address: v.optional(v.string()),
    city: v.string(),
    zipCode: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    occurredDate: v.string(),
    occurredTime: v.optional(v.string()),
    reportedDate: v.optional(v.string()),
    disposition: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_city", ["city"])
    .index("by_zip_code", ["zipCode"])
    .index("by_crime_type", ["crimeType"])
    .index("by_date", ["occurredDate"]),

  // School Ratings
  schools: defineTable({
    schoolId: v.string(), // GreatSchools or state ID
    name: v.string(),
    schoolType: v.union(
      v.literal("elementary"),
      v.literal("middle"),
      v.literal("high"),
      v.literal("k8"),
      v.literal("k12"),
      v.literal("other")
    ),
    address: v.string(),
    city: v.string(),
    zipCode: v.string(),
    district: v.optional(v.string()),
    rating: v.optional(v.number()), // 1-10 scale
    testScoreRating: v.optional(v.number()),
    studentTeacherRatio: v.optional(v.number()),
    totalStudents: v.optional(v.number()),
    gradeRange: v.optional(v.string()), // "K-5", "6-8", etc.
    website: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    lastUpdated: v.number(),
  })
    .index("by_city", ["city"])
    .index("by_zip_code", ["zipCode"])
    .index("by_rating", ["rating"])
    .index("by_school_type", ["schoolType"]),

  // Walk/Transit/Bike Scores (cached per address or zip)
  walkScores: defineTable({
    address: v.optional(v.string()),
    zipCode: v.string(),
    city: v.string(),
    walkScore: v.optional(v.number()), // 0-100
    transitScore: v.optional(v.number()), // 0-100
    bikeScore: v.optional(v.number()), // 0-100
    walkDescription: v.optional(v.string()), // "Very Walkable", "Car-Dependent", etc.
    lastUpdated: v.number(),
  })
    .index("by_zip_code", ["zipCode"])
    .index("by_city", ["city"]),

  // Building Permits
  buildingPermits: defineTable({
    permitNumber: v.string(),
    parcelId: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    zipCode: v.optional(v.string()),
    permitType: v.union(
      v.literal("new_construction"),
      v.literal("renovation"),
      v.literal("demolition"),
      v.literal("electrical"),
      v.literal("plumbing"),
      v.literal("hvac"),
      v.literal("roofing"),
      v.literal("other")
    ),
    workDescription: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    contractor: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    expirationDate: v.optional(v.string()),
    status: v.union(
      v.literal("applied"),
      v.literal("approved"),
      v.literal("issued"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("denied")
    ),
    inspectionStatus: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_permit_number", ["permitNumber"])
    .index("by_parcel_id", ["parcelId"])
    .index("by_city", ["city"])
    .index("by_permit_type", ["permitType"])
    .index("by_issue_date", ["issueDate"]),

  // Census/Demographics by Zip Code
  demographics: defineTable({
    zipCode: v.string(),
    city: v.optional(v.string()),
    population: v.optional(v.number()),
    medianHouseholdIncome: v.optional(v.number()),
    medianAge: v.optional(v.number()),
    ownerOccupiedPercent: v.optional(v.number()),
    renterOccupiedPercent: v.optional(v.number()),
    vacancyRate: v.optional(v.number()),
    medianHomeValue: v.optional(v.number()),
    medianRent: v.optional(v.number()),
    povertyRate: v.optional(v.number()),
    unemploymentRate: v.optional(v.number()),
    collegeEducatedPercent: v.optional(v.number()),
    dataYear: v.number(), // Census year
    lastUpdated: v.number(),
  })
    .index("by_zip_code", ["zipCode"])
    .index("by_city", ["city"]),

  // Flood Zones
  floodZones: defineTable({
    parcelId: v.optional(v.string()),
    address: v.optional(v.string()),
    zipCode: v.string(),
    city: v.string(),
    floodZone: v.string(), // A, AE, X, etc.
    floodZoneDescription: v.optional(v.string()),
    specialFloodHazardArea: v.boolean(),
    baseFloodElevation: v.optional(v.number()),
    insuranceRequired: v.optional(v.boolean()),
    mapPanel: v.optional(v.string()),
    effectiveDate: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_parcel_id", ["parcelId"])
    .index("by_zip_code", ["zipCode"])
    .index("by_city", ["city"])
    .index("by_flood_zone", ["floodZone"]),

  // ===== CODE VIOLATIONS - Critical for compliance checking =====
  codeViolations: defineTable({
    parcelId: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    zipCode: v.optional(v.string()),
    violationType: v.string(), // "tall_grass", "unsafe_structure", "unpermitted_work", etc.
    violationCode: v.optional(v.string()), // Municipal code reference
    violationDescription: v.string(),
    severity: v.union(
      v.literal("minor"),
      v.literal("major"),
      v.literal("critical")
    ),
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
    lastUpdated: v.number(),
  })
    .index("by_parcel_id", ["parcelId"])
    .index("by_address", ["address"])
    .index("by_city", ["city"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"])
    .index("by_violation_type", ["violationType"])
    .searchIndex("search_address", {
      searchField: "address",
      filterFields: ["city", "status"],
    }),

  // ===== POINT OF SALE (POS) REQUIREMENTS by Municipality =====
  posRequirements: defineTable({
    city: v.string(),
    posRequired: v.boolean(),
    posCost: v.optional(v.number()), // Fee in dollars
    inspectionType: v.optional(v.string()), // "interior_exterior", "exterior_only", etc.
    avgProcessingDays: v.optional(v.number()),
    escrowRequired: v.optional(v.boolean()),
    escrowPercent: v.optional(v.number()), // Percentage of repairs to escrow
    transferRestrictions: v.optional(v.string()),
    commonFailureItems: v.optional(v.array(v.string())),
    investorNotes: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactWebsite: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_city", ["city"]),

  // ===== RENTAL COMPS - For DSCR and cash flow analysis =====
  rentalComps: defineTable({
    parcelId: v.optional(v.string()),
    address: v.string(),
    city: v.string(),
    zipCode: v.string(),
    propertyType: v.string(), // SFR, duplex, triplex, etc.
    bedrooms: v.number(),
    bathrooms: v.number(),
    sqft: v.optional(v.number()),
    monthlyRent: v.number(),
    listDate: v.optional(v.string()),
    rentedDate: v.optional(v.string()),
    daysOnMarket: v.optional(v.number()),
    source: v.string(), // zillow, rentometer, mls, etc.
    lastUpdated: v.number(),
  })
    .index("by_city", ["city"])
    .index("by_zip", ["zipCode"])
    .index("by_property_type", ["propertyType"])
    .index("by_bedrooms", ["bedrooms"]),

  // ===== DEAL SCORES - Cached investment analysis =====
  dealScores: defineTable({
    parcelId: v.string(),
    address: v.string(),
    city: v.string(),
    zipCode: v.string(),
    overallScore: v.number(), // 0-100
    equityScore: v.number(),
    distressScore: v.number(),
    motivationScore: v.number(),
    marketScore: v.number(),
    complianceScore: v.number(),
    estimatedArv: v.optional(v.number()),
    estimatedRepairs: v.optional(v.number()),
    maxOffer: v.optional(v.number()),
    strategy: v.string(), // flip, brrrr, wholesale, rental
    analysisNotes: v.optional(v.string()),
    lastCalculated: v.number(),
  })
    .index("by_parcel_id", ["parcelId"])
    .index("by_city", ["city"])
    .index("by_score", ["overallScore"])
    .index("by_strategy", ["strategy"]),

  // ===== ANONYMOUS LEADS - Email captures from free users =====
  anonymousLeads: defineTable({
    email: v.string(),
    sessionId: v.string(),
    consentGiven: v.boolean(),
    capturedAt: v.number(),
    source: v.optional(v.string()), // where they came from
    messageCount: v.optional(v.number()), // how many messages they sent
    lastCity: v.optional(v.string()), // last city they searched
    convertedToUser: v.optional(v.boolean()),
    convertedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_session", ["sessionId"])
    .index("by_captured_at", ["capturedAt"]),

  // ===== MUNICIPALITY CODE MATRIX - Structured lookup for codes/permits =====
  municipalityCodeMatrix: defineTable({
    // Identity
    municipality: v.string(), // CLEVELAND, LAKEWOOD, OHIO STATE, CUYAHOGA COUNTY
    municipalityType: v.union(
      v.literal("city"),
      v.literal("village"),
      v.literal("township"),
      v.literal("county"),
      v.literal("state")
    ),
    population: v.optional(v.number()),

    // Contact Info
    buildingDeptPhone: v.optional(v.string()),
    buildingDeptWebsite: v.optional(v.string()),
    buildingDeptAddress: v.optional(v.string()),

    // ===== CODES ADOPTED =====
    buildingCode: v.string(), // "OBC" | "OBC+Local" | "Local"
    residentialCode: v.string(), // "ORC" | "ORC+Local" | "Local"
    electricalCode: v.string(), // "NEC2023" | "NEC2020" | "Local"
    plumbingCode: v.string(), // "OPC" | "OPC+Local"
    mechanicalCode: v.string(), // "OMC" | "OMC+Local"
    fireCode: v.string(), // "OFC" | "OFC+Local"
    propertyMaintenanceCode: v.string(), // "IPMC" | "Local" | "None"
    energyCode: v.optional(v.string()), // "IECC" | "Local"
    localAmendmentsNotes: v.optional(v.string()), // Key local differences

    // ===== POINT OF SALE INSPECTION =====
    pointOfSaleRequired: v.boolean(),
    pointOfSaleFee: v.optional(v.string()), // "$150" or "Varies"
    pointOfSaleNotes: v.optional(v.string()), // Requirements, validity period
    pointOfSaleValidDays: v.optional(v.number()), // How long is it valid

    // ===== RENTAL REGISTRATION =====
    rentalRegistrationRequired: v.boolean(),
    rentalRegistrationFee: v.optional(v.string()),
    rentalInspectionRequired: v.optional(v.boolean()),
    rentalInspectionFrequency: v.optional(v.string()), // "Annual", "Every 2 years"
    rentalRegistrationNotes: v.optional(v.string()),

    // ===== OCCUPANCY PERMIT =====
    occupancyPermitRequired: v.boolean(),
    occupancyPermitFee: v.optional(v.string()),
    occupancyPermitNotes: v.optional(v.string()),

    // ===== ROOF PERMIT =====
    roofPermitRequired: v.boolean(),
    roofPermitFee: v.optional(v.string()),
    roofPermitNotes: v.optional(v.string()),

    // ===== DECK PERMIT =====
    deckPermitRequired: v.boolean(),
    deckPermitFee: v.optional(v.string()),
    deckPermitThreshold: v.optional(v.string()), // "Over 200 sq ft" or "Any attached"
    deckPermitNotes: v.optional(v.string()),

    // ===== FENCE PERMIT =====
    fencePermitRequired: v.boolean(),
    fencePermitFee: v.optional(v.string()),
    fenceHeightLimit: v.optional(v.string()), // "6ft backyard, 4ft front"
    fencePermitNotes: v.optional(v.string()),

    // ===== HVAC PERMIT =====
    hvacPermitRequired: v.boolean(),
    hvacPermitFee: v.optional(v.string()),
    hvacLicensedContractorRequired: v.optional(v.boolean()),
    hvacPermitNotes: v.optional(v.string()),

    // ===== ELECTRICAL PERMIT =====
    electricalPermitRequired: v.boolean(),
    electricalPermitFee: v.optional(v.string()),
    electricalLicensedContractorRequired: v.boolean(),
    electricalPermitNotes: v.optional(v.string()),

    // ===== PLUMBING PERMIT =====
    plumbingPermitRequired: v.boolean(),
    plumbingPermitFee: v.optional(v.string()),
    plumbingLicensedContractorRequired: v.boolean(),
    plumbingPermitNotes: v.optional(v.string()),

    // ===== DEMOLITION PERMIT =====
    demolitionPermitRequired: v.boolean(),
    demolitionPermitFee: v.optional(v.string()),
    demolitionPermitNotes: v.optional(v.string()),

    // ===== SPECIAL REGULATIONS =====
    aduAllowed: v.boolean(), // Accessory Dwelling Units
    aduNotes: v.optional(v.string()),
    strAllowed: v.boolean(), // Short-term rentals (Airbnb)
    strPermitRequired: v.optional(v.boolean()),
    strNotes: v.optional(v.string()),
    historicDistricts: v.optional(v.boolean()),
    historicDistrictNotes: v.optional(v.string()),

    // ===== SMOKE/CO REQUIREMENTS =====
    smokeDetectorRequirements: v.optional(v.string()),
    coDetectorRequirements: v.optional(v.string()),

    // Metadata
    lastUpdated: v.number(),
    dataSource: v.optional(v.string()),
  })
    .index("by_municipality", ["municipality"])
    .index("by_type", ["municipalityType"])
    .index("by_pos_required", ["pointOfSaleRequired"])
    .index("by_rental_reg", ["rentalRegistrationRequired"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
