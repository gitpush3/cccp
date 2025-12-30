import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Check, Zap, Building2, MapPin, Phone, Users, CreditCard, FileText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FormSubmission } from "./FormSubmission";

export function Paywall() {
  const user = useQuery(api.users.getCurrentUser);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<"payment" | "form">("payment");

  const handleUpgrade = async () => {
    if (!user || !user.clerkId) {
      setError("You're not signed in. Please reload and sign in again, then retry.");
      return;
    }

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
    <div className="min-h-[80vh] flex items-center justify-center p-4 md:p-8 bg-gray-50 dark:bg-dark transition-colors duration-300">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Zap className="h-8 w-8 text-primary dark:text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
            Upgrade to Pro
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Unlock full access to Cuyahoga County real estate intelligence
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
            <MapPin className="h-5 w-5 text-primary dark:text-accent mx-auto mb-1" />
            <div className="text-lg font-black text-gray-900 dark:text-white">520K+</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Parcels</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
            <Building2 className="h-5 w-5 text-primary dark:text-accent mx-auto mb-1" />
            <div className="text-lg font-black text-gray-900 dark:text-white">741</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Codes</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
            <Users className="h-5 w-5 text-primary dark:text-accent mx-auto mb-1" />
            <div className="text-lg font-black text-gray-900 dark:text-white">59</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Cities</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
            <Phone className="h-5 w-5 text-primary dark:text-accent mx-auto mb-1" />
            <div className="text-lg font-black text-gray-900 dark:text-white">40+</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Contacts</div>
          </div>
        </div>

        {/* Option Selector */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setSelectedOption("payment")}
            className={`flex-1 py-4 px-6 rounded-lg font-bold transition-all ${
              selectedOption === "payment"
                ? "bg-primary text-white shadow-lg scale-[1.02]"
                : "bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-accent"
            }`}
          >
            <CreditCard className="h-5 w-5 inline mr-2" />
            Pay $20
          </button>
          <button
            onClick={() => setSelectedOption("form")}
            className={`flex-1 py-4 px-6 rounded-lg font-bold transition-all ${
              selectedOption === "form"
                ? "bg-accent text-white shadow-lg scale-[1.02]"
                : "bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-accent"
            }`}
          >
            <FileText className="h-5 w-5 inline mr-2" />
            Fill Out Form
          </button>
        </div>

        {/* Payment Option */}
        {selectedOption === "payment" && (
          <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-md">
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-primary dark:text-white">$20</div>
              <div className="text-gray-500 dark:text-gray-400">one-time payment</div>
            </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wide">Property Research</h4>
              <ul className="space-y-2">
                {[
                  "Search 520K+ parcels by address",
                  "Owner info & sales history",
                  "Tax assessments & abatements",
                  "Comparable property analysis",
                  "Investment analysis & ARV",
                  "Zip code market statistics",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wide">Building Codes</h4>
              <ul className="space-y-2">
                {[
                  "741 searchable code entries",
                  "59 municipalities covered",
                  "Zoning & permit requirements",
                  "Point of Sale (POS) info",
                  "Building dept contacts",
                  "Contractor recommendations",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
            <ul className="space-y-2">
              {[
                "Unlimited AI-powered questions",
                "Priority support",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 justify-center">
                  <Check className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-primary text-white py-4 px-6 rounded-full font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all"
            >
              {isLoading ? "Processing Request..." : "Pay $20 Now"}
            </button>
          </div>
        )}

        {/* Form Option */}
        {selectedOption === "form" && (
          <FormSubmission clerkId={user?.clerkId} />
        )}

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-2 mt-6">
          <p>Choose the option that works best for you</p>
          <Link to="/about" className="text-primary dark:text-accent hover:underline">
            Learn more about our data →
          </Link>
        </div>
      </div>
    </div>
  );
}
