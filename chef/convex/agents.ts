import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Generate a unique referral code
function generateReferralCode(agencyName: string): string {
  const prefix = agencyName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

// ============ QUERIES ============

export const getAllAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

export const getActiveAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getAgentById = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

export const getAgentByReferralCode = query({
  args: { referralCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode))
      .unique();
  },
});

export const getAgentByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

// Get all bookings for an agent
export const getAgentBookings = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("agentId"), args.agentId))
      .collect();

    // Enrich with user and trip data
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const user = await ctx.db.get(booking.userId);
        const trip = await ctx.db
          .query("trips")
          .withIndex("by_trip_id", (q) => q.eq("tripId", booking.tripId))
          .unique();
        return { ...booking, user, trip };
      })
    );

    return enrichedBookings;
  },
});

// Get agent stats (for dashboard)
export const getAgentStats = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("agentId"), args.agentId))
      .collect();

    const totalBookings = bookings.length;
    const totalCommitted = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalPaid = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const totalOutstanding = totalCommitted - totalPaid;
    const activeBookings = bookings.filter((b) => b.status === "active").length;
    const completedBookings = bookings.filter((b) => b.status === "completed").length;

    return {
      totalBookings,
      totalCommitted,
      totalPaid,
      totalOutstanding,
      activeBookings,
      completedBookings,
    };
  },
});

// ============ MUTATIONS ============

export const createAgent = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    agencyName: v.string(),
    commissionRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      throw new Error("An agent with this email already exists");
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(args.agencyName);
    
    // Ensure uniqueness
    let codeExists = await ctx.db
      .query("agents")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
      .unique();

    while (codeExists) {
      referralCode = generateReferralCode(args.agencyName);
      codeExists = await ctx.db
        .query("agents")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
        .unique();
    }

    return await ctx.db.insert("agents", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      agencyName: args.agencyName,
      referralCode,
      commissionRate: args.commissionRate || 10, // Default 10%
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateAgent = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    agencyName: v.optional(v.string()),
    commissionRate: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { agentId, ...updates } = args;
    
    // Filter out undefined values
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(agentId, cleanUpdates);
  },
});

export const deactivateAgent = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, { isActive: false });
  },
});

export const regenerateReferralCode = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    let referralCode = generateReferralCode(agent.agencyName);
    
    let codeExists = await ctx.db
      .query("agents")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
      .unique();

    while (codeExists) {
      referralCode = generateReferralCode(agent.agencyName);
      codeExists = await ctx.db
        .query("agents")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", referralCode))
        .unique();
    }

    await ctx.db.patch(args.agentId, { referralCode });
    return referralCode;
  },
});
