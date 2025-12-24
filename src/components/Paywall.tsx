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
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await createCheckoutSession({
        clerkId: user.clerkId,
        googleId: user.googleId,
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
    <div className="min-h-[80vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Zap className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Upgrade to Pro
          </h2>
          <p className="text-gray-600">
            Unlock AI-powered municipal code search and expert guidance
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-gray-900">$49</div>
            <div className="text-gray-500">per month</div>
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
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Checkout..." : "Upgrade to Pro"}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Cancel anytime. No long-term commitments.</p>
        </div>
      </div>
    </div>
  );
}
