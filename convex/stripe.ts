import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { api, internal } from "./_generated/api";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

// Stripe SDK uses timers internally, so it must run in actions (Node environment).
export const getStripeSubscriptionStatus = internalAction({
  args: { stripeCustomerId: v.string() },
  handler: async (_ctx, args) => {
    if (!stripe) {
      throw new Error("Stripe not configured");
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: args.stripeCustomerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });

    let subscriptionStatus: "active" | "none" = "none";
    let endsAt: number | undefined = undefined;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0] as any;
      subscriptionStatus = subscription.status === "active" ? "active" : "none";

      if (subscriptionStatus === "active") {
        endsAt = subscription.current_period_end * 1000;
      }
    }

    return { subscriptionStatus, endsAt };
  },
});

export const setSubscriptionStatusByStripeCustomerId = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    subscriptionStatus: v.union(v.literal("active"), v.literal("none")),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .unique();

    if (!user) {
      return { updated: false };
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.subscriptionStatus,
      endsAt: args.endsAt,
    });

    return { updated: true };
  },
});

export const createCheckoutSession = action({
  args: {
    clerkId: v.string(),
    domain: v.optional(v.string()), // Allow client to pass current domain
  },
  handler: async (ctx, args): Promise<{ url?: string; error?: string }> => {
    if (!stripe) {
      return { error: "Stripe not configured" };
    }

    if (!process.env.STRIPE_PRICE_ID) {
      return {
        error:
          "Stripe price is not configured. Set STRIPE_PRICE_ID in the Convex deployment environment.",
      };
    }

    const domain = args.domain || process.env.SITE_URL || "http://localhost:5174";
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: args.clerkId,
    });

    if (!user) {
      return { error: "User not found" };
    }

    let stripeCustomerId = user.stripeCustomerId;

    // Create Stripe customer if doesn't exist (THEO'S PATTERN: create BEFORE checkout)
    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            clerkId: args.clerkId,
          },
        });

        // Store the customer ID in our database
        await ctx.runMutation(internal.users.updateStripeCustomerId, {
          userId: user._id,
          stripeCustomerId: customer.id,
        });

        stripeCustomerId = customer.id;
      } catch (error) {
        console.error("Error creating Stripe customer:", error);
        return { error: "Failed to create customer" };
      }
    }

    // Create checkout session for one-time $20 payment
    try {
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: "payment", // Changed to one-time payment instead of subscription
        success_url: `${domain}/chat?success=true`,
        cancel_url: `${domain}/join?canceled=true`,
        allow_promotion_codes: true, // Enable promo code input in Stripe checkout
        metadata: {
          clerkId: args.clerkId,
        },
      });

      return { url: session.url ?? undefined };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return { error: "Failed to create checkout session" };
    }
  },
});

// Action for frontend to call after successful checkout
// For one-time payments, grant access immediately
export const syncAfterSuccess = action({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // Get user
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: args.clerkId,
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // For one-time payments, grant access directly by clerkId
    // This sets subscriptionStatus to "active" for lifetime access
    // You can modify endsAt if you want time-limited access instead
    try {
      await ctx.runMutation(internal.users.grantAccessByClerkId, {
        clerkId: args.clerkId,
      });
      return { success: true };
    } catch (error) {
      console.error("Error granting access after payment:", error);
      return { success: false, error: "Failed to grant access" };
    }
  },
});

