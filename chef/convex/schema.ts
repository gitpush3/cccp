import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Travel Agents table
  agents: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    agencyName: v.string(),
    referralCode: v.string(), // Unique code like "AGENT-ABC123"
    commissionRate: v.optional(v.number()), // Percentage, e.g., 10 for 10%
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_referral_code", ["referralCode"]),

  users: defineTable({
    email: v.string(),
    clerkId: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  }).index("by_email", ["email"])
    .index("by_clerk_id", ["clerkId"]),

  trips: defineTable({
    tripId: v.string(),
    tripName: v.string(),
    travelDate: v.string(),
    stripeProductId: v.string(),
    packages: v.any(), // JSON object mapping package names to prices/links
    isActive: v.optional(v.boolean()),
  }).index("by_trip_id", ["tripId"]),

  bookings: defineTable({
    userId: v.id("users"),
    agentId: v.optional(v.id("agents")), // Links booking to travel agent
    referralCode: v.optional(v.string()), // Store the code used at booking time
    stripeCustomerId: v.string(),
    stripePaymentMethodId: v.string(),
    tripId: v.string(),
    package: v.string(),
    occupancy: v.number(),
    totalAmount: v.number(),
    amountPaid: v.number(),
    paymentFrequency: v.union(
      v.literal("weekly"),
      v.literal("bi-weekly"), 
      v.literal("monthly"),
      v.literal("lump-sum")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("overdue")
    ),
    cutoffDate: v.string(),
    stripeCheckoutSessionId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user_id", ["userId"])
    .index("by_trip_id", ["tripId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  travelers: defineTable({
    bookingId: v.id("bookings"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    passport: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  }).index("by_booking_id", ["bookingId"]),

  installments: defineTable({
    bookingId: v.id("bookings"),
    dueDate: v.string(),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    attempts: v.number(),
    nextRetryAt: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  }).index("by_booking_id", ["bookingId"])
    .index("by_due_date", ["dueDate"])
    .index("by_status", ["status"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
