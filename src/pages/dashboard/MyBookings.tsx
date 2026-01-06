import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router-dom";
import { Calendar, MapPin, CreditCard, ChevronRight, Clock, Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MyBookings() {
  const user = useQuery(api.users.getCurrentUser);
  const bookings = useQuery(
    api.bookings.getUserBookings,
    user?._id ? { userId: user._id } : "skip"
  );

  if (user === undefined || bookings === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading your bookings...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign In Required
          </h1>
          <p className="text-gray-500 mb-4">Please sign in to view your bookings.</p>
          <Link
            to="/join"
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
              My Bookings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your trips and payments
            </p>
          </div>
          <Link
            to="/trips"
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Browse Trips
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-100 dark:bg-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Bookings Yet
            </h2>
            <p className="text-gray-500 mb-6">
              You haven't booked any trips yet. Start exploring!
            </p>
            <Link
              to="/trips"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors"
            >
              Explore Trips <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking: any) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: any }) {
  const [expanded, setExpanded] = useState(false);
  const payInstallment = useAction(api.bookingsActions.payInstallment);
  const [payingId, setPayingId] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    pending_deposit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    fully_paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  const statusLabels: Record<string, string> = {
    pending_deposit: "Awaiting Deposit",
    confirmed: "Confirmed",
    fully_paid: "Fully Paid",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };

  const remainingBalance = booking.totalAmount - booking.depositPaid;
  const pendingInstallments = booking.installments?.filter((i: any) => i.status === "pending") || [];
  const nextInstallment = pendingInstallments[0];

  const handlePayNow = async (installmentId: any) => {
    setPayingId(installmentId);
    try {
      const result = await payInstallment({ installmentId } as any);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process payment");
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {booking.trip?.title || "Trip"}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[booking.status] || statusColors.confirmed}`}>
                {statusLabels[booking.status] || booking.status}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {booking.package?.title}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(booking.totalAmount / 100).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
          {booking.trip?.startDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(booking.trip.startDate).toLocaleDateString()} - {new Date(booking.trip.endDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {booking.metadata?.seats && (
            <div className="flex items-center gap-2">
              <span>{booking.metadata.seats} traveler{booking.metadata.seats > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Progress */}
      <div className="p-6 bg-gray-50 dark:bg-dark">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Progress</span>
          <span className="text-sm text-gray-500">
            ${(booking.depositPaid / 100).toLocaleString()} of ${(booking.totalAmount / 100).toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
            style={{ width: `${Math.min(100, (booking.depositPaid / booking.totalAmount) * 100)}%` }}
          />
        </div>
        {remainingBalance > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            ${(remainingBalance / 100).toLocaleString()} remaining
            {booking.trip?.cutoffDate && (
              <> • Due by {new Date(booking.trip.cutoffDate).toLocaleDateString()}</>
            )}
          </p>
        )}
      </div>

      {/* Upcoming Payment Alert */}
      {nextInstallment && booking.status !== "fully_paid" && (
        <div className="p-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between bg-accent/10 dark:bg-accent/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Next Payment: ${(nextInstallment.amount / 100).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  Due {new Date(nextInstallment.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handlePayNow(nextInstallment._id)}
              disabled={payingId === nextInstallment._id}
              className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {payingId === nextInstallment._id ? "Processing..." : "Pay Now"}
            </button>
          </div>
        </div>
      )}

      {/* Expandable Details */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark transition-colors"
        >
          <span>View Details & Payment Schedule</span>
          <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>

        {expanded && (
          <div className="p-6 pt-0 space-y-6">
            {/* Traveler Info */}
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">Traveler Information</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {booking.metadata?.firstName} {booking.metadata?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{booking.metadata?.email}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{booking.metadata?.phone}</span>
                </div>
                <div>
                  <span className="text-gray-500">Departure City:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{booking.metadata?.departureCity}</span>
                </div>
              </div>
              {booking.metadata?.specialRequests && (
                <div className="mt-3">
                  <span className="text-gray-500 text-sm">Special Requests:</span>
                  <p className="text-gray-900 dark:text-white text-sm mt-1">{booking.metadata.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Payment Schedule */}
            {booking.installments && booking.installments.length > 0 && (
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Payment Schedule</h4>
                <div className="space-y-2">
                  {/* Deposit */}
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Deposit</p>
                        <p className="text-xs text-gray-500">Paid</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      ${(booking.depositPaid / 100).toLocaleString()}
                    </span>
                  </div>

                  {/* Installments */}
                  {booking.installments.map((installment: any, idx: number) => (
                    <div
                      key={installment._id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        installment.status === "paid"
                          ? "bg-green-50 dark:bg-green-900/20"
                          : installment.status === "failed"
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-gray-50 dark:bg-dark"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          installment.status === "paid"
                            ? "bg-green-500"
                            : installment.status === "failed"
                            ? "bg-red-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}>
                          {installment.status === "paid" ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : installment.status === "failed" ? (
                            <AlertCircle className="h-4 w-4 text-white" />
                          ) : (
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{idx + 1}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Payment {idx + 1}</p>
                          <p className="text-xs text-gray-500">
                            {installment.status === "paid"
                              ? `Paid ${new Date(installment.paidAt).toLocaleDateString()}`
                              : `Due ${new Date(installment.dueDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 dark:text-white">
                          ${(installment.amount / 100).toLocaleString()}
                        </span>
                        {installment.status === "pending" && (
                          <button
                            onClick={() => handlePayNow(installment._id)}
                            disabled={payingId === installment._id}
                            className="px-3 py-1 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                          >
                            {payingId === installment._id ? "..." : "Pay"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Link
                to={`/trip-${booking.trip?.slug}`}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark transition-colors"
              >
                View Trip Details
              </Link>
              <Link
                to={`/bookings/${booking._id}/edit`}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark transition-colors"
              >
                Edit Details
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
