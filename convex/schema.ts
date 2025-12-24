import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  users: defineTable({
    clerkId: v.optional(v.string()),
    googleId: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("none"))),
    endsAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_google_id", ["googleId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

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
    type: v.union(v.literal("gov"), v.literal("commercial")),
    name: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_city", ["city"])
    .index("by_type", ["type"]),

  messages: defineTable({
    chatId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
  })
    .index("by_chat_id", ["chatId"])
    .index("by_user_id", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
