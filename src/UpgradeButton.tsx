"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";

export function UpgradeButton() {
  const { isAuthenticated } = useConvexAuth();
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const user = useQuery(api.users.getCurrentUser);

  if (!isAuthenticated) {
    return null;
  }

  const handleUpgrade = async () => {
    try {
      if (!user || !user.clerkId) {
        toast.error("Unable to start checkout without user info. Please reload and try again.");
        return;
      }

      const result = await createCheckoutSession({
        clerkId: user.clerkId,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error("Checkout session did not return a URL.");
      }
    } catch (error) {
      toast.error("Failed to start checkout. Please try again.");
      console.error("Checkout error:", error);
    }
  };

  return (
    <button
      className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm hover:shadow mr-2"
      onClick={handleUpgrade}
    >
      Upgrade - $19/mo
    </button>
  );
}
