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
    // Usage tracking for billing
    questionsUsed: v.optional(v.number()),
    questionsLimit: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_google_id", ["googleId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

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

  messages: defineTable({
    chatId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    // New fields for RAG citations
    citedRegulations: v.optional(v.array(v.id("regulationUrls"))),
    citedMunicipalities: v.optional(v.array(v.id("municipalities"))),
    tokenCount: v.optional(v.number()),
    cost: v.optional(v.number()),
  })
    .index("by_chat_id", ["chatId"])
    .index("by_user_id", ["userId"]),

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
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
