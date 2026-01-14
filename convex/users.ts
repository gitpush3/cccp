import { query, mutation, internalQuery, internalMutation, action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// N8N webhook base URL for 3bids
const N8N_WEBHOOK_BASE = "https://snowday555.app.n8n.cloud/webhook";

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

// Capture anonymous user email for lead generation
export const captureAnonymousEmail = mutation({
  args: {
    email: v.string(),
    sessionId: v.string(),
    consentGiven: v.boolean(),
    source: v.optional(v.string()),
    messageCount: v.optional(v.number()),
    lastCity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const capturedAt = Date.now();
    const source = args.source || "chat";

    // Check if email already captured
    const existing = await ctx.db
      .query("anonymousLeads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    let leadId;
    let isNewLead = false;

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        sessionId: args.sessionId,
        consentGiven: args.consentGiven,
        messageCount: args.messageCount,
        lastCity: args.lastCity,
      });
      leadId = existing._id;
    } else {
      // Create new lead
      isNewLead = true;
      leadId = await ctx.db.insert("anonymousLeads", {
        email: args.email,
        sessionId: args.sessionId,
        consentGiven: args.consentGiven,
        capturedAt,
        source,
        messageCount: args.messageCount,
        lastCity: args.lastCity,
        convertedToUser: false,
      });
    }

    // Send to n8n for Postgres sync and email campaign
    await ctx.scheduler.runAfter(0, internal.users.sendLeadToN8N, {
      email: args.email,
      sessionId: args.sessionId,
      consentGiven: args.consentGiven,
      capturedAt,
      source,
      messageCount: args.messageCount,
      lastCity: args.lastCity,
      isNewLead,
    });

    return leadId;
  },
});

// Check if a session has already given email
export const checkEmailCaptured = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("anonymousLeads")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    return lead ? { hasEmail: true, email: lead.email } : { hasEmail: false };
  },
});

// Internal action to send lead to n8n for Postgres sync and email campaign
export const sendLeadToN8N = internalAction({
  args: {
    email: v.string(),
    sessionId: v.string(),
    consentGiven: v.boolean(),
    capturedAt: v.number(),
    source: v.string(),
    messageCount: v.optional(v.number()),
    lastCity: v.optional(v.string()),
    isNewLead: v.boolean(),
  },
  handler: async (_ctx, args) => {
    const webhookUrl = `${N8N_WEBHOOK_BASE}/3bids-code-lead-capture`;

    const payload = {
      event_type: "code_lead_captured",
      source: "code.3bids.io",
      timestamp: new Date().toISOString(),
      lead: {
        email: args.email,
        session_id: args.sessionId,
        consent_given: args.consentGiven,
        captured_at: new Date(args.capturedAt).toISOString(),
        source: args.source,
        message_count: args.messageCount,
        last_city: args.lastCity,
        is_new_lead: args.isNewLead,
      },
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`N8N webhook sent successfully for ${args.email}`);
        return { success: true };
      } else {
        console.warn(`N8N webhook returned ${response.status} for ${args.email}`);
        return { success: false, status: response.status };
      }
    } catch (error) {
      console.error(`N8N webhook error for ${args.email}:`, error);
      return { success: false, error: String(error) };
    }
  },
});
