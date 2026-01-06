import { Calendar, CreditCard, MapPin, Users } from "lucide-react";

interface BookingCardProps {
  booking: {
    _id: string;
    tripId: string;
    package: string;
    occupancy: number;
    totalAmount: number;
    amountPaid: number;
    paymentFrequency: string;
    status: string;
    cutoffDate: string;
    trip?: {
      _id: string;
      tripName: string;
      travelDate: string;
      stripeProductId: string;
      packages: Array<{
        name: string;
        price: number;
        description: string;
        maxOccupancy: number;
      }>;
    } | null;
    installments?: Array<{
      dueDate: string;
      amount: number;
      status: string;
    }>;
  };
}

export function BookingCard({ booking }: BookingCardProps) {
  const progressPercentage = (booking.amountPaid / booking.totalAmount) * 100;
  const remainingAmount = booking.totalAmount - booking.amountPaid;
  
  const nextPayment = booking.installments?.find(i => i.status === "pending");
  const nextPaymentDate = nextPayment ? new Date(nextPayment.dueDate) : null;
  
  const isCompleted = booking.status === "completed";
  const isOverdue = booking.status === "overdue";

  return (
    <div className="glass-card p-6 group">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {booking.trip?.tripName || `Trip ${booking.tripId}`}
          </h3>
          <div className="flex items-center text-gray-400 text-sm space-x-4">
            <div className="flex items-center space-x-1.5">
              <Calendar className="h-4 w-4 text-brand-cyan" />
              <span>{booking.trip?.travelDate}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Users className="h-4 w-4 text-brand-purple" />
              <span>{booking.occupancy} travelers</span>
            </div>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
          isCompleted 
            ? "bg-green-400/20 text-green-400 border border-green-400/30" 
            : isOverdue
            ? "bg-red-400/20 text-red-400 border border-red-400/30"
            : "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
        }`}>
          {booking.status}
        </div>
      </div>

      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">Payment Progress</span>
          <span className="text-white font-semibold">
            ${booking.amountPaid.toLocaleString()} <span className="text-gray-500">/</span> ${booking.totalAmount.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
          <div 
            className="progress-gradient h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-sm">
          <span className="text-gray-500">{progressPercentage.toFixed(1)}% complete</span>
          {!isCompleted && (
            <span className="text-gray-400">
              ${remainingAmount.toLocaleString()} remaining
            </span>
          )}
        </div>
      </div>

      {!isCompleted && nextPaymentDate && (
        <div className="mb-5 p-4 bg-white/5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-brand-cyan/10">
                <CreditCard className="h-4 w-4 text-brand-cyan" />
              </div>
              <span className="text-gray-300 text-sm font-medium">Next Payment</span>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold">${nextPayment?.amount.toLocaleString()}</div>
              <div className="text-gray-500 text-xs">
                {nextPaymentDate.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <div className="text-sm text-gray-500">
          <span className="capitalize">{booking.paymentFrequency.replace('-', ' ')}</span> payments
        </div>
        <button
          onClick={() => window.location.href = `/booking/${booking._id}`}
          className="btn-brand px-5 py-2.5 text-sm"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
