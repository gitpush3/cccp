"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// WP Fusion / CRM webhook notification on booking completion
export const sendBookingWebhook = internalAction({
  args: {
    bookingId: v.id("bookings"),
    eventType: v.string(), // "booking_confirmed", "booking_fully_paid", "installment_paid"
  },
  handler: async (ctx, args) => {
    const wpFusionWebhookUrl = process.env.WP_FUSION_WEBHOOK_URL;
    const crmWebhookUrl = process.env.CRM_WEBHOOK_URL;

    if (!wpFusionWebhookUrl && !crmWebhookUrl) {
      console.log("[WEBHOOK] No webhook URLs configured. Set WP_FUSION_WEBHOOK_URL or CRM_WEBHOOK_URL in environment.");
      return;
    }

    // Get booking details
    const booking: any = await ctx.runQuery(internal.bookings.getBookingByIdInternal, {
      bookingId: args.bookingId,
    });

    if (!booking) {
      console.error("[WEBHOOK] Booking not found:", args.bookingId);
      return;
    }

    // Get user details
    const user: any = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: booking.metadata?.clerkId || "",
    }) || null;

    // Build webhook payload
    const payload = {
      event: args.eventType,
      timestamp: new Date().toISOString(),
      booking: {
        id: booking._id,
        status: booking.status,
        totalAmount: booking.totalAmount / 100, // Convert cents to dollars
        depositPaid: booking.depositPaid / 100,
        remainingBalance: (booking.totalAmount - booking.depositPaid) / 100,
        createdAt: new Date(booking.createdAt).toISOString(),
      },
      trip: booking.trip ? {
        id: booking.trip._id,
        title: booking.trip.title,
        slug: booking.trip.slug,
        startDate: booking.trip.startDate,
        endDate: booking.trip.endDate,
      } : null,
      package: booking.package ? {
        id: booking.package._id,
        title: booking.package.title,
        price: booking.package.price / 100,
      } : null,
      customer: {
        id: user?._id,
        email: user?.email || booking.metadata?.email,
        firstName: booking.metadata?.firstName,
        lastName: booking.metadata?.lastName,
        phone: booking.metadata?.phone,
        dateOfBirth: booking.metadata?.dateOfBirth,
        departureCity: booking.metadata?.departureCity,
      },
      advisor: booking.advisorId ? {
        id: booking.advisorId,
      } : null,
      metadata: booking.metadata,
    };

    // Send to WP Fusion
    if (wpFusionWebhookUrl) {
      try {
        const response = await fetch(wpFusionWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Source": "convex-booking-system",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log("[WEBHOOK] WP Fusion webhook sent successfully for booking:", args.bookingId);
        } else {
          console.error("[WEBHOOK] WP Fusion webhook failed:", response.status, await response.text());
        }
      } catch (error: any) {
        console.error("[WEBHOOK] WP Fusion webhook error:", error.message);
      }
    }

    // Send to CRM
    if (crmWebhookUrl) {
      try {
        const response = await fetch(crmWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Source": "convex-booking-system",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log("[WEBHOOK] CRM webhook sent successfully for booking:", args.bookingId);
        } else {
          console.error("[WEBHOOK] CRM webhook failed:", response.status, await response.text());
        }
      } catch (error: any) {
        console.error("[WEBHOOK] CRM webhook error:", error.message);
      }
    }
  },
});

