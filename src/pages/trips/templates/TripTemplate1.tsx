import { Calendar, MapPin, Users, Check, X, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface TripData {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  startDate: string;
  endDate: string;
  cutoffDate: string;
  heroImageUrl?: string;
  heroTagline?: string;
  galleryImages?: string[];
  itinerary?: { day: number; title: string; description: string; imageUrl?: string }[];
  highlights?: string[];
  included?: string[];
  excluded?: string[];
  destination?: string;
  meetingPoint?: string;
  longDescription?: string;
  videoUrl?: string;
  packages: {
    _id: string;
    title: string;
    price: number;
    depositAmount: number;
    description?: string;
    inventory?: number;
  }[];
}

interface TripTemplate1Props {
  trip: TripData;
  onSelectPackage: (packageId: string) => void;
}

export default function TripTemplate1({ trip, onSelectPackage }: TripTemplate1Props) {
  const lowestPrice = trip.packages.length > 0 
    ? Math.min(...trip.packages.map(p => p.price)) 
    : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-dark">
      {/* Hero Section - Full Width Image */}
      <div className="relative h-[70vh] min-h-[500px]">
        {trip.heroImageUrl ? (
          <img
            src={trip.heroImageUrl}
            alt={trip.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="max-w-6xl mx-auto">
            {trip.destination && (
              <div className="flex items-center gap-2 text-white/80 mb-4">
                <MapPin className="h-5 w-5" />
                <span className="text-lg">{trip.destination}</span>
              </div>
            )}
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
              {trip.title}
            </h1>
            {trip.heroTagline && (
              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mb-6">
                {trip.heroTagline}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-6 text-white/80">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>
                  {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {lowestPrice > 0 && (
                <div className="bg-accent px-4 py-2 rounded-full text-white font-bold">
                  From ${(lowestPrice / 100).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="bg-primary text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Book by {new Date(trip.cutoffDate).toLocaleDateString()}</span>
          </div>
          {trip.meetingPoint && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Depart from {trip.meetingPoint}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Description */}
        {trip.description && (
          <div className="mb-16">
            <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl">
              {trip.description}
            </p>
          </div>
        )}

        {/* Highlights */}
        {trip.highlights && trip.highlights.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Trip Highlights
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trip.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-dark-surface rounded-xl"
                >
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Itinerary */}
        {trip.itinerary && trip.itinerary.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Day by Day Itinerary
            </h2>
            <div className="space-y-6">
              {trip.itinerary.map((day, idx) => (
                <div
                  key={idx}
                  className="flex gap-6 p-6 bg-gray-50 dark:bg-dark-surface rounded-2xl"
                >
                  <div className="w-16 h-16 bg-primary text-white rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs uppercase">Day</span>
                    <span className="text-2xl font-bold">{day.day}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {day.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{day.description}</p>
                  </div>
                  {day.imageUrl && (
                    <img
                      src={day.imageUrl}
                      alt={day.title}
                      className="w-32 h-24 object-cover rounded-lg hidden md:block"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What's Included/Excluded */}
        {(trip.included?.length || trip.excluded?.length) && (
          <div className="mb-16 grid md:grid-cols-2 gap-8">
            {trip.included && trip.included.length > 0 && (
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                <h3 className="text-xl font-bold text-green-800 dark:text-green-400 mb-4">
                  What's Included
                </h3>
                <ul className="space-y-3">
                  {trip.included.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-green-700 dark:text-green-300">
                      <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {trip.excluded && trip.excluded.length > 0 && (
              <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <h3 className="text-xl font-bold text-red-800 dark:text-red-400 mb-4">
                  Not Included
                </h3>
                <ul className="space-y-3">
                  {trip.excluded.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-red-700 dark:text-red-300">
                      <X className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Video */}
        {trip.videoUrl && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Watch the Experience
            </h2>
            <div className="aspect-video rounded-2xl overflow-hidden">
              <iframe
                src={trip.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Packages */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Choose Your Package
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trip.packages.map((pkg) => (
              <div
                key={pkg._id}
                className="bg-white dark:bg-dark-surface border-2 border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-primary transition-colors"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {pkg.title}
                </h3>
                {pkg.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {pkg.description}
                  </p>
                )}
                <div className="mb-4">
                  <span className="text-3xl font-black text-primary dark:text-accent">
                    ${(pkg.price / 100).toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">per person</span>
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  Deposit: ${(pkg.depositAmount / 100).toLocaleString()}
                </div>
                {pkg.inventory !== undefined && pkg.inventory !== null && (
                  <div className="text-sm text-accent font-medium mb-4">
                    Only {pkg.inventory} spots left!
                  </div>
                )}
                <button
                  onClick={() => onSelectPackage(pkg._id)}
                  className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  Select Package <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Gallery */}
        {trip.galleryImages && trip.galleryImages.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Gallery
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {trip.galleryImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${trip.title} gallery ${idx + 1}`}
                  className="aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
