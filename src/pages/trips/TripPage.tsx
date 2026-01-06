import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";

import TripTemplate1 from "./templates/TripTemplate1";
import TripTemplate2 from "./templates/TripTemplate2";
import TripTemplate3 from "./templates/TripTemplate3";
import BookingForm from "./BookingForm";

export default function TripPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  
  // tripId can be either a slug or an actual ID
  const trip = useQuery(api.trips.getTripBySlug, tripId ? { slug: tripId } : "skip");
  const user = useQuery(api.users.getCurrentUser);
  const createBookingCheckout = useAction(api.bookingsActions.createBookingCheckout);

  const [selectedPackageId, setSelectedPackageId] = useState<Id<"packages"> | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Capture referral code from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      localStorage.setItem("referral_code", ref);
    }
  }, []);

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

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId as Id<"packages">);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (formData: any) => {
    if (!selectedPackageId) return;

    setIsSubmitting(true);
    try {
      const referralCode = localStorage.getItem("referral_code") || undefined;

      const result = await createBookingCheckout({
        packageId: selectedPackageId,
        formData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          preferredName: formData.preferredName || undefined,
          seats: Number(formData.seats),
          departureCity: formData.departureCity,
          specialRequests: formData.specialRequests || undefined,
        },
        referralCode,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowBookingForm(false);
    setSelectedPackageId(null);
  };

  // Build trip data for templates
  const tripData = {
    _id: trip._id,
    title: trip.title,
    slug: trip.slug,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    cutoffDate: trip.cutoffDate,
    heroImageUrl: trip.heroImageUrl || trip.imageUrl || undefined,
    heroTagline: trip.heroTagline,
    galleryImages: trip.galleryImages,
    itinerary: trip.itinerary,
    highlights: trip.highlights,
    included: trip.included,
    excluded: trip.excluded,
    destination: trip.destination,
    meetingPoint: trip.meetingPoint,
    longDescription: trip.longDescription,
    videoUrl: trip.videoUrl,
    packages: trip.packages.map((pkg: any) => ({
      _id: pkg._id,
      title: pkg.title,
      price: pkg.price,
      depositAmount: pkg.depositAmount,
      description: pkg.description,
      inventory: pkg.inventory,
    })),
  };

  const selectedPackage = trip.packages.find((p: any) => p._id === selectedPackageId);

  // Render booking form modal if package selected
  if (showBookingForm && selectedPackage) {
    return (
      <BookingForm
        trip={tripData}
        selectedPackage={selectedPackage}
        user={user}
        onSubmit={handleBookingSubmit}
        onBack={handleCloseForm}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Select template based on trip.template field
  const template = trip.template || "1";

  switch (template) {
    case "2":
      return <TripTemplate2 trip={tripData} onSelectPackage={handleSelectPackage} />;
    case "3":
      return <TripTemplate3 trip={tripData} onSelectPackage={handleSelectPackage} />;
    case "1":
    default:
      return <TripTemplate1 trip={tripData} onSelectPackage={handleSelectPackage} />;
  }
}
