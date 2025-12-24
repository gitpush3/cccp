import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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

  // Regulation content cache (optional, for frequently accessed regulations)
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

  // Usage tracking for billing
  usageLog: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    action: v.union(
      v.literal("text_query"),
      v.literal("photo_analysis"),
      v.literal("regulation_fetch")
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
});
