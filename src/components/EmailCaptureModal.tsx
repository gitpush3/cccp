import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X } from "lucide-react";
import FaviconLogo from "../assets/3fav-180x180_360.png";

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSubmitted: () => void;
  sessionId: string;
}

export function EmailCaptureModal({ isOpen, onClose, onEmailSubmitted, sessionId }: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const captureAnonymousEmail = useMutation(api.users.captureAnonymousEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await captureAnonymousEmail({
        email: email.trim(),
        sessionId,
        consentGiven: true,
      });

      // Store email in localStorage to track consent
      localStorage.setItem("anonymous-email", email.trim());
      localStorage.setItem("email-consent-given", "true");

      onEmailSubmitted();
    } catch (err) {
      console.error("Error capturing email:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <img src={FaviconLogo} alt="3bids" className="h-16 w-16 mx-auto mb-4 rounded-full border-2 border-accent" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            This is a free app!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email to continue using our AI-powered property research tool.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-gray-100"
              disabled={isSubmitting}
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            By entering your email, you allow 3bids to contact you about our services including property research tools and contractor matching.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Continue Chatting"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Part of <a href="https://3bids.io" target="_blank" rel="noreferrer" className="text-primary dark:text-accent hover:underline">3bids.io</a> - Home Remodeling Reimagined
          </p>
        </div>
      </div>
    </div>
  );
}
