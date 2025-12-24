import { Authenticated, Unauthenticated, useAction, useQuery, useMutation } from "convex/react";
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";
import { UpgradeButton } from "./UpgradeButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { Paywall } from "./components/Paywall";
import { useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "./components/ThemeToggle";
import Logo from "./assets/logo.jpeg";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 shadow-sm px-4 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="CCCP Logo" className="h-10 w-10 object-cover rounded-full border-2 border-accent" />
            <h2 className="text-xl font-bold text-primary tracking-tight">CCCP</h2>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Authenticated>
              <div className="flex items-center gap-2">
                <UpgradeButton />
                <UserButton />
              </div>
            </Authenticated>
          </div>
        </header>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<Content />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

function ProfilePage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-gray-50 dark:bg-dark">
      <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-dark-surface rounded-container shadow-lg border border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Coming soon.</p>
      </div>
    </div>
  );
}

function Content() {
  return (
    <div className="flex flex-col">
      <Authenticated>
        <UserContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[80vh] bg-gray-50 dark:bg-dark">
          <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-dark-surface rounded-container shadow-lg border border-gray-200 dark:border-gray-800">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                 <img src={Logo} alt="CCCP Logo" className="h-24 w-24 object-cover rounded-full border-4 border-accent shadow-md" />
              </div>
              <h1 className="text-4xl font-black text-primary mb-2 tracking-tight">
                CCCP
              </h1>
              <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
                Cuyahoga Code & Compliance Pal
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                AI-powered municipal code search and expert guidance for the People.
              </p>
            </div>
            <SignInButton mode="modal">
              <button className="w-full px-4 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors shadow-md flex items-center justify-center gap-2">
                <span>Enter System</span>
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}

function UserContent() {
  const user = useQuery(api.users.getCurrentUser);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const syncAfterSuccess = useAction(api.stripe.syncAfterSuccess);
  const messageCount = useQuery(api.queries.countMessagesByUserId, { userId: user?.clerkId || "unknown" });
  const requestedCreateRef = useRef(false);

  // Create user on first login
  useEffect(() => {
    if (user === null && !requestedCreateRef.current) {
      requestedCreateRef.current = true;
      void getOrCreateUser();
    }
  }, [user, getOrCreateUser]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");

    if (success === "true" && user && user.clerkId) {
      syncAfterSuccess({
        clerkId: user.clerkId,
      }).then((result) => {
        if (result.success) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("success");
          window.history.replaceState({}, "", newUrl.toString());
        } else {
          console.error("Failed to sync subscription data:", result.error);
        }
      });
    }
  }, [user, syncAfterSuccess]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-gray-600 dark:text-gray-400 font-medium">Initializing...</div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-gray-600 dark:text-gray-400 font-medium">Establishing secure connection...</div>
      </div>
    );
  }

  // Allow access if user has active subscription OR has sent fewer than 5 messages
  if (user.subscriptionStatus !== "active" && messageCount !== undefined && messageCount >= 5) {
    return <Paywall />;
  }

  return <Dashboard />;
}
