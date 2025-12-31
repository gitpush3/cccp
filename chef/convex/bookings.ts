import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const getUserBookings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    // Get trip details for each booking
    const bookingsWithTrips = await Promise.all(
      bookings.map(async (booking) => {
        const trip = await ctx.db
          .query("trips")
          .withIndex("by_trip_id", (q) => q.eq("tripId", booking.tripId))
          .unique();
        
        const installments = await ctx.db
          .query("installments")
          .withIndex("by_booking_id", (q) => q.eq("bookingId", booking._id))
          .collect();

        return {
          ...booking,
          trip,
          installments,
        };
      })
    );

    return bookingsWithTrips;
  },
});

export const getBookingById = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== userId) {
      return null;
    }

    const trip = await ctx.db
      .query("trips")
      .withIndex("by_trip_id", (q) => q.eq("tripId", booking.tripId))
      .unique();

    const installments = await ctx.db
      .query("installments")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", booking._id))
      .order("asc")
      .collect();

    const travelers = await ctx.db
      .query("travelers")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", booking._id))
      .collect();

    return {
      ...booking,
      trip,
      installments,
      travelers,
    };
  },
});

export const createBooking = mutation({
  args: {
    userId: v.id("users"),
    agentId: v.optional(v.id("agents")),
    referralCode: v.optional(v.string()),
    stripeCustomerId: v.string(),
    stripePaymentMethodId: v.string(),
    tripId: v.string(),
    package: v.string(),
    occupancy: v.number(),
    totalAmount: v.number(),
    paymentFrequency: v.union(
      v.literal("weekly"),
      v.literal("bi-weekly"),
      v.literal("monthly"),
      v.literal("lump-sum")
    ),
    cutoffDate: v.string(),
    stripeCheckoutSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If referral code provided but no agentId, look up the agent
    let agentId = args.agentId;
    if (!agentId && args.referralCode) {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode!))
        .unique();
      if (agent && agent.isActive) {
        agentId = agent._id;
      }
    }

    const bookingId = await ctx.db.insert("bookings", {
      ...args,
      agentId,
      amountPaid: 0,
      status: "active",
      createdAt: Date.now(),
    });

    // Create installment schedule if not lump sum
    if (args.paymentFrequency !== "lump-sum") {
      await ctx.runMutation(internal.installments.createInstallmentSchedule, {
        bookingId,
        totalAmount: args.totalAmount,
        paymentFrequency: args.paymentFrequency,
        cutoffDate: args.cutoffDate,
      });
    }

    return bookingId;
  },
});

export const updatePaymentFrequency = mutation({
  args: {
    bookingId: v.id("bookings"),
    newFrequency: v.union(
      v.literal("weekly"),
      v.literal("bi-weekly"),
      v.literal("monthly"),
      v.literal("lump-sum")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== userId) {
      throw new Error("Booking not found");
    }

    // Cancel existing pending installments
    const pendingInstallments = await ctx.db
      .query("installments")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const installment of pendingInstallments) {
      await ctx.db.patch(installment._id, { status: "cancelled" });
    }

    // Update booking frequency
    await ctx.db.patch(args.bookingId, {
      paymentFrequency: args.newFrequency,
    });

    // Create new installment schedule
    const remainingAmount = booking.totalAmount - booking.amountPaid;
    if (args.newFrequency !== "lump-sum" && remainingAmount > 0) {
      await ctx.runMutation(internal.installments.createInstallmentSchedule, {
        bookingId: args.bookingId,
        totalAmount: remainingAmount,
        paymentFrequency: args.newFrequency,
        cutoffDate: booking.cutoffDate,
      });
    }
  },
});

export const payOffEarly = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.userId !== userId) {
      throw new Error("Booking not found");
    }

    const remainingAmount = booking.totalAmount - booking.amountPaid;
    if (remainingAmount <= 0) {
      throw new Error("Booking is already fully paid");
    }

    // Cancel all pending installments
    const pendingInstallments = await ctx.db
      .query("installments")
      .withIndex("by_booking_id", (q) => q.eq("bookingId", args.bookingId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const installment of pendingInstallments) {
      await ctx.db.patch(installment._id, { status: "cancelled" });
    }

    // Note: The actual payment will be triggered by an action
    return { 
      remainingAmount, 
      stripeCustomerId: booking.stripeCustomerId, 
      stripePaymentMethodId: booking.stripePaymentMethodId 
    };
  },
});

export const markAsPaid = mutation({
  args: { 
    bookingId: v.id("bookings"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const newAmountPaid = booking.amountPaid + args.amount;
    await ctx.db.patch(args.bookingId, {
      amountPaid: newAmountPaid,
      status: newAmountPaid >= booking.totalAmount ? "completed" : booking.status,
    });
  },
});
