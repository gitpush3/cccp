import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Generate a unique referral code
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      subscriptionStatus: "none",
      referralCode,
      totalReferralEarnings: 0,
    });
  },
});

export const createOrUpdateGoogleUser = mutation({
  args: {
    googleId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_google_id", (q) => q.eq("googleId", args.googleId))
      .unique();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        picture: args.picture,
      });
      return existing._id;
    }

    // Create new user
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    return await ctx.db.insert("users", {
      googleId: args.googleId,
      email: args.email,
      name: args.name,
      picture: args.picture,
      subscriptionStatus: "none",
      referralCode,
      totalReferralEarnings: 0,
    });
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    // Look up user by Clerk subject (user ID)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    return user;
  },
});

// Mutation to create or get user on first login
export const getOrCreateUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    // Look up user by Clerk subject (user ID)
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    // Auto-create user if doesn't exist
    if (!user) {
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        email: identity.email || "",
        name: identity.name,
        subscriptionStatus: "none",
        referralCode,
        totalReferralEarnings: 0,
      });
      user = await ctx.db.get(userId);
    }
    
    return user;
  },
});

export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getUserByGoogleId = query({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_google_id", (q) => q.eq("googleId", args.googleId))
      .unique();
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateStripeCustomerId = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

// Grant access directly by clerkId (for one-time payments)
export const grantAccessByClerkId = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return { updated: false };
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: "active",
      // For one-time payments, you can set endsAt to undefined for lifetime access
      // or set a specific date if you want time-limited access
      endsAt: undefined,
    });

    return { updated: true };
  },
});

export const updateReferralCode = mutation({
  args: { referralCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");
    if (user.referredBy) return; // Already referred

    // Don't allow self-referral
    if (user.referralCode === args.referralCode) return;

    // Verify code exists
    const referrer = await ctx.db
      .query("users")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode))
      .unique();

    if (!referrer) return;

    await ctx.db.patch(user._id, {
      referredBy: args.referralCode,
    });
  },
});

export const updateStripeAccountId = internalMutation({
  args: {
    userId: v.id("users"),
    stripeAccountId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      stripeAccountId: args.stripeAccountId,
    });
  },
});

export const getReferralCount = query({
  args: { referralCode: v.string() },
  handler: async (ctx, args) => {
    const referrals = await ctx.db
      .query("users")
      .withIndex("by_referred_by", (q) => q.eq("referredBy", args.referralCode))
      .collect();
    return referrals.length;
  },
});
