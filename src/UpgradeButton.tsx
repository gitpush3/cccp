"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { useState } from "react";

export function UpgradeButton() {
  const { isAuthenticated } = useConvexAuth();
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const user = useQuery(api.users.getCurrentUser);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  if (!isAuthenticated) {
    return null;
  }

  const handleUpgrade = async (withPromo = false) => {
    try {
      if (!user || !user.clerkId) {
        toast.error("Unable to start checkout without user info. Please reload and try again.");
        return;
      }

      if (user.subscriptionStatus === "active") {
        return;
      }

      const result = await createCheckoutSession({
        clerkId: user.clerkId,
        domain: window.location.origin,
        promoCode: withPromo ? promoCode.trim().toUpperCase() : undefined,
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

  if (user?.subscriptionStatus === "active") {
    return (
      <button
        className="px-6 py-2 rounded-full bg-green-600 text-white font-semibold mr-2 uppercase tracking-wide text-sm cursor-default"
        disabled
      >
        Pro Member
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {showPromoInput ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="PROMO CODE"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm uppercase bg-white dark:bg-dark text-gray-900 dark:text-gray-100 w-32"
            maxLength={12}
          />
          <button
            onClick={() => handleUpgrade(true)}
            disabled={!promoCode.trim()}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            $1 First Month
          </button>
          <button
            onClick={() => {
              setShowPromoInput(false);
              setPromoCode("");
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            className="px-6 py-2 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-sm hover:shadow mr-2 uppercase tracking-wide text-sm"
            onClick={() => handleUpgrade(false)}
          >
            Upgrade - $19/mo
          </button>
          <button
            onClick={() => setShowPromoInput(true)}
            className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium underline"
          >
            Have a promo code?
          </button>
        </div>
      )}
    </div>
  );
}
