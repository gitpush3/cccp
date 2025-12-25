import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ===== PARCEL DATA (NEW) =====
  
  // Complete parcel database - ~520,000 records for all of Cuyahoga County
  parcels: defineTable({
    // Identification
    parcelId: v.string(), // PARCEL_ID or PARCELPIN
    parcelPin: v.optional(v.string()),
    bookPage: v.optional(v.string()),
    parcelType: v.optional(v.string()), // LAND, CONDO, AIR, LEASE, MOBILE, MINERAL, MULTI
    parcelYear: v.optional(v.number()),
    
    // Address
    fullAddress: v.string(), // PAR_ADDR_ALL - indexed for search
    streetNumber: v.optional(v.string()),
    streetName: v.optional(v.string()),
    city: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    unit: v.optional(v.string()),
    
    // Ownership
    currentOwner: v.optional(v.string()), // PARCEL_OWNER
    deedOwner: v.optional(v.string()),
    grantee: v.optional(v.string()), // Current owner from deed
    grantor: v.optional(v.string()), // Previous owner
    
    // Mailing address (for tax bills)
    mailName: v.optional(v.string()),
    mailAddress: v.optional(v.string()),
    mailCity: v.optional(v.string()),
    mailState: v.optional(v.string()),
    mailZip: v.optional(v.string()),
    
    // Sales history
    lastSaleDate: v.optional(v.number()), // TRANSFER_DATE
    lastSalePrice: v.optional(v.number()), // SALE_PRICE
    saleType: v.optional(v.string()),
    
    // Property characteristics
    landUseCode: v.optional(v.string()),
    landUseDescription: v.optional(v.string()),
    totalAcreage: v.optional(v.number()),
    totalLandSqFt: v.optional(v.number()),
    
    // Building info
    resBuildingCount: v.optional(v.number()),
    comBuildingCount: v.optional(v.number()),
    resLivingUnits: v.optional(v.number()),
    comLivingUnits: v.optional(v.number()),
    yearBuilt: v.optional(v.number()),
    stories: v.optional(v.number()),
    style: v.optional(v.string()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    totalLivingArea: v.optional(v.number()),
    
    // Valuation (tax assessment)
    certifiedTaxLand: v.optional(v.number()),
    certifiedTaxBuilding: v.optional(v.number()),
    certifiedTaxTotal: v.optional(v.number()),
    certifiedExemptLand: v.optional(v.number()),
    certifiedExemptBuilding: v.optional(v.number()),
    certifiedAbatedLand: v.optional(v.number()),
    certifiedAbatedBuilding: v.optional(v.number()),
    grossCertifiedTotal: v.optional(v.number()),
    
    // Utilities
    electricity: v.optional(v.boolean()),
    gas: v.optional(v.boolean()),
    sewer: v.optional(v.boolean()),
    water: v.optional(v.boolean()),
    
    // Appraisal
    neighborhoodCode: v.optional(v.string()),
    
    // Metadata
    dataSource: v.string(), // "cuyahoga_county"
    lastUpdated: v.number(),
  })
    .index("by_parcel_id", ["parcelId"])
    .index("by_address", ["fullAddress"])
    .index("by_zip", ["zipCode"])
    .index("by_city", ["city"])
    .index("by_owner", ["currentOwner"])
    .searchIndex("search_address", {
      searchField: "fullAddress",
      filterFields: ["city", "zipCode"],
    }),

  // ===== EXISTING TABLES (from previous schema) =====
  
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
    zipCodes: v.optional(v.array(v.string())),
  })
    .index("by_name", ["name"])
    .index("by_type", ["type"]),

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

  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    selectedMunicipalityId: v.optional(v.id("municipalities")),
    createdAt: v.number(),
    updatedAt: v.number(),
    messageCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_updated", ["userId", "updatedAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    imageId: v.optional(v.id("_storage")),
    citedRegulations: v.array(v.id("regulationUrls")),
    citedMunicipalities: v.array(v.id("municipalities")),
    citedParcels: v.optional(v.array(v.id("parcels"))), // NEW
    tokenCount: v.optional(v.number()),
    cost: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_and_timestamp", ["conversationId", "timestamp"]),

  // Market data (from previous schema)
  marketData: defineTable({
    zipCode: v.string(),
    municipalityId: v.optional(v.id("municipalities")),
    medianSalePrice: v.optional(v.number()),
    medianPricePerSqFt: v.optional(v.number()),
    homesSold: v.optional(v.number()),
    newListings: v.optional(v.number()),
    medianDaysOnMarket: v.optional(v.number()),
    monthsOfSupply: v.optional(v.number()),
    yearOverYearPriceChange: v.optional(v.number()),
    dataSource: v.string(),
    dataMonth: v.string(),
    lastUpdated: v.number(),
  })
    .index("by_zip", ["zipCode"])
    .index("by_zip_and_month", ["zipCode", "dataMonth"]),

  // Other existing tables...
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
});
