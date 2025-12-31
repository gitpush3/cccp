import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createOrUpdateUser = mutation({
  args: {
    email: v.string(),
    clerkId: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        clerkId: args.clerkId || existingUser.clerkId,
        name: args.name || existingUser.name,
        phone: args.phone || existingUser.phone,
        stripeCustomerId: args.stripeCustomerId || existingUser.stripeCustomerId,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      email: args.email,
      clerkId: args.clerkId,
      name: args.name,
      phone: args.phone,
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const updateStripeCustomerId = mutation({
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
