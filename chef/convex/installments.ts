import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createInstallmentSchedule = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    totalAmount: v.number(),
    paymentFrequency: v.union(
      v.literal("weekly"),
      v.literal("bi-weekly"),
      v.literal("monthly")
    ),
    cutoffDate: v.string(),
  },
  handler: async (ctx, args) => {
    const cutoffDate = new Date(args.cutoffDate);
    const now = new Date();
    
    // Calculate number of payments based on frequency
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksUntilCutoff = Math.floor((cutoffDate.getTime() - now.getTime()) / msPerWeek);
    
    let paymentInterval = 1;
    let numberOfPayments = 1;
    
    switch (args.paymentFrequency) {
      case "weekly":
        paymentInterval = 1;
        numberOfPayments = Math.max(1, weeksUntilCutoff);
        break;
      case "bi-weekly":
        paymentInterval = 2;
        numberOfPayments = Math.max(1, Math.floor(weeksUntilCutoff / 2));
        break;
      case "monthly":
        paymentInterval = 4;
        numberOfPayments = Math.max(1, Math.floor(weeksUntilCutoff / 4));
        break;
    }

    const paymentAmount = Math.ceil(args.totalAmount / numberOfPayments);
    
    // Create installments
    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + (i * paymentInterval * 7));
      
      // Adjust last payment to cover any rounding differences
      const amount = i === numberOfPayments - 1 
        ? args.totalAmount - (paymentAmount * (numberOfPayments - 1))
        : paymentAmount;

      await ctx.db.insert("installments", {
        bookingId: args.bookingId,
        dueDate: dueDate.toISOString().split('T')[0],
        amount,
        status: "pending",
        attempts: 0,
      });
    }
  },
});

export const getUpcomingInstallments = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    return await ctx.db
      .query("installments")
      .withIndex("by_due_date", (q) => q.lte("dueDate", today))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

export const getInstallmentsForRetry = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    return await ctx.db
      .query("installments")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .filter((q) => 
        q.and(
          q.neq(q.field("nextRetryAt"), undefined),
          q.lte(q.field("nextRetryAt"), now)
        )
      )
      .collect();
  },
});

export const updateInstallmentStatus = mutation({
  args: {
    installmentId: v.id("installments"),
    status: v.union(
      v.literal("processing"),
      v.literal("paid"),
      v.literal("failed")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const installment = await ctx.db.get(args.installmentId);
    if (!installment) {
      throw new Error("Installment not found");
    }

    const updateData: any = {
      status: args.status,
      stripePaymentIntentId: args.stripePaymentIntentId,
      failureReason: args.failureReason,
    };

    if (args.status === "paid") {
      updateData.paidAt = Date.now();
      
      // Update booking amount paid
      const booking = await ctx.db.get(installment.bookingId);
      if (booking) {
        await ctx.db.patch(booking._id, {
          amountPaid: booking.amountPaid + installment.amount,
        });
        
        // Check if booking is fully paid
        if (booking.amountPaid + installment.amount >= booking.totalAmount) {
          await ctx.db.patch(booking._id, { status: "completed" });
        }
      }
    } else if (args.status === "failed") {
      updateData.attempts = installment.attempts + 1;
      
      // Set next retry date based on attempt number
      const retryDelays = [1, 1440, 2880, 4320]; // 1min, 1day, 2days, 3days in minutes
      const delayMinutes = retryDelays[Math.min(installment.attempts, retryDelays.length - 1)];
      const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);
      updateData.nextRetryAt = nextRetry.toISOString();
    }

    await ctx.db.patch(args.installmentId, updateData);
  },
});
