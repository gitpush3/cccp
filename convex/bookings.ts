import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getUserByReferralCode = internalQuery({
  args: { referralCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode))
      .unique();
  },
});

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Check users table for existing user with this email
    const users = await ctx.db.query("users").collect();
    return users.find((u) => u.email === args.email) || null;
  },
});

export const createGuestUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    referredBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate referral code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let referralCode = "";
    for (let i = 0; i < 6; i++) {
      referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      referralCode,
      referredBy: args.referredBy,
      subscriptionStatus: "none",
    });

    return userId;
  },
});

export const createBooking = internalMutation({
  args: {
    userId: v.id("users"),
    tripId: v.id("trips"),
    packageId: v.id("packages"),
    advisorId: v.optional(v.id("users")),
    totalAmount: v.number(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    const bookingId = await ctx.db.insert("bookings", {
      userId: args.userId,
      tripId: args.tripId,
      packageId: args.packageId,
      advisorId: args.advisorId,
      totalAmount: args.totalAmount,
      depositPaid: 0,
      status: "pending_deposit",
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return bookingId;
  },
});

export const confirmBookingDeposit = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    depositAmount: v.number(),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return;

    await ctx.db.patch(args.bookingId, {
      depositPaid: args.depositAmount,
      status: "confirmed",
    });

    // Calculate installments
    const pkg = await ctx.db.get(booking.packageId);
    const trip = await ctx.db.get(booking.tripId);
    if (!pkg || !trip) return;

    const remainingBalance = booking.totalAmount - args.depositAmount;
    if (remainingBalance <= 0) {
      await ctx.db.patch(args.bookingId, { status: "fully_paid" });
      return;
    }

    // Calculate monthly installments until cutoff date
    const now = new Date();
    const cutoff = new Date(trip.cutoffDate);
    const monthsRemaining = Math.max(
      1,
      Math.ceil((cutoff.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000))
    );

    const installmentAmount = Math.ceil(remainingBalance / monthsRemaining);

    // Create installment records
    for (let i = 0; i < monthsRemaining; i++) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      dueDate.setDate(1); // Due on the 1st of each month

      const amount = i === monthsRemaining - 1
        ? remainingBalance - installmentAmount * (monthsRemaining - 1) // Last installment gets remainder
        : installmentAmount;

      await ctx.db.insert("installments", {
        bookingId: args.bookingId,
        amount,
        dueDate: dueDate.getTime(),
        status: "pending",
      });
    }

    // Schedule WP Fusion / CRM webhook notification
    await ctx.scheduler.runAfter(0, internal.webhooks.sendBookingWebhook, {
      bookingId: args.bookingId,
      eventType: "booking_confirmed",
    });
  },
});

export const getBookingById = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;

    const trip = await ctx.db.get(booking.tripId);
    const pkg = await ctx.db.get(booking.packageId);
    const installments = await ctx.db
      .query("installments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return {
      ...booking,
      trip,
      package: pkg,
      installments,
    };
  },
});

export const updateBookingDetails = mutation({
  args: {
    bookingId: v.id("bookings"),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    await ctx.db.patch(args.bookingId, {
      metadata: args.metadata,
    });

    return { success: true };
  },
});

export const getInstallmentById = internalQuery({
  args: { installmentId: v.id("installments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.installmentId);
  },
});

export const markInstallmentPaid = internalMutation({
  args: {
    installmentId: v.id("installments"),
    amount: v.number(),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.installmentId, {
      status: "paid",
      paidAt: Date.now(),
      stripeInvoiceId: args.stripeSessionId,
    });
  },
});

export const checkAndUpdateBookingStatus = internalMutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return;

    const installments = await ctx.db
      .query("installments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const allPaid = installments.every((i) => i.status === "paid");
    const totalPaid = booking.depositPaid + installments
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + i.amount, 0);

    if (allPaid || totalPaid >= booking.totalAmount) {
      await ctx.db.patch(args.bookingId, {
        status: "fully_paid",
        depositPaid: totalPaid,
      });

      // Trigger webhook for fully paid
      await ctx.scheduler.runAfter(0, internal.webhooks.sendBookingWebhook, {
        bookingId: args.bookingId,
        eventType: "booking_fully_paid",
      });
    } else {
      // Update depositPaid to reflect total paid so far
      await ctx.db.patch(args.bookingId, {
        depositPaid: totalPaid,
      });
    }
  },
});

export const getBookingByIdInternal = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;

    const trip = await ctx.db.get(booking.tripId);
    const pkg = await ctx.db.get(booking.packageId);
    const installments = await ctx.db
      .query("installments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return {
      ...booking,
      trip,
      package: pkg,
      installments,
    };
  },
});

export const getUserBookings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return Promise.all(
      bookings.map(async (booking) => {
        const trip = await ctx.db.get(booking.tripId);
        const pkg = await ctx.db.get(booking.packageId);
        return { ...booking, trip, package: pkg };
      })
    );
  },
});

export const getAdvisorBookings = query({
  args: { advisorId: v.id("users") },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_advisor", (q) => q.eq("advisorId", args.advisorId))
      .collect();

    return Promise.all(
      bookings.map(async (booking) => {
        const trip = await ctx.db.get(booking.tripId);
        const pkg = await ctx.db.get(booking.packageId);
        const user = await ctx.db.get(booking.userId);
        return { ...booking, trip, package: pkg, user };
      })
    );
  },
});