// Create promo codes for $1 first month (run this once to set up codes)
export const createPromoCodes = action({
  args: {},
  handler: async (ctx, args) => {
    if (!stripe) {
      throw new Error("Stripe not configured");
    }

    if (!process.env.STRIPE_PRICE_ID) {
      throw new Error("Stripe price not configured");
    }

    const promoCodes = [
      "LINKEDIN12",
      "SLACK12", 
      "REDDIT12",
      "TWITTER12",
      "FACEBOOK12",
      "DISCORD12",
      "YOUTUBE12",
      "PODCAST12",
      "BLOG12",
      "EMAIL12"
    ];

    const results = [];

    try {
      // First create a coupon for $18 off (making $19 subscription $1)
      const coupon = await stripe.coupons.create({
        id: "first-month-dollar",
        amount_off: 1800, // $18 off in cents
        currency: "usd",
        duration: "once",
        name: "$1 First Month",
        metadata: {
          description: "First month for $1 instead of $19"
        }
      });

      // Create promotion codes for each channel
      for (const code of promoCodes) {
        try {
          const promoCode = await stripe.promotionCodes.create({
            coupon: coupon.id,
            code: code,
            active: true,
            metadata: {
              channel: code.replace("12", ""),
              created_by: "system"
            }
          } as any);
          
          results.push({
            code: code,
            id: promoCode.id,
            status: "created"
          });
        } catch (error: any) {
          results.push({
            code: code,
            status: "error",
            error: error.message
          });
        }
      }

      return {
        success: true,
        coupon: coupon.id,
        promoCodes: results
      };

    } catch (error: any) {
      console.error("Error creating promo codes:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
});

// Theo's recommended events to track for subscription state changes
const allowedEvents: string[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated", 
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

export const createReferralCommission = internalMutation({
  args: {
    referrerId: v.id("users"),
    refereeId: v.id("users"),
    amount: v.number(),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if commission already exists for this payment
    const existing = await ctx.db
      .query("referralCommissions")
      .filter((q) => q.eq(q.field("paymentIntentId"), args.paymentIntentId))
      .first();

    if (existing) return { commissionId: existing._id, alreadyExists: true };

    const commissionId = await ctx.db.insert("referralCommissions", {
      referrerId: args.referrerId,
      refereeId: args.refereeId,
      amount: args.amount,
      paymentIntentId: args.paymentIntentId,
      status: "pending",
      createdAt: Date.now(),
    });

    // Update referrer's total earnings
    const referrer = await ctx.db.get(args.referrerId);
    if (referrer) {
      await ctx.db.patch(args.referrerId, {
        totalReferralEarnings: (referrer.totalReferralEarnings || 0) + args.amount,
      });
    }

    return { commissionId, alreadyExists: false };
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
      endsAt: undefined,
    });

    return { updated: true };
  },
});

export const handleWebhook = internalAction({
  args: {
    type: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    if (!allowedEvents.includes(args.type)) {
      return;
    }

    const eventData = args.data as any;
    const customerId = eventData.customer;

    // Handle subscription payments
    if (typeof customerId !== "string") {
      console.error(`[STRIPE WEBHOOK] No customer ID in event: ${args.type}`);
      return;
    }

    try {
      // 1. Sync subscription status
      const { subscriptionStatus, endsAt } = await ctx.runAction(
        internal.stripe.getStripeSubscriptionStatus,
        { stripeCustomerId: customerId }
      );

      await ctx.runMutation(internal.stripe.setSubscriptionStatusByStripeCustomerId, {
        stripeCustomerId: customerId,
        subscriptionStatus,
        endsAt,
      });

      // 2. Process referral commission on successful payment
      if (args.type === "payment_intent.succeeded" || args.type === "checkout.session.completed") {
        const amount = eventData.amount_total || eventData.amount || 0;
        const paymentIntentId = eventData.payment_intent || eventData.id;

        if (amount > 0 && paymentIntentId) {
          await ctx.runMutation(internal.stripe.processReferralCommission, {
            stripeCustomerId: customerId,
            paymentIntentId,
            amount,
          });
        }
      }
    } catch (error) {
      console.error(`[STRIPE WEBHOOK] Error:`, error);
      throw error;
    }
  },
});

export const createStripeAccountLink = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!stripe) throw new Error("Stripe not configured");

    const user = await ctx.runQuery(api.users.getUserById, { id: args.userId });
    if (!user) throw new Error("User not found");

    let stripeAccountId = user.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      await ctx.runMutation(internal.users.updateStripeAccountId, {
        userId: user._id,
        stripeAccountId,
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.SITE_URL}/referrals?refresh=true`,
      return_url: `${process.env.SITE_URL}/referrals?success=true`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  },
});

export const processReferralCommission = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    paymentIntentId: v.string(),
    amount: v.number(), // Gross amount in cents
  },
  handler: async (ctx, args) => {
    // 1. Find the referee (the user who just paid)
    const referee = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .unique();

    if (!referee || !referee.referredBy) return;

    // 2. Find the referrer
    const referrer = await ctx.db
      .query("users")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", referee.referredBy))
      .unique();

    if (!referrer) return;

    // 3. Calculate 1% commission
    const commissionAmount = Math.floor(args.amount * 0.01);
    if (commissionAmount <= 0) return;

    // 4. Record commission
    await ctx.db.insert("referralCommissions", {
      referrerId: referrer._id,
      refereeId: referee._id,
      amount: commissionAmount,
      paymentIntentId: args.paymentIntentId,
      status: "pending",
      createdAt: Date.now(),
    });

    // 5. Update referrer's total earnings
    await ctx.db.patch(referrer._id, {
      totalReferralEarnings: (referrer.totalReferralEarnings || 0) + commissionAmount,
    });

    return { referrerId: referrer._id, commissionAmount };
  },
});

export const payoutCommissionAction = internalAction({
  args: { commissionId: v.id("referralCommissions") },
  handler: async (ctx, args) => {
    if (!stripe) throw new Error("Stripe not configured");

    const commission = await ctx.runQuery(internal.stripe.getCommissionById, { id: args.commissionId });
    if (!commission || commission.status !== "pending") return;

    const referrer = await ctx.runQuery(api.users.getUserById, { id: commission.referrerId });
    if (!referrer || !referrer.stripeAccountId) return;

    try {
      // Transfer funds to the connected account (Stripe Connect)
      await stripe.transfers.create({
        amount: commission.amount,
        currency: "usd",
        destination: referrer.stripeAccountId,
        description: `Referral commission for payment ${commission.paymentIntentId}`,
      });

      await ctx.runMutation(internal.stripe.updateCommissionStatus, {
        id: args.commissionId,
        status: "paid",
      });
    } catch (error: any) {
      console.error("Payout failed:", error);
      // If the error is because the account isn't fully boarded, we leave it pending
      if (error.code === 'transfer_requires_onboarding') {
        return;
      }
      await ctx.runMutation(internal.stripe.updateCommissionStatus, {
        id: args.commissionId,
        status: "failed",
      });
    }
  },
});

export const processAllPendingPayouts = internalAction({
  args: {},
  handler: async (ctx) => {
    const pendingCommissions = await ctx.runQuery(internal.stripe.getPendingCommissions);
    
    for (const commission of pendingCommissions) {
      await ctx.runAction(internal.stripe.payoutCommissionAction, {
        commissionId: commission._id,
      });
    }
  },
});

export const getPendingCommissions = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("referralCommissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

export const getCommissionById = internalQuery({
  args: { id: v.id("referralCommissions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateCommissionStatus = internalMutation({
  args: { id: v.id("referralCommissions"), status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const getUserCommissions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("referralCommissions")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
      .order("desc")
      .collect();
  },
});
