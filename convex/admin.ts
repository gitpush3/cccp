import { query } from "./_generated/server";

// Real estate app admin dashboard stats

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const messages = await ctx.db.query("messages").collect();
    const anonymousLeads = await ctx.db.query("anonymousLeads").collect();
    const formSubmissions = await ctx.db.query("formSubmissions").collect();

    // Count users by subscription status
    const activeSubscribers = users.filter((u) => u.subscriptionStatus === "active").length;
    const freeUsers = users.filter((u) => u.subscriptionStatus !== "active").length;

    // Count messages
    const totalMessages = messages.length;
    const userMessages = messages.filter((m) => m.role === "user").length;

    // Leads stats
    const totalLeads = anonymousLeads.length;
    const convertedLeads = anonymousLeads.filter((l) => l.convertedToUser).length;

    // Form submissions
    const pendingForms = formSubmissions.filter((f) => f.status === "pending").length;
    const processedForms = formSubmissions.filter((f) => f.status === "processed" || f.status === "granted_access").length;

    return {
      totalUsers: users.length,
      activeSubscribers,
      freeUsers,
      totalMessages,
      userMessages,
      totalLeads,
      convertedLeads,
      conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0",
      pendingForms,
      processedForms,
    };
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const getAnonymousLeads = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("anonymousLeads").order("desc").collect();
  },
});

export const getFormSubmissions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("formSubmissions").order("desc").collect();
  },
});

export const getReferralStats = query({
  args: {},
  handler: async (ctx) => {
    const commissions = await ctx.db.query("referralCommissions").collect();
    const users = await ctx.db.query("users").collect();

    const referrersWithEarnings = users
      .filter((u) => (u.totalReferralEarnings || 0) > 0)
      .sort((a, b) => (b.totalReferralEarnings || 0) - (a.totalReferralEarnings || 0));

    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
    const paidCommissions = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.amount, 0);
    const pendingCommissions = commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      totalCommissions,
      paidCommissions,
      pendingCommissions,
      topReferrers: referrersWithEarnings.slice(0, 10),
      totalReferrers: referrersWithEarnings.length,
    };
  },
});

// Get data coverage stats
export const getDataCoverageStats = query({
  args: {},
  handler: async (ctx) => {
    const parcels = await ctx.db.query("parcels").take(1);
    const parcelCount = parcels.length > 0 ? "520K+" : "0";

    const municipalities = await ctx.db.query("municipalities").collect();
    const codeContent = await ctx.db.query("codeContent").collect();
    const contacts = await ctx.db.query("contacts").collect();
    const taxDelinquent = await ctx.db.query("taxDelinquent").collect();

    return {
      parcelCount,
      municipalityCount: municipalities.length,
      codeContentEntries: codeContent.length,
      contactEntries: contacts.length,
      taxDelinquentProperties: taxDelinquent.length,
    };
  },
});
