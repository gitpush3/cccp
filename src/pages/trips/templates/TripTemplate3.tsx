import { Calendar, MapPin, Users, Check, X, Clock, ChevronRight, Star, ArrowRight } from "lucide-react";

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

interface TripTemplate3Props {
  trip: TripData;
  onSelectPackage: (packageId: string) => void;
}

export default function TripTemplate3({ trip, onSelectPackage }: TripTemplate3Props) {
  const lowestPrice = trip.packages.length > 0 
    ? Math.min(...trip.packages.map(p => p.price)) 
    : 0;

  const tripDuration = Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cinematic Hero with Overlay Text */}
      <div className="relative h-screen">
        {trip.heroImageUrl ? (
          <img
            src={trip.heroImageUrl}
            alt={trip.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
        )}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Centered Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          {trip.destination && (
            <div className="flex items-center gap-2 text-accent mb-6">
              <MapPin className="h-5 w-5" />
              <span className="uppercase tracking-[0.3em] text-sm font-medium">{trip.destination}</span>
            </div>
          )}
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 max-w-5xl leading-tight">
            {trip.title}
          </h1>
          
          {trip.heroTagline && (
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mb-10">
              {trip.heroTagline}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-white/70">
              <Calendar className="h-5 w-5" />
              <span>{tripDuration} Days</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Clock className="h-5 w-5" />
              <span>
                {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {lowestPrice > 0 && (
            <a
              href="#book"
              className="group inline-flex items-center gap-4 px-10 py-5 bg-accent hover:bg-accent/90 rounded-full text-xl font-bold transition-all hover:scale-105"
            >
              Book from ${(lowestPrice / 100).toLocaleString()}
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </a>
          )}
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-primary to-accent py-8">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-black">{tripDuration}</div>
            <div className="text-white/70 text-sm uppercase tracking-wider">Days</div>
          </div>
          <div>
            <div className="text-4xl font-black">{trip.itinerary?.length || "5+"}</div>
            <div className="text-white/70 text-sm uppercase tracking-wider">Experiences</div>
          </div>
          <div>
            <div className="text-4xl font-black">{trip.highlights?.length || "10+"}</div>
            <div className="text-white/70 text-sm uppercase tracking-wider">Highlights</div>
          </div>
          <div>
            <div className="text-4xl font-black">∞</div>
            <div className="text-white/70 text-sm uppercase tracking-wider">Memories</div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      {trip.description && (
        <div className="py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-8">The Experience</h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              {trip.description}
            </p>
            {trip.longDescription && (
              <p className="text-lg text-gray-500 leading-relaxed mt-6">
                {trip.longDescription}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Full-Width Gallery Strip */}
      {trip.galleryImages && trip.galleryImages.length > 0 && (
        <div className="py-8 overflow-hidden">
          <div className="flex gap-4 animate-scroll">
            {[...trip.galleryImages, ...trip.galleryImages].map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Gallery ${idx + 1}`}
                className="h-64 md:h-80 w-auto object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* Highlights Grid */}
      {trip.highlights && trip.highlights.length > 0 && (
        <div className="py-24 px-4 bg-gray-950">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black mb-16 text-center">
              Why This Trip
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {trip.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-6 p-6 bg-gray-900 rounded-2xl border border-gray-800 hover:border-accent transition-colors"
                >
                  <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Star className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <p className="text-lg text-gray-200">{highlight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Itinerary - Alternating Layout */}
      {trip.itinerary && trip.itinerary.length > 0 && (
        <div className="py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black mb-16 text-center">
              Your Journey
            </h2>
            <div className="space-y-16">
              {trip.itinerary.map((day, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center`}
                >
                  {day.imageUrl && (
                    <div className="w-full md:w-1/2">
                      <img
                        src={day.imageUrl}
                        alt={day.title}
                        className="rounded-2xl w-full aspect-video object-cover"
                      />
                    </div>
                  )}
                  <div className={`w-full ${day.imageUrl ? 'md:w-1/2' : ''} ${idx % 2 === 0 ? 'md:pl-8' : 'md:pr-8'}`}>
                    <div className="inline-block px-4 py-2 bg-accent rounded-full text-sm font-bold mb-4">
                      Day {day.day}
                    </div>
                    <h3 className="text-3xl font-bold mb-4">{day.title}</h3>
                    <p className="text-gray-400 text-lg">{day.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Section */}
      {trip.videoUrl && (
        <div className="py-24 px-4 bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black mb-12 text-center">
              See It In Action
            </h2>
            <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-accent/20">
              <iframe
                src={trip.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Included/Excluded */}
      {(trip.included?.length || trip.excluded?.length) && (
        <div className="py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black mb-16 text-center">
              What's Covered
            </h2>
            <div className="grid md:grid-cols-2 gap-12">
              {trip.included && trip.included.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-green-400">
                    <Check className="h-6 w-6" /> Included
                  </h3>
                  <ul className="space-y-4">
                    {trip.included.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-300">
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {trip.excluded && trip.excluded.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-red-400">
                    <X className="h-6 w-6" /> Not Included
                  </h3>
                  <ul className="space-y-4">
                    {trip.excluded.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-300">
                        <X className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Packages - Dark Cards */}
      <div id="book" className="py-24 px-4 bg-gradient-to-b from-gray-950 to-black scroll-mt-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-center">
            Reserve Your Spot
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Secure your adventure with a deposit. Final payment due by {new Date(trip.cutoffDate).toLocaleDateString()}.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trip.packages.map((pkg, idx) => (
              <div
                key={pkg._id}
                className={`relative bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl p-8 border ${
                  idx === 0 ? 'border-accent' : 'border-gray-800'
                }`}
              >
                {idx === 0 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-accent rounded-full text-sm font-bold">
                    Best Value
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{pkg.title}</h3>
                {pkg.description && (
                  <p className="text-gray-500 mb-6">{pkg.description}</p>
                )}
                <div className="mb-6">
                  <span className="text-5xl font-black text-accent">
                    ${(pkg.price / 100).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-8">
                  ${(pkg.depositAmount / 100).toLocaleString()} deposit • Rest due later
                </div>
                {pkg.inventory !== undefined && pkg.inventory !== null && (
                  <div className="text-sm text-accent font-medium mb-6">
                    Only {pkg.inventory} spots left
                  </div>
                )}
                <button
                  onClick={() => onSelectPackage(pkg._id)}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    idx === 0
                      ? 'bg-accent hover:bg-accent/90'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="py-16 px-4 text-center border-t border-gray-900">
        <p className="text-gray-500 mb-4">Questions? Reach out to us anytime.</p>
        <p className="text-2xl font-bold text-accent">hello@latitudego.com</p>
      </div>
    </div>
  );
}
