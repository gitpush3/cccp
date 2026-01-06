import { useState, useEffect } from "react";
import { ChevronRight, ArrowLeft } from "lucide-react";

interface BookingFormProps {
  trip: {
    _id: string;
    title: string;
    cutoffDate: string;
  };
  selectedPackage: {
    _id: string;
    title: string;
    price: number;
    depositAmount: number;
  };
  user?: {
    email?: string;
    name?: string;
  } | null;
  onSubmit: (formData: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  preferredName: string;
  seats: number;
  departureCity: string;
  specialRequests: string;
}

export default function BookingForm({
  trip,
  selectedPackage,
  user,
  onSubmit,
  onBack,
  isSubmitting,
}: BookingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    preferredName: "",
    seats: 1,
    departureCity: "",
    specialRequests: "",
  });

  // Pre-fill from user data
  useEffect(() => {
    if (user?.email) {
      setFormData((prev) => ({ ...prev, email: user.email || "" }));
    }
    if (user?.name) {
      const [first, ...rest] = user.name.split(" ");
      setFormData((prev) => ({
        ...prev,
        firstName: first || "",
        lastName: rest.join(" ") || "",
      }));
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const totalPrice = selectedPackage.price * formData.seats;
  const depositTotal = selectedPackage.depositAmount * formData.seats;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-accent mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to trip details
        </button>

        <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-lg">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Complete Your Booking
              </h1>
              <p className="text-sm text-gray-500 mt-1">{trip.title}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{selectedPackage.title}</p>
              <p className="text-2xl font-bold text-primary dark:text-accent">
                ${(selectedPackage.price / 100).toLocaleString()}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Name
                </label>
                <input
                  type="text"
                  name="preferredName"
                  value={formData.preferredName}
                  onChange={handleChange}
                  placeholder="What should we call you?"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Travelers *
                </label>
                <select
                  name="seats"
                  value={formData.seats}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "traveler" : "travelers"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Departure City *
                </label>
                <input
                  type="text"
                  name="departureCity"
                  value={formData.departureCity}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Cleveland, OH"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Special Requests or Dietary Requirements
              </label>
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleChange}
                rows={3}
                placeholder="Any allergies, dietary restrictions, or special accommodations?"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent transition-colors"
              />
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 dark:bg-dark rounded-xl p-6 mt-8">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                Payment Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {selectedPackage.title} × {formData.seats}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${(totalPrice / 100).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900 dark:text-white">Deposit Due Today</span>
                    <span className="text-primary dark:text-accent">
                      ${(depositTotal / 100).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Remaining ${((totalPrice - depositTotal) / 100).toLocaleString()} due by{" "}
                    {new Date(trip.cutoffDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Processing..." : "Continue to Payment"}
              {!isSubmitting && <ChevronRight className="h-5 w-5" />}
            </button>

            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to our terms and conditions. Your deposit is fully
              refundable within 7 days.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
