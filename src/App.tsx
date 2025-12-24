import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";
import { UpgradeButton } from "./UpgradeButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { Paywall } from "./components/Paywall";
import { useEffect } from "react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-blue-600">Architect Pro</h2>
        <Authenticated>
          <div className="flex items-center gap-2">
            <UpgradeButton />
            <UserButton />
          </div>
        </Authenticated>
      </header>
      <main className="flex-1">
        <Content />
      </main>
      <Toaster />
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
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md mx-auto p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Architect Pro
              </h1>
              <p className="text-xl text-gray-600">
                AI-powered municipal code search and expert guidance
              </p>
            </div>
            <SignInButton mode="modal">
              <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Sign In
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
  const messageCount = useQuery(api.queries.countMessagesByUserId, { userId: user?.clerkId || "unknown" });

  // Create user on first login
  useEffect(() => {
    if (user === null) {
      getOrCreateUser();
    }
  }, [user, getOrCreateUser]);

  if (!user) return null;

  // Allow access if user has active subscription OR has sent fewer than 5 messages
  if (user.subscriptionStatus !== "active" && messageCount !== undefined && messageCount >= 5) {
    return <Paywall />;
  }

  return <Dashboard />;
}
