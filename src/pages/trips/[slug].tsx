import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Calendar, MapPin, Users, Check, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";

interface BookingFormData {
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

export default function TripDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const trip = useQuery(api.trips.getTripBySlug, slug ? { slug } : "skip");
  const user = useQuery(api.users.getCurrentUser);
  const createBookingCheckout = useAction(api.bookingsActions.createBookingCheckout);

  const [selectedPackageId, setSelectedPackageId] = useState<Id<"packages"> | null>(null);
  const [step, setStep] = useState<"select" | "form" | "checkout">("select");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
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

  // Capture referral code from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      localStorage.setItem("referral_code", ref);
    }
  }, []);

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (user?.email) {
      setFormData((prev) => ({ ...prev, email: user.email }));
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

  if (trip === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading trip details...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Trip Not Found</h1>
          <p className="text-gray-500 mb-4">This trip may no longer be available.</p>
          <button
            onClick={() => navigate("/trips")}
            className="px-6 py-2 bg-primary text-white rounded-lg font-medium"
          >
            View All Trips
          </button>
        </div>
      </div>
    );
  }

  const selectedPackage = trip.packages.find((p) => p._id === selectedPackageId);

  const handlePackageSelect = (packageId: Id<"packages">) => {
    setSelectedPackageId(packageId);
    setStep("form");
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageId || !selectedPackage) return;

    setIsSubmitting(true);
    try {
      const referralCode = localStorage.getItem("referral_code") || undefined;

      const { checkoutUrl } = await createBookingCheckout({
        packageId: selectedPackageId,
        formData: {
          ...formData,
          seats: Number(formData.seats),
        },
        referralCode,
      });

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark">
      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[300px] bg-gradient-to-br from-primary to-accent">
        {trip.imageUrl && (
          <img
            src={trip.imageUrl}
            alt={trip.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{trip.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>
                  {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {["Select Package", "Your Details", "Payment"].map((label, idx) => {
            const stepKeys = ["select", "form", "checkout"] as const;
            const isActive = stepKeys.indexOf(step) >= idx;
            const isCurrent = stepKeys[idx] === step;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isCurrent ? "text-primary dark:text-accent" : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
                {idx < 2 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Package Selection */}
        {step === "select" && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Choose Your Package
            </h2>
            {trip.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-8">{trip.description}</p>
            )}

            <div className="grid gap-6">
              {trip.packages.map((pkg) => (
                <div
                  key={pkg._id}
                  className={`bg-white dark:bg-dark-surface rounded-2xl p-6 border-2 transition-all cursor-pointer ${
                    selectedPackageId === pkg._id
                      ? "border-primary shadow-lg"
                      : "border-gray-200 dark:border-gray-800 hover:border-primary/50"
                  }`}
                  onClick={() => handlePackageSelect(pkg._id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {pkg.title}
                      </h3>
                      {pkg.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {pkg.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Deposit: ${(pkg.depositAmount / 100).toLocaleString()}</span>
                        {pkg.inventory !== undefined && pkg.inventory !== null && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {pkg.inventory} spots left
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-primary dark:text-accent">
                        ${(pkg.price / 100).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">per person</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Booking Form */}
        {step === "form" && selectedPackage && (
          <div>
            <button
              onClick={() => setStep("select")}
              className="text-sm text-primary dark:text-accent hover:underline mb-6 flex items-center gap-1"
            >
              ← Back to packages
            </button>

            <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedPackage.title}
                  </h2>
                  <p className="text-sm text-gray-500">{trip.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary dark:text-accent">
                    ${(selectedPackage.price / 100).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Deposit today: ${(selectedPackage.depositAmount / 100).toLocaleString()}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
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
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
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
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
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
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
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
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
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
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Seats *
                    </label>
                    <select
                      name="seats"
                      value={formData.seats}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>
                          {n}
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
                      onChange={handleFormChange}
                      required
                      placeholder="e.g., Cleveland, OH"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
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
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark focus:ring-2 focus:ring-primary dark:focus:ring-accent focus:border-transparent"
                  />
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 dark:bg-dark rounded-xl p-6 mt-8">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">Payment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {selectedPackage.title} × {formData.seats}
                      </span>
                      <span className="font-medium">
                        ${((selectedPackage.price * Number(formData.seats)) / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Deposit Due Today</span>
                        <span className="text-primary dark:text-accent">
                          ${((selectedPackage.depositAmount * Number(formData.seats)) / 100).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Remaining balance due by {new Date(trip.cutoffDate).toLocaleDateString()}
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
                  By continuing, you agree to our terms and conditions. Your deposit is fully refundable within 7 days.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
