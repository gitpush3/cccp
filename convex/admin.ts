import { query } from "./_generated/server";

// Admin queries for Cuyahoga Code Chat

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const getReferralStats = query({
  args: {},
  handler: async (ctx) => {
    const commissions = await ctx.db.query("referralCommissions").collect();
    const users = await ctx.db.query("users").collect();

    const advisorsWithEarnings = users
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
      topAdvisors: advisorsWithEarnings.slice(0, 10),
      totalAdvisors: advisorsWithEarnings.length,
    };
  },
});
