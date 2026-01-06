import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BookingCard } from "./BookingCard";
import { Calendar, CreditCard, Plane } from "lucide-react";

export function Dashboard() {
  const bookings = useQuery(api.bookings.getUserBookings);

  if (bookings === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-cyan/20 border-t-brand-cyan"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-cyan/10 blur-2xl rounded-full"></div>
            <Plane className="h-20 w-20 text-gray-600 relative z-10" />
          </div>
        </div>
        <h3 className="text-2xl font-semibold text-gray-300 mb-3">No bookings yet</h3>
        <p className="text-gray-500 text-lg">
          Your private charter bookings will appear here once you make a reservation.
        </p>
      </div>
    );
  }

  const activeBookings = bookings.filter(b => b.status === "active");
  const completedBookings = bookings.filter(b => b.status === "completed");

  return (
    <div className="space-y-10">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 group hover:shadow-glow-cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wider">Active Bookings</p>
              <p className="text-3xl font-bold text-white mt-1">{activeBookings.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-cyan/10 group-hover:bg-brand-cyan/20 transition-colors">
              <Calendar className="h-8 w-8 text-brand-cyan" />
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6 group hover:shadow-glow-cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wider">Total Paid</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${bookings.reduce((sum, b) => sum + b.amountPaid, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
              <CreditCard className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6 group hover:shadow-glow-purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wider">Completed Trips</p>
              <p className="text-3xl font-bold text-white mt-1">{completedBookings.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-purple/10 group-hover:bg-brand-purple/20 transition-colors">
              <Plane className="h-8 w-8 text-brand-purple" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
            <span className="w-1 h-6 bg-gradient-to-b from-brand-cyan to-brand-purple rounded-full"></span>
            Active Bookings
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Bookings */}
      {completedBookings.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
            <span className="w-1 h-6 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></span>
            Completed Bookings
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedBookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
