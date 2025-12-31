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
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-brand-cyan/10" style={{ background: 'rgba(15, 15, 26, 0.85)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-cyan/20 blur-xl rounded-full"></div>
                <Plane className="h-10 w-10 text-brand-cyan relative z-10" />
                <Sparkles className="h-5 w-5 text-brand-purple absolute -top-1 -right-1 z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-brand">
                  LatitudeGo
                </h1>
                <p className="text-xs text-gray-400 -mt-0.5 tracking-wider uppercase">VIP Portal</p>
              </div>
            </div>
            <SignedIn>
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full ring-2 ring-brand-cyan/30 ring-offset-2 ring-offset-transparent overflow-hidden">
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10"
                      }
                    }}
                  />
                </div>
              </div>
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
        <div className="max-w-lg mx-auto">
          <div className="glass-card p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative animate-float">
                <div className="absolute inset-0 bg-brand-cyan/30 blur-2xl rounded-full scale-150"></div>
                <Plane className="h-20 w-20 text-brand-cyan relative z-10" />
                <Sparkles className="h-10 w-10 text-brand-purple absolute -top-2 -right-2 z-10" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gradient-brand mb-4">
              Welcome to LatitudeGo
            </h1>
            <p className="text-gray-300 text-xl mb-2">
              Your exclusive VIP portal for private charter flights
            </p>
            <p className="text-gray-500 mb-8">
              Sign in to manage your bookings and payments
            </p>
            <div className="flex flex-col gap-4">
              <SignInButton mode="modal">
                <button className="btn-brand w-full text-lg">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="w-full px-6 py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-all border border-white/10 hover:border-brand-cyan/30">
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome back, <span className="text-gradient-brand">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Manage your private charter bookings and payment schedules
          </p>
        </div>
        <Dashboard />
      </SignedIn>
    </div>
  );
}
