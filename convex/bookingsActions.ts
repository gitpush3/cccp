"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { api, internal } from "./_generated/api";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

export const createBookingCheckout = action({
  args: {
    packageId: v.id("packages"),
    formData: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.string(),
      dateOfBirth: v.string(),
      preferredName: v.optional(v.string()),
      seats: v.number(),
      departureCity: v.string(),
      specialRequests: v.optional(v.string()),
    }),
    referralCode: v.optional(v.string()),
  },
  returns: v.object({ checkoutUrl: v.union(v.string(), v.null()) }),
  handler: async (ctx, args): Promise<{ checkoutUrl: string | null }> => {
    if (!stripe) throw new Error("Stripe not configured");

    // Get package and trip details
    const pkg: any = await ctx.runQuery(api.trips.getPackageById, { packageId: args.packageId });
    if (!pkg || !pkg.trip) throw new Error("Package not found");

    const trip: any = pkg.trip;
    const totalAmount = pkg.price * args.formData.seats;
    const depositAmount = pkg.depositAmount * args.formData.seats;

    // Look up referrer if referral code provided
    let advisorId: string | undefined;
    if (args.referralCode) {
      const referrer: any = await ctx.runQuery(internal.bookings.getUserByReferralCode, {
        referralCode: args.referralCode,
      });
      if (referrer) {
        advisorId = referrer._id;
      }
    }

    // Create or get user
    let user: any = await ctx.runQuery(internal.bookings.getUserByEmail, { email: args.formData.email });
    if (!user) {
      const userId: any = await ctx.runMutation(internal.bookings.createGuestUser, {
        email: args.formData.email,
        name: `${args.formData.firstName} ${args.formData.lastName}`,
        referredBy: args.referralCode,
      });
      user = { _id: userId, email: args.formData.email };
    }

    // Create booking record
    const bookingId: any = await ctx.runMutation(internal.bookings.createBooking, {
      userId: user._id,
      tripId: trip._id,
      packageId: args.packageId,
      advisorId: advisorId as any,
      totalAmount,
      metadata: {
        ...args.formData,
        tripTitle: trip.title,
        packageTitle: pkg.title,
      },
    });

    // Create Stripe Checkout session for deposit
    const siteUrl = process.env.SITE_URL || "http://localhost:5173";

    const session: any = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: args.formData.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${trip.title} - ${pkg.title} (Deposit)`,
              description: `Deposit for ${args.formData.seats} seat(s). Remaining balance due by ${trip.cutoffDate}.`,
            },
            unit_amount: pkg.depositAmount,
          },
          quantity: args.formData.seats,
        },
      ],
      metadata: {
        bookingId,
        tripId: trip._id,
        packageId: args.packageId,
        advisorId: advisorId || "",
        seats: args.formData.seats.toString(),
        type: "trip_deposit",
      },
      success_url: `${siteUrl}/booking/success?booking=${bookingId}`,
      cancel_url: `${siteUrl}/trips/${trip.slug}?cancelled=true`,
    });

    return { checkoutUrl: session.url };
  },
});

export const payInstallment = action({
  args: {
    installmentId: v.id("installments"),
  },
  returns: v.object({ checkoutUrl: v.union(v.string(), v.null()) }),
  handler: async (ctx, args): Promise<{ checkoutUrl: string | null }> => {
    if (!stripe) throw new Error("Stripe not configured");

    // Get installment details
    const installment: any = await ctx.runQuery(internal.bookings.getInstallmentById, {
      installmentId: args.installmentId,
    });
    if (!installment) throw new Error("Installment not found");
    if (installment.status === "paid") throw new Error("Installment already paid");

    // Get booking details
    const booking: any = await ctx.runQuery(internal.bookings.getBookingByIdInternal, {
      bookingId: installment.bookingId,
    });
    if (!booking) throw new Error("Booking not found");

    const siteUrl = process.env.SITE_URL || "http://localhost:5173";

    const session: any = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.metadata?.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${booking.trip?.title || "Trip"} - Payment`,
              description: `Installment payment for booking`,
            },
            unit_amount: installment.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        installmentId: args.installmentId,
        bookingId: installment.bookingId,
        type: "trip_installment",
      },
      success_url: `${siteUrl}/my-bookings?paid=${args.installmentId}`,
      cancel_url: `${siteUrl}/my-bookings?cancelled=true`,
    });

    return { checkoutUrl: session.url };
  },
});
