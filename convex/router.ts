import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

// Google OAuth callback handler
http.route({
  path: "/auth/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${process.env.SITE_URL || "http://localhost:5173"}/auth/google/callback`,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        throw new Error("Failed to get access token");
      }

      // Get user info from Google
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      const googleUser = await userResponse.json();

      // Create or get user in our database
      const userId = await ctx.runMutation(api.users.createOrUpdateGoogleUser, {
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      });

      // Redirect to app with success
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${process.env.SITE_URL || "http://localhost:5173"}?google_auth=success&user_id=${userId}`,
        },
      });
    } catch (error) {
      console.error("Google OAuth error:", error);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${process.env.SITE_URL || "http://localhost:5173"}?google_auth=error`,
        },
      });
    }
  }),
});

// Stripe webhook handler (THEO'S PATTERN)
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("Stripe-Signature");

    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    try {
      // Verify webhook signature
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Process the event asynchronously
      await ctx.runAction(internal.stripe.handleWebhook, {
        type: event.type,
        data: event.data,
      });

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[STRIPE WEBHOOK] Error processing webhook:", error);
      return new Response("Webhook error", { status: 400 });
    }
  }),
});

export default http;
