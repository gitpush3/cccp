import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitFeedback = mutation({
  args: {
    sessionId: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    email: v.optional(v.string()),
    isHelpful: v.optional(v.union(v.literal("yes"), v.literal("no"), v.literal("too_early"))),
    roleInRealEstate: v.optional(v.string()),
    otherMarkets: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("userFeedback", {
      sessionId: args.sessionId,
      clerkId: args.clerkId,
      email: args.email,
      isHelpful: args.isHelpful,
      roleInRealEstate: args.roleInRealEstate,
      otherMarkets: args.otherMarkets,
      submittedAt: Date.now(),
    });
  },
});

export const hasFeedbackBeenSubmitted = query({
  args: {
    sessionId: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.clerkId) {
      const feedback = await ctx.db
        .query("userFeedback")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
        .first();
      return !!feedback;
    }
    if (args.sessionId) {
      const feedback = await ctx.db
        .query("userFeedback")
        .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
        .first();
      return !!feedback;
    }
    return false;
  },
});
