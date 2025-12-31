import { internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getStripe } from "./lib/stripe";
import { sendEmail } from "./lib/sendgrid";

export const sendEmailAction = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    await sendEmail(args);
  },
});

export const processDueInstallments = internalAction({
  args: {},
  handler: async (ctx) => {
    const dueInstallments = await ctx.runQuery(api.installments.getUpcomingInstallments);
    
    for (const installment of dueInstallments) {
      const booking = await ctx.runQuery(api.bookings.getBookingById, { bookingId: installment.bookingId });
      if (!booking) continue;

      const user = await ctx.runQuery(api.users.getUserById, { userId: booking.userId });
      const userEmail = user?.email || "";

      try {
        const stripe = getStripe();
        
        // Charge the card on file
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(installment.amount * 100),
          currency: "usd",
          customer: booking.stripeCustomerId,
          payment_method: booking.stripePaymentMethodId,
          off_session: true,
          confirm: true,
          description: `Installment for ${booking.tripId} - ${booking.package}`,
          metadata: {
            bookingId: booking._id,
            installmentId: installment._id,
          },
        });

        await ctx.runMutation(api.installments.updateInstallmentStatus, {
          installmentId: installment._id,
          status: "paid",
          stripePaymentIntentId: paymentIntent.id,
        });

        // Send success email
        if (userEmail) {
          await ctx.runAction(internal.payments.sendEmailAction, {
            to: userEmail,
            subject: `Payment Successful - ${booking.tripId}`,
            text: `Your installment payment of $${installment.amount} for ${booking.tripId} was successful.`,
            html: `<p>Your installment payment of <strong>$${installment.amount}</strong> for <strong>${booking.tripId}</strong> was successful.</p>`,
          });
        }
      } catch (error: any) {
        console.error(`Failed to charge installment ${installment._id}:`, error);
        
        await ctx.runMutation(api.installments.updateInstallmentStatus, {
          installmentId: installment._id,
          status: "failed",
          failureReason: error.message,
        });

        // Send failure email to customer + admin
        if (userEmail) {
          await ctx.runAction(internal.payments.sendEmailAction, {
            to: userEmail,
            subject: `Payment Failed - ${booking.tripId}`,
            text: `Your installment payment of $${installment.amount} for ${booking.tripId} failed. We will retry according to our schedule.`,
            html: `<p>Your installment payment of <strong>$${installment.amount}</strong> for <strong>${booking.tripId}</strong> failed.</p><p>We will retry according to our schedule.</p>`,
          });
        }
        
        await ctx.runAction(internal.payments.sendEmailAction, {
          to: process.env.ADMIN_EMAIL || "admin@latitudego.com",
          subject: `ADMIN ALERT: Payment Failed - ${booking.tripId}`,
          text: `Payment failed for user ${booking.userId} on booking ${booking._id}. Error: ${error.message}`,
          html: `<p>Payment failed for user ${booking.userId} on booking ${booking._id}.</p><p>Error: ${error.message}</p>`,
        });
      }
    }
  },
});

export const payOffEarlyAction = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(api.bookings.payOffEarly, { bookingId: args.bookingId });
    const { remainingAmount, stripeCustomerId, stripePaymentMethodId } = result;

    try {
      const stripe = getStripe();
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(remainingAmount * 100),
        currency: "usd",
        customer: stripeCustomerId,
        payment_method: stripePaymentMethodId,
        off_session: true,
        confirm: true,
        description: `Full payoff for booking ${args.bookingId}`,
        metadata: {
          bookingId: args.bookingId,
          type: "payoff",
        },
      });

      await ctx.runMutation(api.bookings.markAsPaid, {
        bookingId: args.bookingId,
        amount: remainingAmount,
      });

      return { success: true, paymentIntentId: paymentIntent.id };
    } catch (error: any) {
      console.error(`Failed to payoff booking ${args.bookingId}:`, error);
      throw new Error(`Payment failed: ${error.message}`);
    }
  },
});

export const createStripePortalSession = internalAction({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.runQuery(api.bookings.getBookingById, { bookingId: args.bookingId });
    if (!booking) throw new Error("Booking not found");

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: booking.stripeCustomerId,
      return_url: `${process.env.VITE_APP_URL || "http://localhost:5173"}/booking/${args.bookingId}`,
    });

    return session.url;
  },
});
