import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { BookingDetail } from "./components/BookingDetail";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Plane, Sparkles } from "lucide-react";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Plane className="h-8 w-8 text-cyan-400" />
                <Sparkles className="h-4 w-4 text-purple-400 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  LatitudeGo
                </h1>
                <p className="text-xs text-gray-400 -mt-1">VIP Portal</p>
              </div>
            </div>
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Content />} />
          <Route path="/booking/:bookingId" element={
            <SignedIn>
              <BookingDetail />
            </SignedIn>
          } />
        </Routes>
      </main>
      
      <Toaster 
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            border: '1px solid #374151',
            color: '#f9fafb',
          },
        }}
      />
      </div>
    </Router>
  );
}

function Content() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-400/20 border-t-cyan-400"></div>
          <Plane className="h-6 w-6 text-cyan-400 absolute top-3 left-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SignedOut>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Plane className="h-16 w-16 text-cyan-400" />
                <Sparkles className="h-8 w-8 text-purple-400 absolute -top-2 -right-2" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Welcome to LatitudeGo
            </h1>
            <p className="text-gray-300 text-lg">
              Your exclusive VIP portal for private charter flights
            </p>
            <p className="text-gray-400 mt-2">
              Sign in to manage your bookings and payments
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <SignInButton mode="modal">
              <button className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all shadow-lg">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="w-full px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all border border-gray-600">
                Create Account
              </button>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
          </h1>
          <p className="text-gray-400">
            Manage your private charter bookings and payment schedules
          </p>
        </div>
        <Dashboard />
      </SignedIn>
    </div>
  );
}
