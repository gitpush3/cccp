import { useState } from "react";
import { X, Star } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
}

interface FeedbackData {
  rating: number;
  useCase: string;
  helpful: boolean;
}

export function FeedbackModal({ isOpen, onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [useCase, setUseCase] = useState("");
  const [helpful, setHelpful] = useState<boolean | null>(null);

  const handleSubmit = () => {
    onSubmit({
      rating,
      useCase,
      helpful: helpful ?? true,
    });
    // Store that feedback was given
    localStorage.setItem("feedback-given", "true");
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("feedback-given", "true");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Quick Feedback
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Help us improve your experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How would you rate this tool?
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Use Case */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What are you using this for?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["Investing", "Contracting", "Buying a Home", "Research"].map((option) => (
                <button
                  key={option}
                  onClick={() => setUseCase(option)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    useCase === option
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Helpful */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Was this helpful?
            </label>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setHelpful(true)}
                className={`px-6 py-2 rounded-lg border transition-colors ${
                  helpful === true
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setHelpful(false)}
                className={`px-6 py-2 rounded-lg border transition-colors ${
                  helpful === false
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                No
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
