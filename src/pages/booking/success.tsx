import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSearchParams, Link } from "react-router-dom";
import { Check, Calendar, CreditCard, Download, Mail } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking") as Id<"bookings"> | null;

  const booking = useQuery(
    api.bookings.getBookingById,
    bookingId ? { bookingId } : "skip"
  );

  if (booking === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading your booking...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Booking Not Found
          </h1>
          <p className="text-gray-500 mb-4">
            We couldn't find this booking. Please check your email for confirmation.
          </p>
          <Link
            to="/trips"
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium"
          >
            View All Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Thank you for your deposit. We're excited to have you on this adventure!
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-lg mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Booking Details
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Trip</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {booking.trip?.title}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Package</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {booking.package?.title}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Travel Dates</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {booking.trip?.startDate && new Date(booking.trip.startDate).toLocaleDateString()} -{" "}
                {booking.trip?.endDate && new Date(booking.trip.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ${(booking.totalAmount / 100).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Deposit Paid</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                ${(booking.depositPaid / 100).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-600 dark:text-gray-400">Remaining Balance</span>
              <span className="font-bold text-primary dark:text-accent">
                ${((booking.totalAmount - booking.depositPaid) / 100).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Schedule */}
        {booking.installments && booking.installments.length > 0 && (
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-lg mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary dark:text-accent" />
              Payment Schedule
            </h2>

            <div className="space-y-3">
              {booking.installments.map((installment, idx) => (
                <div
                  key={installment._id}
                  className={`flex justify-between items-center py-3 px-4 rounded-lg ${
                    installment.status === "paid"
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-gray-50 dark:bg-dark"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        installment.status === "paid"
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {installment.status === "paid" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Payment {idx + 1}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due {new Date(installment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      ${(installment.amount / 100).toLocaleString()}
                    </p>
                    <p
                      className={`text-xs ${
                        installment.status === "paid"
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {installment.status === "paid" ? "Paid" : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Payments will be automatically charged to your card on file. You'll receive a reminder 3 days before each payment.
            </p>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-8 border border-primary/20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            What's Next?
          </h2>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary dark:text-accent flex-shrink-0 mt-0.5" />
              <span>
                Check your email for a confirmation with all the details about your trip.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-primary dark:text-accent flex-shrink-0 mt-0.5" />
              <span>
                Your remaining balance will be charged automatically according to the payment schedule above.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary dark:text-accent flex-shrink-0 mt-0.5" />
              <span>
                We'll send you detailed trip information and packing lists closer to your departure date.
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            to="/trips"
            className="flex-1 py-3 px-6 bg-primary text-white rounded-xl font-bold text-center hover:bg-primary-hover transition-colors"
          >
            Explore More Trips
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
          >
            <Download className="h-4 w-4" />
            Print Confirmation
          </button>
        </div>
      </div>
    </div>
  );
}
