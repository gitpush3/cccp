import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  Users, 
  MapPin, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { PaymentFrequencySelector } from "./PaymentFrequencySelector";
import { TravelerManager } from "./TravelerManager";
import { InstallmentTimeline } from "./InstallmentTimeline";

export function BookingDetail() {
  const { bookingId } = useParams();
  const booking = useQuery(api.bookings.getBookingById, 
    bookingId ? { bookingId: bookingId as any } : "skip"
  );

  if (booking === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400/20 border-t-cyan-400"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Booking not found</h3>
        <button 
          onClick={() => window.location.href = "/"}
          className="text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Return to dashboard
        </button>
      </div>
    );
  }

  const progressPercentage = (booking.amountPaid / booking.totalAmount) * 100;
  const remainingAmount = booking.totalAmount - booking.amountPaid;
  const isCompleted = booking.status === "completed";
  const cutoffDate = new Date(booking.cutoffDate);
  const daysUntilCutoff = Math.ceil((cutoffDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => window.location.href = "/"}
          className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-cyan-400/50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {booking.trip?.tripName || `Trip ${booking.tripId}`}
          </h1>
          <p className="text-gray-400">Booking Details & Payment Management</p>
        </div>
      </div>

      {/* Trip Info Card */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-gray-400 text-sm">Travel Date</p>
              <p className="text-white font-medium">{booking.trip?.travelDate}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-gray-400 text-sm">Package & Occupancy</p>
              <p className="text-white font-medium">{booking.package} • {booking.occupancy} travelers</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-gray-400 text-sm">Payment Deadline</p>
              <p className="text-white font-medium">
                {daysUntilCutoff > 0 ? `${daysUntilCutoff} days` : "Overdue"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Payment Progress</h2>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Total Progress</span>
            <span className="text-white font-medium text-lg">
              ${booking.amountPaid.toLocaleString()} / ${booking.totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-purple-400 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-400 text-sm">{progressPercentage.toFixed(1)}% complete</span>
            {!isCompleted && (
              <span className="text-gray-300 font-medium">
                ${remainingAmount.toLocaleString()} remaining
              </span>
            )}
          </div>
        </div>

        {!isCompleted && (
          <>
            <PaymentFrequencySelector 
              bookingId={booking._id}
              currentFrequency={booking.paymentFrequency}
              remainingAmount={remainingAmount}
              cutoffDate={booking.cutoffDate}
            />
            
            {remainingAmount > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Pay Remaining Balance</h3>
                    <p className="text-gray-400 text-sm">Pay off your booking early and cancel future installments</p>
                  </div>
                  <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-200">
                    Pay ${remainingAmount.toLocaleString()}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Installment Timeline */}
      <InstallmentTimeline installments={booking.installments || []} />

      {/* Travelers Management */}
      <TravelerManager 
        bookingId={booking._id}
        maxOccupancy={booking.occupancy}
        travelers={booking.travelers || []}
      />

      {/* Payment Method */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Payment Method</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-white font-medium">Manage Payment Methods</p>
              <p className="text-gray-400 text-sm">Update your card or billing information</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors">
            Stripe Portal
          </button>
        </div>
      </div>
    </div>
  );
}
