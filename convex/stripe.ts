import { action, internalAction, internalMutation } from "./_generated/server";
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
          });
          
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

export const handleWebhook = internalAction({
  args: {
    type: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Skip processing if the event isn't one we track
    if (!allowedEvents.includes(args.type)) {
      return;
    }

    // Extract customer ID from the event data
    const eventData = args.data as any;
    const customerId = eventData.customer;

    if (typeof customerId !== "string") {
      console.error(`[STRIPE WEBHOOK] No customer ID in event: ${args.type}`);
      return;
    }

    // Use Theo's pattern: Always sync complete state from Stripe
    try {
      const { subscriptionStatus, endsAt } = await ctx.runAction(
        internal.stripe.getStripeSubscriptionStatus,
        { stripeCustomerId: customerId }
      );

      await ctx.runMutation(internal.stripe.setSubscriptionStatusByStripeCustomerId, {
        stripeCustomerId: customerId,
        subscriptionStatus,
        endsAt,
      });
    } catch (error) {
      console.error(`[STRIPE WEBHOOK] Error syncing data for customer ${customerId}:`, error);
      throw error;
    }
  },
});
