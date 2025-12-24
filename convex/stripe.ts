import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { api, internal } from "./_generated/api";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

// Theo's pattern: Single function to sync all Stripe data to DB
export const syncStripeDataToDB = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    if (!stripe) {
      throw new Error("Stripe not configured");
    }

    // Fetch latest subscription data from Stripe
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
        endsAt = subscription.current_period_end * 1000; // Convert to milliseconds
      }
    }

    // Update user in database
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        subscriptionStatus,
        endsAt,
      });
    }

    return { subscriptionStatus, endsAt };
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

    // Create checkout session with existing customer
    try {
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId, // Always use existing customer
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Architect Pro Subscription",
                description: "Access to municipal codes, AI assistance, and expert tips",
              },
              unit_amount: 4900, // $49.00
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${domain}/dashboard?success=true`,
        cancel_url: `${domain}/pricing?canceled=true`,
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

// Action for frontend to call after successful checkout (THEO'S PATTERN)
export const syncAfterSuccess = action({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // Get user and their stripeCustomerId
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: args.clerkId,
    });

    if (!user || !user.stripeCustomerId) {
      return { success: false, error: "User or customer not found" };
    }

    // Sync latest data from Stripe
    try {
      await ctx.runMutation(internal.stripe.syncStripeDataToDB, {
        stripeCustomerId: user.stripeCustomerId,
      });
      return { success: true };
    } catch (error) {
      console.error("Error syncing after success:", error);
      return { success: false, error: "Failed to sync subscription data" };
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

export const handleWebhook = internalMutation({
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
      await ctx.runMutation(internal.stripe.syncStripeDataToDB, {
        stripeCustomerId: customerId,
      });
    } catch (error) {
      console.error(`[STRIPE WEBHOOK] Error syncing data for customer ${customerId}:`, error);
      throw error;
    }
  },
});
