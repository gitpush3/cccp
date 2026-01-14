import { X } from "lucide-react";
import { SignInButton } from "@clerk/clerk-react";
import ThreeBidsLogo from "../assets/3bids-logo.png";

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  requireLogin?: boolean;
}

export function PromoModal({ isOpen, onClose, requireLogin = false }: PromoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        {!requireLogin && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={ThreeBidsLogo} 
              alt="3bids.io" 
              className="h-16 w-auto object-contain"
            />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Did you know? 🎯
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You can <span className="font-semibold text-primary dark:text-accent">post anonymous jobs</span> and 
            get <span className="font-semibold text-primary dark:text-accent">free leads</span> at{" "}
            <a 
              href="https://app.3bids.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline font-bold"
            >
              app.3bids.io
            </a>
          </p>

          <div className="bg-gray-50 dark:bg-dark rounded-xl p-4 mb-6 text-left">
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Post renovation jobs anonymously</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Get up to 3 competitive bids from vetted contractors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Earn referral commissions on every project</span>
              </li>
            </ul>
          </div>

          {requireLogin ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Sign in to continue chatting with unlimited access
              </p>
              <SignInButton mode="modal">
                <button className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors">
                  Sign In to Continue
                </button>
              </SignInButton>
              <a
                href="https://app.3bids.io"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors text-center"
              >
                Visit 3bids.io →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <a
                href="https://app.3bids.io"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors text-center"
              >
                Check it out →
              </a>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                Continue Chatting
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
