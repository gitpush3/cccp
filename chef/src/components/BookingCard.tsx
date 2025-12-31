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
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-cyan-400/50 transition-all duration-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {booking.trip?.tripName || `Trip ${booking.tripId}`}
          </h3>
          <div className="flex items-center text-gray-400 text-sm space-x-4">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{booking.trip?.travelDate}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{booking.occupancy} travelers</span>
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isCompleted 
            ? "bg-green-400/20 text-green-400" 
            : isOverdue
            ? "bg-red-400/20 text-red-400"
            : "bg-cyan-400/20 text-cyan-400"
        }`}>
          {booking.status}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">Payment Progress</span>
          <span className="text-white font-medium">
            ${booking.amountPaid.toLocaleString()} / ${booking.totalAmount.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-sm">
          <span className="text-gray-400">{progressPercentage.toFixed(1)}% complete</span>
          {!isCompleted && (
            <span className="text-gray-300">
              ${remainingAmount.toLocaleString()} remaining
            </span>
          )}
        </div>
      </div>

      {!isCompleted && nextPaymentDate && (
        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-cyan-400" />
              <span className="text-gray-300 text-sm">Next Payment</span>
            </div>
            <div className="text-right">
              <div className="text-white font-medium">${nextPayment?.amount.toLocaleString()}</div>
              <div className="text-gray-400 text-xs">
                {nextPaymentDate.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          <span className="capitalize">{booking.paymentFrequency.replace('-', ' ')}</span> payments
        </div>
        <button
          onClick={() => window.location.href = `/booking/${booking._id}`}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-200"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
