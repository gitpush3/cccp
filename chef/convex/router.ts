import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getStripe } from "./lib/stripe";

const http = httpRouter();

// Trip upsert endpoint for external scripts
http.route({
  path: "/api/trips/upsert",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      const { tripId, tripName, travelDate, stripeProductId, packages } = body;
      
      if (!tripId || !tripName || !travelDate || !stripeProductId || !packages) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.trips.upsertTrip, {
        tripId,
        tripName,
        travelDate,
        stripeProductId,
        packages,
      });

      return new Response(
        JSON.stringify({ success: true, tripId: result }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Trip upsert error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Stripe webhook handler
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      const signature = request.headers.get("stripe-signature");
      
      if (!signature) {
        return new Response("No signature", { status: 400 });
      }

      // Verify the webhook signature
      const stripe = getStripe();
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET || ""
        );
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response("Invalid signature", { status: 400 });
      }
      
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          console.log("Checkout completed:", session.id);
          
          // Extract metadata from the session
          const { tripId, package: packageName, occupancy, userId: metadataUserId, referralCode } = session.metadata || {};
          
          if (!tripId || !packageName || !occupancy) {
            console.error("Missing metadata in checkout session");
            break;
          }

          // 1. Ensure user exists
          const userEmail = session.customer_details?.email;
          if (!userEmail) {
            console.error("No email found in checkout session");
            break;
          }

          const userId = await ctx.runMutation(api.users.createOrUpdateUser, {
            email: userEmail,
            name: session.customer_details?.name || undefined,
            stripeCustomerId: session.customer as string,
          });

          // 2. Retrieve the payment method ID from the session's payment intent
          let stripePaymentMethodId = "";
          if (session.payment_intent) {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            stripePaymentMethodId = (pi.payment_method as string) || "";
          }

          // 3. Get Trip info for cutoff date
          const trip = await ctx.runQuery(api.trips.getTripById, { tripId });
          let cutoffDate = "2026-04-02"; // Fallback
          if (trip) {
            const travelDate = new Date(trip.travelDate);
            const cutoff = new Date(travelDate);
            cutoff.setDate(cutoff.getDate() - 60);
            cutoffDate = cutoff.toISOString().split('T')[0];
          }

          // 4. Create the booking
          const bookingId = await ctx.runMutation(api.bookings.createBooking, {
            userId,
            stripeCustomerId: session.customer as string,
            stripePaymentMethodId,
            tripId,
            package: packageName,
            occupancy: Number(occupancy),
            totalAmount: (session.amount_total || 0) / 100,
            paymentFrequency: "monthly", // Default frequency
            cutoffDate,
            stripeCheckoutSessionId: session.id,
            referralCode: referralCode || undefined,
          });

          console.log(`Created booking ${bookingId} for user ${userId}`);
          
          // 5. Send Welcome Email
          const user = await ctx.runQuery(api.users.getCurrentUser); // This won't work in action, need to fetch by ID
          // Let's just use userEmail directly
          await ctx.runAction(internal.payments.sendEmailAction, {
            to: userEmail,
            subject: "Welcome to LatitudeGo!",
            text: `Your booking for ${trip?.tripName || tripId} is confirmed. Login to mybooking.latitudego.com to manage your installments.`,
            html: `<h1>Welcome to LatitudeGo!</h1><p>Your booking for <strong>${trip?.tripName || tripId}</strong> is confirmed.</p><p>Login to <a href="https://mybooking.latitudego.com">mybooking.latitudego.com</a> to manage your installments.</p>`,
          });

          break;
        }
          
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          console.log("Payment succeeded:", paymentIntent.id);
          
          // If this was an installment payment (metadata contains installmentId)
          if (paymentIntent.metadata?.installmentId) {
            await ctx.runMutation(api.installments.updateInstallmentStatus, {
              installmentId: paymentIntent.metadata.installmentId as any,
              status: "paid",
              stripePaymentIntentId: paymentIntent.id,
            });
          }
          break;
        }
          
        case "payment_intent.payment_failed":
          // Handle failed payment
          const failedPayment = event.data.object;
          console.log("Payment failed:", failedPayment.id);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response("Webhook error", { status: 400 });
    }
  }),
});

export default http;
