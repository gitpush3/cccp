import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").collect();
    const users = await ctx.db.query("users").collect();
    const installments = await ctx.db.query("installments").collect();

    const totalRevenue = bookings.reduce((sum, b) => sum + b.depositPaid, 0);
    const pendingPayments = installments.filter((i) => i.status === "pending").length;

    const statusCounts = {
      pending_deposit: bookings.filter((b) => b.status === "pending_deposit").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      fully_paid: bookings.filter((b) => b.status === "fully_paid").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      refunded: bookings.filter((b) => b.status === "refunded").length,
    };

    return {
      totalRevenue,
      totalBookings: bookings.length,
      totalUsers: users.length,
      pendingPayments,
      statusCounts,
    };
  },
});

export const getAllBookings = query({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").order("desc").collect();

    return Promise.all(
      bookings.map(async (booking) => {
        const trip = await ctx.db.get(booking.tripId);
        const pkg = await ctx.db.get(booking.packageId);
        const user = await ctx.db.get(booking.userId);
        const advisor = booking.advisorId ? await ctx.db.get(booking.advisorId) : null;
        const installments = await ctx.db
          .query("installments")
          .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
          .collect();

        return {
          ...booking,
          trip,
          package: pkg,
          user,
          advisor,
          installments,
        };
      })
    );
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const getPendingPayments = query({
  args: {},
  handler: async (ctx) => {
    const installments = await ctx.db
      .query("installments")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return Promise.all(
      installments.map(async (installment) => {
        const booking = await ctx.db.get(installment.bookingId);
        let trip = null;
        let user = null;

        if (booking) {
          trip = await ctx.db.get(booking.tripId);
          user = await ctx.db.get(booking.userId);
        }

        return {
          ...installment,
          booking: booking
            ? {
                ...booking,
                trip,
                user,
                metadata: booking.metadata,
              }
            : null,
        };
      })
    );
  },
});

export const getBookingDetails = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;

    const trip = await ctx.db.get(booking.tripId);
    const pkg = await ctx.db.get(booking.packageId);
    const user = await ctx.db.get(booking.userId);
    const advisor = booking.advisorId ? await ctx.db.get(booking.advisorId) : null;
    const installments = await ctx.db
      .query("installments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return {
      ...booking,
      trip,
      package: pkg,
      user,
      advisor,
      installments,
    };
  },
});

export const getAllTrips = query({
  args: {},
  handler: async (ctx) => {
    const trips = await ctx.db.query("trips").order("desc").collect();

    return Promise.all(
      trips.map(async (trip) => {
        const packages = await ctx.db
          .query("packages")
          .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
          .collect();

        const bookings = await ctx.db
          .query("bookings")
          .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
          .collect();

        return {
          ...trip,
          packages,
          bookingCount: bookings.length,
          revenue: bookings.reduce((sum, b) => sum + b.depositPaid, 0),
        };
      })
    );
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
