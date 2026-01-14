import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  clerkId?: string;
}

export function FeedbackModal({ isOpen, onClose, sessionId, clerkId }: FeedbackModalProps) {
  const [step, setStep] = useState(1);
  const [isHelpful, setIsHelpful] = useState<"yes" | "no" | "too_early" | null>(null);
  const [roleInRealEstate, setRoleInRealEstate] = useState("");
  const [otherMarkets, setOtherMarkets] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = useMutation(api.feedback.submitFeedback);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitFeedback({
        sessionId,
        clerkId,
        email: email || undefined,
        isHelpful: isHelpful || undefined,
        roleInRealEstate: roleInRealEstate || undefined,
        otherMarkets: otherMarkets || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpfulClick = (value: "yes" | "no" | "too_early") => {
    setIsHelpful(value);
    setStep(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Quick Feedback 🙏
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Help us make this tool better for you
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-center font-medium text-gray-700 dark:text-gray-300">
              Do you think this tool could be helpful?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleHelpfulClick("yes")}
                className="w-full py-3 px-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              >
                ✅ Yes
              </button>
              <button
                onClick={() => handleHelpfulClick("no")}
                className="w-full py-3 px-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                ❌ No
              </button>
              <button
                onClick={() => handleHelpfulClick("too_early")}
                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                🤔 Too early to tell
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What do you do in Cuyahoga County real estate?
              </label>
              <input
                type="text"
                value={roleInRealEstate}
                onChange={(e) => setRoleInRealEstate(e.target.value)}
                placeholder="e.g., Investor, Agent, Contractor, Lender..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setStep(3)}
              className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => setStep(3)}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
            >
              Skip
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Should we build this in another market? Which one?
              </label>
              <input
                type="text"
                value={otherMarkets}
                onChange={(e) => setOtherMarkets(e.target.value)}
                placeholder="e.g., Columbus, Cincinnati, Detroit, Pittsburgh..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setStep(4)}
              className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => setStep(4)}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
            >
              Skip
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your email (for updates & to continue chatting)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-dark text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                We'll only email you about product updates and your property research.
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit & Continue Chatting"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
            >
              Skip & continue
            </button>
          </div>
        )}

        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${
                s === step ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
