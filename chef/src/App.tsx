import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
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
            <Authenticated>
              <SignOutButton />
            </Authenticated>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Content />} />
          <Route path="/booking/:bookingId" element={
            <Authenticated>
              <BookingDetail />
            </Authenticated>
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
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
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
      <Unauthenticated>
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
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {loggedInUser?.name || loggedInUser?.email}
          </h1>
          <p className="text-gray-400">
            Manage your private charter bookings and payment schedules
          </p>
        </div>
        <Dashboard />
      </Authenticated>
    </div>
  );
}
