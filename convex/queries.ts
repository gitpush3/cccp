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

// Note: Message limits have been removed. Users now get unlimited messages
// after providing email + consent. This query is kept for potential future use.
export const getUserMessageLimits = query({
  args: { 
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity && args.sessionId) {
      // Anonymous user - unlimited messages after email consent
      return {
        isAuthenticated: false,
        isSubscribed: false,
        messagesUsed: 0,
        messagesLimit: -1, // -1 means unlimited
        tier: "anonymous" as const
      };
    }
    
    if (identity && args.userId) {
      // Authenticated user
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
        .unique();
      
      const isSubscribed = user?.subscriptionStatus === "active";
      
      return {
        isAuthenticated: true,
        isSubscribed,
        messagesUsed: 0,
        messagesLimit: -1, // -1 means unlimited
        tier: isSubscribed ? "subscribed" : "authenticated" as const
      };
    }
    
    return {
      isAuthenticated: false,
      isSubscribed: false,
      messagesUsed: 0,
      messagesLimit: -1,
      tier: "anonymous" as const
    };
  },
});
