import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Check, Zap } from "lucide-react";
import { useState } from "react";

export function Paywall() {
  const user = useQuery(api.users.getCurrentUser);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!user || !user.clerkId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await createCheckoutSession({
        clerkId: user.clerkId,
        domain: window.location.origin,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-8 bg-gray-50 dark:bg-dark transition-colors duration-300">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">
            Upgrade to Party Member
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Unlock advanced compliance tools for the collective good.
          </p>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-md">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-primary">$49</div>
            <div className="text-gray-500 dark:text-gray-400">per month</div>
          </div>

          <ul className="space-y-3 mb-6">
            {[
              "AI-powered municipal code search",
              "Expert architect guidance",
              "Blueprint and photo analysis",
              "City contact database",
              "Unlimited questions",
              "Priority support",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-accent flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shadow-sm"
          >
            {isLoading ? "Processing Request..." : "Join the Party"}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Cancel anytime. Service to the state is voluntary.</p>
        </div>
      </div>
    </div>
  );
}
