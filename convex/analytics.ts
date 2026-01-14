import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Track a chat message for analytics
export const trackMessage = mutation({
  args: {
    sessionId: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    chatId: v.string(),
    jurisdiction: v.string(),
    isAnonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find existing analytics record for this chat
    const existing = await ctx.db
      .query("chatAnalytics")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        messageCount: existing.messageCount + 1,
        lastMessageAt: now,
      });
    } else {
      // Create new record
      await ctx.db.insert("chatAnalytics", {
        sessionId: args.sessionId,
        clerkId: args.clerkId,
        chatId: args.chatId,
        jurisdiction: args.jurisdiction,
        messageCount: 1,
        firstMessageAt: now,
        lastMessageAt: now,
        isAnonymous: args.isAnonymous,
      });
    }
  },
});

// Get overall chat statistics
export const getChatStats = query({
  args: {},
  handler: async (ctx) => {
    const allAnalytics = await ctx.db.query("chatAnalytics").collect();
    
    const totalChats = allAnalytics.length;
    const totalMessages = allAnalytics.reduce((sum, a) => sum + a.messageCount, 0);
    const anonymousChats = allAnalytics.filter(a => a.isAnonymous).length;
    const authenticatedChats = allAnalytics.filter(a => !a.isAnonymous).length;
    
    // Get unique users
    const uniqueSessionIds = new Set(allAnalytics.filter(a => a.sessionId).map(a => a.sessionId));
    const uniqueClerkIds = new Set(allAnalytics.filter(a => a.clerkId).map(a => a.clerkId));
    
    // Get jurisdiction breakdown
    const jurisdictionCounts: Record<string, number> = {};
    for (const a of allAnalytics) {
      jurisdictionCounts[a.jurisdiction] = (jurisdictionCounts[a.jurisdiction] || 0) + a.messageCount;
    }
    const topJurisdictions = Object.entries(jurisdictionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([jurisdiction, count]) => ({ jurisdiction, count }));

    // Get power users (top 10 by message count)
    const userMessageCounts: Record<string, { id: string; type: string; count: number; lastActive: number }> = {};
    for (const a of allAnalytics) {
      const key = a.clerkId || a.sessionId || "unknown";
      const type = a.clerkId ? "authenticated" : "anonymous";
      if (!userMessageCounts[key]) {
        userMessageCounts[key] = { id: key, type, count: 0, lastActive: 0 };
      }
      userMessageCounts[key].count += a.messageCount;
      userMessageCounts[key].lastActive = Math.max(userMessageCounts[key].lastActive, a.lastMessageAt);
    }
    const powerUsers = Object.values(userMessageCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Recent activity (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentChats = allAnalytics.filter(a => a.lastMessageAt > oneDayAgo);
    const messagesLast24h = recentChats.reduce((sum, a) => {
      // Only count messages from last 24h (approximate)
      if (a.firstMessageAt > oneDayAgo) {
        return sum + a.messageCount;
      }
      // Estimate based on time
      return sum + Math.ceil(a.messageCount * 0.5);
    }, 0);

    // Get time-based stats
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const chatsLast7Days = allAnalytics.filter(a => a.lastMessageAt > sevenDaysAgo).length;
    const chatsLast30Days = allAnalytics.filter(a => a.lastMessageAt > thirtyDaysAgo).length;

    return {
      totalChats,
      totalMessages,
      anonymousChats,
      authenticatedChats,
      uniqueAnonymousUsers: uniqueSessionIds.size,
      uniqueAuthenticatedUsers: uniqueClerkIds.size,
      topJurisdictions,
      powerUsers,
      messagesLast24h,
      chatsLast24h: recentChats.length,
      chatsLast7Days,
      chatsLast30Days,
    };
  },
});

// Get recent chat activity
export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const recentChats = await ctx.db
      .query("chatAnalytics")
      .withIndex("by_last_message")
      .order("desc")
      .take(limit);

    // Enrich with user info if available
    const enrichedChats = await Promise.all(
      recentChats.map(async (chat) => {
        let userInfo = null;
        if (chat.clerkId) {
          const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", chat.clerkId))
            .first();
          if (user) {
            userInfo = { email: user.email, name: user.name };
          }
        }
        return {
          ...chat,
          userInfo,
        };
      })
    );

    return enrichedChats;
  },
});

// Get feedback summary
export const getFeedbackSummary = query({
  args: {},
  handler: async (ctx) => {
    const allFeedback = await ctx.db.query("userFeedback").collect();
    
    const helpfulCounts = {
      yes: allFeedback.filter(f => f.isHelpful === "yes").length,
      no: allFeedback.filter(f => f.isHelpful === "no").length,
      too_early: allFeedback.filter(f => f.isHelpful === "too_early").length,
    };

    // Get role breakdown
    const roles: Record<string, number> = {};
    for (const f of allFeedback) {
      if (f.roleInRealEstate) {
        const role = f.roleInRealEstate.toLowerCase().trim();
        roles[role] = (roles[role] || 0) + 1;
      }
    }

    // Get market requests
    const markets: Record<string, number> = {};
    for (const f of allFeedback) {
      if (f.otherMarkets) {
        const market = f.otherMarkets.toLowerCase().trim();
        markets[market] = (markets[market] || 0) + 1;
      }
    }

    // Get emails collected
    const emailsCollected = allFeedback.filter(f => f.email).length;

    return {
      totalFeedback: allFeedback.length,
      helpfulCounts,
      roles: Object.entries(roles).sort((a, b) => b[1] - a[1]),
      markets: Object.entries(markets).sort((a, b) => b[1] - a[1]),
      emailsCollected,
      recentFeedback: allFeedback
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 10),
    };
  },
});
