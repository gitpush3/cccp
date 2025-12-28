import { Authenticated, Unauthenticated, useAction, useQuery, useMutation } from "convex/react";
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";
import { UpgradeButton } from "./UpgradeButton";
import { Toaster, toast } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { AnonymousDashboard } from "./components/AnonymousDashboard";
import { Paywall } from "./components/Paywall";
import { useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router-dom";
import { ThemeToggle } from "./components/ThemeToggle";
import LogoOnBlack from "./assets/logo_noall_onblack_dark.png";
import StandardLogo from "./assets/standard_logo.png";
import FaviconLogo from "./assets/3fav-180x180_360.png";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 shadow-sm px-4 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <img src={FaviconLogo} alt="Logo" className="h-10 w-10 object-cover rounded-full border-2 border-accent" />
            <h2 className="text-lg font-bold text-primary dark:text-white tracking-tight">Cuyahoga Code, Permit & Parcel Chat</h2>
            <Link to="/about" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-white transition-colors ml-4">About</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/chat" className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium text-sm transition-colors">
              Chat Now
            </Link>
            <ThemeToggle />
            <Authenticated>
              <div className="flex items-center gap-2">
                <UpgradeButton />
                <UserButton />
              </div>
            </Authenticated>
            <Unauthenticated>
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </Unauthenticated>
          </div>
        </header>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="/welcome" element={<WelcomeScreen />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

function JoinPage() {
  return (
    <div className="flex flex-col">
      <Authenticated>
        <UserContentPaywall />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[80vh] bg-gray-50 dark:bg-dark">
          <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-dark-surface rounded-container shadow-lg border border-gray-200 dark:border-gray-800">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <img src={StandardLogo} alt="Logo" className="h-24 w-auto object-contain dark:hidden" />
                <img src={LogoOnBlack} alt="Logo" className="h-24 w-auto object-contain hidden dark:block" />
              </div>
              <h1 className="text-3xl font-black text-primary dark:text-white mb-2 tracking-tight">
                Cuyahoga Code, Permit & Parcel Chat
              </h1>
              <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
                Real Estate Intelligence
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                AI-powered municipal code search and expert guidance.
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

function ChatPage() {
  return (
    <div className="flex flex-col">
      <Authenticated>
        <UserContent />
      </Authenticated>
      <Unauthenticated>
        <AnonymousDashboard />
      </Unauthenticated>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="min-h-[80vh] bg-gray-50 dark:bg-dark py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img src={StandardLogo} alt="Logo" className="h-24 w-auto object-contain dark:hidden" />
            <img src={LogoOnBlack} alt="Logo" className="h-24 w-auto object-contain hidden dark:block" />
          </div>
          <h1 className="text-3xl font-black text-primary dark:text-white mb-2 tracking-tight">
            Cuyahoga Code, Permit & Parcel Chat
          </h1>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
            Real Estate Intelligence for Investors & Contractors
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            AI-powered property research and building code assistant for real estate investors, contractors, and developers.
          </p>
          <Link to="/chat">
            <button className="px-8 py-4 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold text-lg transition-colors shadow-lg">
              Try It Now!
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-4 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-3xl font-black text-primary dark:text-accent">520K+</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Parcels</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-4 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-3xl font-black text-primary dark:text-accent">741</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Code Entries</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-4 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-3xl font-black text-primary dark:text-accent">59</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Municipalities</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-4 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-3xl font-black text-primary dark:text-accent">40+</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Contacts</div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Property Research</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>- Search any address for owner, sales history, tax values</li>
              <li>- Find comparable properties and market stats</li>
              <li>- Identify land bank and tax abatement properties</li>
              <li>- Get investment analysis and ARV estimates</li>
            </ul>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Building Codes</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>- Zoning, permits, Point of Sale requirements</li>
              <li>- Ohio State and municipal code references</li>
              <li>- Building department contacts and fees</li>
              <li>- Investor-specific tips for each city</li>
            </ul>
          </div>
        </div>

        {/* How to Use */}
        <div className="bg-white dark:bg-dark-surface rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm mb-12">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">How to Use</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold text-primary dark:text-accent mb-1">1. Ask About Properties</div>
              <p className="text-gray-600 dark:text-gray-400">"Tell me about 1234 Main St Cleveland" or "Who owns properties on Euclid Ave?"</p>
            </div>
            <div>
              <div className="font-semibold text-primary dark:text-accent mb-1">2. Ask About Codes</div>
              <p className="text-gray-600 dark:text-gray-400">"Do I need a permit for a roof in Lakewood?" or "What's the POS fee in Parma?"</p>
            </div>
            <div>
              <div className="font-semibold text-primary dark:text-accent mb-1">3. Get Recommendations</div>
              <p className="text-gray-600 dark:text-gray-400">"Find me hard money lenders" or "I need a contractor for a rehab project"</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/chat">
            <button className="px-8 py-4 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors shadow-md">
              Try 5 Free Messages Now
            </button>
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            No signup required • Sign up for 5 more • Pro members get unlimited access for $19/month
          </p>
          <Link to="/about" className="text-sm text-primary dark:text-accent hover:underline mt-2 inline-block">
            Learn more about our data →
          </Link>
        </div>
      </div>
    </div>
  );
}

function UserContentPaywall() {
  const user = useQuery(api.users.getCurrentUser);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const requestedCreateRef = useRef(false);

  // Create user on first login
  useEffect(() => {
    if (user === null && !requestedCreateRef.current) {
      requestedCreateRef.current = true;
      void getOrCreateUser();
    }
  }, [user, getOrCreateUser]);

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

  return <Paywall />;
}

function UserContent() {
  const user = useQuery(api.users.getCurrentUser);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const syncAfterSuccess = useAction(api.stripe.syncAfterSuccess);
  const messageCount = useQuery(api.queries.countMessagesByUserId, { userId: user?.clerkId || "unknown" });
  const requestedCreateRef = useRef(false);
  const syncAttemptedRef = useRef(false);

  // Create user on first login
  useEffect(() => {
    if (user === null && !requestedCreateRef.current) {
      requestedCreateRef.current = true;
      void getOrCreateUser();
    }
  }, [user, getOrCreateUser]);

  // Handle Stripe success redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");

    if (success === "true" && user && user.clerkId && !syncAttemptedRef.current) {
      syncAttemptedRef.current = true;
      syncAfterSuccess({
        clerkId: user.clerkId,
      }).then((result) => {
        if (result.success) {
          toast.success(
            "Thanks for becoming a Pro member! You have unlocked unlimited messages with our chat app. code.3bids.io is part of app.3bids.io — for anonymous job posting & bidding, free leads and predictable CAC or residual affiliate income, please visit app.3bids.io!",
            { duration: 10000 }
          );
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
    return <Navigate to="/join" replace />;
  }

  return <Dashboard />;
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

function AboutPage() {
  return (
    <div className="min-h-[80vh] bg-gray-50 dark:bg-dark py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-primary dark:text-white mb-4">
            About Cuyahoga Code, Permit & Parcel Chat
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            The most comprehensive real estate intelligence platform for Cuyahoga County, Ohio.
          </p>
        </div>

        {/* Data Overview */}
        <div className="bg-white dark:bg-dark-surface rounded-lg p-8 border border-gray-200 dark:border-gray-800 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Our Data</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Parcel Database */}
            <div>
              <h3 className="font-bold text-lg text-primary dark:text-accent mb-3">Parcel Database</h3>
              <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">520,673</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Properties in Cuyahoga County</p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>- Owner name and mailing address</li>
                <li>- Last sale date and price</li>
                <li>- Tax assessed values (land, building, total)</li>
                <li>- Property characteristics (sq ft, bedrooms, year built)</li>
                <li>- Land use codes and zoning</li>
                <li>- Tax abatement status</li>
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">Source: Cuyahoga County GIS • Updated quarterly</p>
            </div>

            {/* Code Content */}
            <div>
              <h3 className="font-bold text-lg text-primary dark:text-accent mb-3">Building Codes & Regulations</h3>
              <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">741</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Searchable code entries</p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>- 59 municipalities + Ohio State + County</li>
                <li>- 12 code types per jurisdiction</li>
                <li>- Building, residential, fire, electrical codes</li>
                <li>- Zoning and permit requirements</li>
                <li>- Point of Sale (POS) requirements</li>
                <li>- Investor-specific notes and tips</li>
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">Source: Municipal codes • Updated annually</p>
            </div>
          </div>
        </div>

        {/* Additional Data */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Building Department Contacts</h3>
            <div className="text-3xl font-black text-primary dark:text-accent mb-2">40+</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Municipal contacts with:</p>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>- Phone numbers and addresses</li>
              <li>- Website links</li>
              <li>- POS fees and process tips</li>
              <li>- Investor-friendly ratings</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Service Providers</h3>
            <div className="text-3xl font-black text-primary dark:text-accent mb-2">13+</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Vetted providers including:</p>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>- Hard money lenders</li>
              <li>- Title companies</li>
              <li>- Property managers</li>
              <li>- Inspectors and attorneys</li>
            </ul>
          </div>
        </div>

        {/* Pro Membership */}
        <div className="bg-gradient-to-r from-primary to-primary-hover rounded-lg p-8 text-white mb-8">
          <h2 className="text-2xl font-bold mb-4">Pro Membership - $19/month</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Free Users Get:</h3>
              <ul className="space-y-2 text-sm opacity-90">
                <li>✓ 5 AI-powered questions</li>
                <li>✓ Basic property lookups</li>
                <li>✓ Code reference links</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Pro Members Get:</h3>
              <ul className="space-y-2 text-sm">
                <li>✓ Unlimited AI questions</li>
                <li>✓ Full parcel database access (520K+ properties)</li>
                <li>✓ Comparable property analysis</li>
                <li>✓ Investment analysis and ARV estimates</li>
                <li>✓ Owner search across all properties</li>
                <li>✓ Zip code market statistics</li>
                <li>✓ Building department contacts</li>
                <li>✓ Contractor recommendations via 3bids.io</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 59 Municipalities */}
        <div className="bg-white dark:bg-dark-surface rounded-lg p-8 border border-gray-200 dark:border-gray-800 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">59 Municipalities Covered</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Complete building code and parcel data for every city and village in Cuyahoga County:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
            {[
              "Bay Village", "Beachwood", "Bedford", "Bedford Heights", "Berea", "Brecksville",
              "Broadview Heights", "Brook Park", "Brooklyn", "Brooklyn Heights", "Chagrin Falls",
              "Cleveland", "Cleveland Heights", "Cuyahoga Heights", "East Cleveland", "Euclid",
              "Fairview Park", "Garfield Heights", "Gates Mills", "Glenwillow", "Highland Heights",
              "Highland Hills", "Hunting Valley", "Independence", "Lakewood", "Linndale",
              "Lyndhurst", "Maple Heights", "Mayfield", "Mayfield Heights", "Middleburg Heights",
              "Moreland Hills", "Newburgh Heights", "North Olmsted", "North Randall", "North Royalton",
              "Oakwood", "Olmsted Falls", "Olmsted Township", "Orange", "Parma", "Parma Heights",
              "Pepper Pike", "Richmond Heights", "Rocky River", "Seven Hills", "Shaker Heights",
              "Solon", "South Euclid", "Strongsville", "University Heights", "Valley View",
              "Walton Hills", "Warrensville Heights", "Westlake", "Woodmere"
            ].map((city) => (
              <span key={city}>{city}</span>
            ))}
          </div>
        </div>

        {/* Data Sources */}
        <div className="bg-white dark:bg-dark-surface rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Data Sources & Updates</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Parcel Data</h4>
              <p className="text-gray-600 dark:text-gray-400">Cuyahoga County GIS Portal</p>
              <p className="text-gray-500 dark:text-gray-500 text-xs">Updated quarterly (Q1 full refresh)</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Building Codes</h4>
              <p className="text-gray-600 dark:text-gray-400">Municode, American Legal, City websites</p>
              <p className="text-gray-500 dark:text-gray-500 text-xs">Updated annually</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Ohio State Codes</h4>
              <p className="text-gray-600 dark:text-gray-400">ICC Safe, Ohio Board of Building Standards</p>
              <p className="text-gray-500 dark:text-gray-500 text-xs">OBC 2024, ORC 2019</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Contacts</h4>
              <p className="text-gray-600 dark:text-gray-400">Municipal building departments</p>
              <p className="text-gray-500 dark:text-gray-500 text-xs">Verified semi-annually</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/chat">
            <button className="px-8 py-4 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors shadow-md">
              Start Using the Chat
            </button>
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Part of the <a href="https://app.3bids.io" className="text-primary dark:text-accent hover:underline">3bids.io</a> platform
          </p>
        </div>
      </div>
    </div>
  );
}
