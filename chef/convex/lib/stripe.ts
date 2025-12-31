import Stripe from "stripe";

export const getStripe = () => {
  const mode = process.env.STRIPE_MODE || "test";
  const secretKey = mode === "live" 
    ? process.env.STRIPE_LIVE_SECRET_KEY 
    : process.env.STRIPE_TEST_SECRET_KEY;

  if (!secretKey) {
    throw new Error(`Stripe secret key not found for mode: ${mode}`);
  }

  return new Stripe(secretKey, {
    apiVersion: "2024-12-18.acacia" as any,
  });
};
