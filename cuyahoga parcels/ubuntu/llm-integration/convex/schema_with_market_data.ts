import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ===== EXISTING TABLES =====
  
  // Users table
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    subscriptionTier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    stripeCustomerId: v.optional(v.string()),
    questionsUsed: v.number(),
    questionsLimit: v.number(),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Municipalities table
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
    // NEW: Add zip codes for market data linking
    zipCodes: v.optional(v.array(v.string())),
  })
    .index("by_name", ["name"])
    .index("by_type", ["type"]),

  // Regulation URLs table
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

  // Regulation content cache
  regulationContent: defineTable({
    regulationUrlId: v.id("regulationUrls"),
    content: v.string(),
    summary: v.string(),
    lastFetched: v.number(),
    fetchCount: v.number(),
  }).index("by_regulation_url", ["regulationUrlId"]),

  // Conversations
  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    // NEW: Add selected municipality for context
    selectedMunicipalityId: v.optional(v.id("municipalities")),
    createdAt: v.number(),
    updatedAt: v.number(),
    messageCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_updated", ["userId", "updatedAt"]),

  // Chat messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    imageId: v.optional(v.id("_storage")),
    citedRegulations: v.array(v.id("regulationUrls")),
    citedMunicipalities: v.array(v.id("municipalities")),
    // NEW: Add cited market data
    citedMarketData: v.optional(v.array(v.id("marketData"))),
    tokenCount: v.optional(v.number()),
    cost: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_and_timestamp", ["conversationId", "timestamp"]),

  // LLM response cache
  responseCache: defineTable({
    queryHash: v.string(),
    response: v.string(),
    citedRegulations: v.array(v.id("regulationUrls")),
    hitCount: v.number(),
    createdAt: v.number(),
    lastUsed: v.number(),
  }).index("by_query_hash", ["queryHash"]),

  // Usage tracking
  usageLog: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    action: v.union(
      v.literal("text_query"),
      v.literal("photo_analysis"),
      v.literal("regulation_fetch"),
      v.literal("market_data_query") // NEW
    ),
    tokenCount: v.number(),
    cost: v.number(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),

  // Stripe subscriptions
  subscriptions: defineTable({
    userId: v.id("users"),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"]),

  // ===== NEW TABLES FOR REAL ESTATE DATA =====

  // Market data by zip code (from Redfin)
  marketData: defineTable({
    zipCode: v.string(),
    municipalityId: v.optional(v.id("municipalities")),
    
    // Pricing metrics
    medianSalePrice: v.optional(v.number()),
    medianPricePerSqFt: v.optional(v.number()),
    averageSalePrice: v.optional(v.number()),
    
    // Volume metrics
    homesSold: v.optional(v.number()),
    newListings: v.optional(v.number()),
    activeListings: v.optional(v.number()),
    pendingSales: v.optional(v.number()),
    
    // Time metrics
    medianDaysOnMarket: v.optional(v.number()),
    averageDaysOnMarket: v.optional(v.number()),
    
    // Inventory metrics
    monthsOfSupply: v.optional(v.number()),
    inventoryLevel: v.optional(v.number()),
    
    // Trend metrics
    monthOverMonthPriceChange: v.optional(v.number()),
    yearOverYearPriceChange: v.optional(v.number()),
    monthOverMonthVolumeChange: v.optional(v.number()),
    yearOverYearVolumeChange: v.optional(v.number()),
    
    // Metadata
    dataSource: v.string(), // "redfin", "attom", etc.
    dataMonth: v.string(), // "2025-12"
    lastUpdated: v.number(),
  })
    .index("by_zip", ["zipCode"])
    .index("by_municipality", ["municipalityId"])
    .index("by_zip_and_month", ["zipCode", "dataMonth"])
    .index("by_data_source", ["dataSource"]),

  // Property details (from Cuyahoga County or ATTOM)
  properties: defineTable({
    // Identifiers
    parcelId: v.string(),
    address: v.string(),
    zipCode: v.string(),
    municipalityId: v.optional(v.id("municipalities")),
    
    // Property characteristics
    propertyType: v.optional(v.string()), // "Single Family", "Condo", etc.
    yearBuilt: v.optional(v.number()),
    squareFeet: v.optional(v.number()),
    lotSize: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    stories: v.optional(v.number()),
    
    // Valuation
    appraisedValue: v.optional(v.number()),
    landValue: v.optional(v.number()),
    buildingValue: v.optional(v.number()),
    estimatedValue: v.optional(v.number()), // AVM if using ATTOM
    
    // Sales history
    lastSaleDate: v.optional(v.number()),
    lastSalePrice: v.optional(v.number()),
    
    // Ownership
    ownerName: v.optional(v.string()),
    ownerOccupied: v.optional(v.boolean()),
    
    // Location details
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    neighborhood: v.optional(v.string()),
    
    // Metadata
    dataSource: v.string(), // "cuyahoga_county", "attom"
    lastUpdated: v.number(),
  })
    .index("by_parcel", ["parcelId"])
    .index("by_zip", ["zipCode"])
    .index("by_municipality", ["municipalityId"])
    .index("by_address", ["address"]),

  // Demographics by zip code (from Census Bureau)
  demographics: defineTable({
    zipCode: v.string(),
    
    // Population
    population: v.optional(v.number()),
    households: v.optional(v.number()),
    medianAge: v.optional(v.number()),
    
    // Income
    medianHouseholdIncome: v.optional(v.number()),
    perCapitaIncome: v.optional(v.number()),
    povertyRate: v.optional(v.number()),
    
    // Housing
    totalHousingUnits: v.optional(v.number()),
    ownerOccupiedPercent: v.optional(v.number()),
    renterOccupiedPercent: v.optional(v.number()),
    medianHomeValue: v.optional(v.number()),
    medianRent: v.optional(v.number()),
    vacancyRate: v.optional(v.number()),
    
    // Education
    bachelorsDegreePercent: v.optional(v.number()),
    highSchoolGradPercent: v.optional(v.number()),
    
    // Metadata
    year: v.number(), // Census year (e.g., 2023)
    dataSource: v.string(), // "census_acs5"
    lastUpdated: v.number(),
  })
    .index("by_zip", ["zipCode"])
    .index("by_year", ["year"])
    .index("by_zip_and_year", ["zipCode", "year"]),

  // Zip code to municipality mapping
  zipCodeMunicipalities: defineTable({
    zipCode: v.string(),
    municipalityId: v.id("municipalities"),
    isPrimary: v.boolean(), // Some zip codes span multiple cities
  })
    .index("by_zip", ["zipCode"])
    .index("by_municipality", ["municipalityId"]),
});
