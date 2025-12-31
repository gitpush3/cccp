import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  Users, 
  MapPin, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { PaymentFrequencySelector } from "./PaymentFrequencySelector";
import { TravelerManager } from "./TravelerManager";
import { InstallmentTimeline } from "./InstallmentTimeline";

export function BookingDetail() {
  const { bookingId } = useParams();
  const [isPaying, setIsPaying] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const booking = useQuery(api.bookings.getBookingById, 
    bookingId ? { bookingId: bookingId as any } : "skip"
  );

  const payOffEarly = useAction(api.payments.payOffEarlyAction);
  const createPortalSession = useAction(api.payments.createStripePortalSession);

  if (booking === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-cyan/20 border-t-brand-cyan"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="glass-card p-12 text-center max-w-md mx-auto">
        <h3 className="text-2xl font-semibold text-gray-300 mb-4">Booking not found</h3>
        <button 
          onClick={() => window.location.href = "/"}
          className="text-brand-cyan hover:text-brand-cyan-light transition-colors font-medium"
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

  const handlePayOffEarly = async () => {
    if (!window.confirm(`Are you sure you want to pay off the remaining balance of $${remainingAmount.toLocaleString()}?`)) {
      return;
    }
    
    setIsPaying(true);
    try {
      await payOffEarly({ bookingId: booking._id });
      alert("Payment successful! Your booking is now fully paid.");
      window.location.reload();
    } catch (error: any) {
      alert(`Payment failed: ${error.message}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleStripePortal = async () => {
    setIsOpeningPortal(true);
    try {
      const url = await createPortalSession({ bookingId: booking._id });
      window.location.href = url;
    } catch (error: any) {
      alert(`Failed to open Stripe Portal: ${error.message}`);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => window.location.href = "/"}
          className="p-3 rounded-xl glass-card hover:border-brand-cyan/30 transition-all group"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400 group-hover:text-brand-cyan transition-colors" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {booking.trip?.tripName || `Trip ${booking.tripId}`}
          </h1>
          <p className="text-gray-500">Booking Details & Payment Management</p>
        </div>
      </div>

      {/* Trip Info Card */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-brand-cyan/10">
              <Calendar className="h-7 w-7 text-brand-cyan" />
            </div>
            <div>
              <p className="text-gray-500 text-sm uppercase tracking-wider">Travel Date</p>
              <p className="text-white font-semibold text-lg">{booking.trip?.travelDate}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-brand-purple/10">
              <Users className="h-7 w-7 text-brand-purple" />
            </div>
            <div>
              <p className="text-gray-500 text-sm uppercase tracking-wider">Package & Occupancy</p>
              <p className="text-white font-semibold text-lg">{booking.package} • {booking.occupancy} travelers</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${daysUntilCutoff > 0 ? 'bg-yellow-400/10' : 'bg-red-400/10'}`}>
              <Clock className={`h-7 w-7 ${daysUntilCutoff > 0 ? 'text-yellow-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-gray-500 text-sm uppercase tracking-wider">Payment Deadline</p>
              <p className={`font-semibold text-lg ${daysUntilCutoff > 0 ? 'text-white' : 'text-red-400'}`}>
                {daysUntilCutoff > 0 ? `${daysUntilCutoff} days` : "Overdue"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
          <span className="w-1 h-6 bg-gradient-to-b from-brand-cyan to-brand-purple rounded-full"></span>
          Payment Progress
        </h2>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400">Total Progress</span>
            <span className="text-white font-semibold text-xl">
              ${booking.amountPaid.toLocaleString()} <span className="text-gray-500">/</span> ${booking.totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-4 overflow-hidden">
            <div 
              className="progress-gradient h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-gray-500 text-sm">{progressPercentage.toFixed(1)}% complete</span>
            {!isCompleted && (
              <span className="text-gray-400 font-medium">
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
              <div className="mt-6 p-5 bg-gradient-to-r from-brand-cyan/10 to-brand-purple/10 border border-brand-cyan/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">Pay Remaining Balance</h3>
                    <p className="text-gray-400 text-sm mt-1">Pay off your booking early and cancel future installments</p>
                  </div>
                  <button 
                    onClick={handlePayOffEarly}
                    disabled={isPaying}
                    className="btn-brand px-5 py-3 flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isPaying && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Pay ${remainingAmount.toLocaleString()}</span>
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
      <div className="glass-card p-6">
        <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
          <span className="w-1 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full"></span>
          Payment Method
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-white/5">
              <CreditCard className="h-7 w-7 text-gray-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Manage Payment Methods</p>
              <p className="text-gray-500 text-sm mt-0.5">Update your card or billing information</p>
            </div>
          </div>
          <button 
            onClick={handleStripePortal}
            disabled={isOpeningPortal}
            className="px-5 py-3 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 transition-all border border-white/10 hover:border-brand-cyan/30 disabled:opacity-50 flex items-center space-x-2"
          >
            {isOpeningPortal && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Stripe Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
