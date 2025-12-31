import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BookingCard } from "./BookingCard";
import { Calendar, CreditCard, Plane } from "lucide-react";

export function Dashboard() {
  const bookings = useQuery(api.bookings.getUserBookings);

  if (bookings === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400/20 border-t-cyan-400"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <Plane className="h-16 w-16 text-gray-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No bookings yet</h3>
        <p className="text-gray-400">
          Your private charter bookings will appear here once you make a reservation.
        </p>
      </div>
    );
  }

  const activeBookings = bookings.filter(b => b.status === "active");
  const completedBookings = bookings.filter(b => b.status === "completed");

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Bookings</p>
              <p className="text-2xl font-bold text-white">{activeBookings.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-cyan-400" />
          </div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Paid</p>
              <p className="text-2xl font-bold text-white">
                ${bookings.reduce((sum, b) => sum + b.amountPaid, 0).toLocaleString()}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Completed Trips</p>
              <p className="text-2xl font-bold text-white">{completedBookings.length}</p>
            </div>
            <Plane className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Active Bookings</h2>
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
          <h2 className="text-xl font-semibold text-white mb-4">Completed Bookings</h2>
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
