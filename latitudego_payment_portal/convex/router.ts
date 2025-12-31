import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

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

      // In a real implementation, you would verify the webhook signature here
      const event = JSON.parse(body);
      
      switch (event.type) {
        case "checkout.session.completed":
          // Handle successful checkout
          const session = event.data.object;
          console.log("Checkout completed:", session.id);
          break;
          
        case "payment_intent.succeeded":
          // Handle successful payment
          const paymentIntent = event.data.object;
          console.log("Payment succeeded:", paymentIntent.id);
          break;
          
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
