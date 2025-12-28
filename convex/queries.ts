import { query } from "./_generated/server";
import { v } from "convex/values";

export const countMessagesByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").withIndex("by_user_id", (q) => q.eq("userId", args.userId)).collect();
    return messages.length;
  },
});

export const countAnonymousMessages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isAnonymous"), true))
      .collect();
    return messages.length;
  },
});

export const getUserMessageLimits = query({
  args: { 
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity && args.sessionId) {
      // Anonymous user
      const anonymousCount = await ctx.db
        .query("messages")
        .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
        .filter((q) => q.eq(q.field("isAnonymous"), true))
        .collect();
      
      return {
        isAuthenticated: false,
        isSubscribed: false,
        messagesUsed: anonymousCount.length,
        messagesLimit: 5,
        tier: "anonymous" as const
      };
    }
    
    if (identity && args.userId) {
      // Authenticated user
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
        .unique();
      
      const userMessages = await ctx.db
        .query("messages")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .filter((q) => q.neq(q.field("isAnonymous"), true))
        .collect();
      
      const isSubscribed = user?.subscriptionStatus === "active";
      
      return {
        isAuthenticated: true,
        isSubscribed,
        messagesUsed: userMessages.length,
        messagesLimit: isSubscribed ? -1 : 5, // -1 means unlimited
        tier: isSubscribed ? "subscribed" : "authenticated" as const
      };
    }
    
    return {
      isAuthenticated: false,
      isSubscribed: false,
      messagesUsed: 0,
      messagesLimit: 5,
      tier: "anonymous" as const
    };
  },
});
