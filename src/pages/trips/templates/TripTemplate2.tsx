import { Calendar, MapPin, Users, Check, X, Clock, ChevronRight, Play } from "lucide-react";

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

interface TripTemplate2Props {
  trip: TripData;
  onSelectPackage: (packageId: string) => void;
}

export default function TripTemplate2({ trip, onSelectPackage }: TripTemplate2Props) {
  const lowestPrice = trip.packages.length > 0 
    ? Math.min(...trip.packages.map(p => p.price)) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark">
      {/* Split Hero - Image Left, Content Right */}
      <div className="grid lg:grid-cols-2 min-h-[80vh]">
        {/* Image Side */}
        <div className="relative h-[50vh] lg:h-auto">
          {trip.heroImageUrl ? (
            <img
              src={trip.heroImageUrl}
              alt={trip.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-accent to-primary" />
          )}
          {trip.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
                <Play className="h-8 w-8 text-primary ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Content Side */}
        <div className="flex flex-col justify-center p-8 lg:p-16 bg-white dark:bg-dark-surface">
          {trip.destination && (
            <div className="flex items-center gap-2 text-accent mb-4">
              <MapPin className="h-5 w-5" />
              <span className="font-medium uppercase tracking-wider text-sm">{trip.destination}</span>
            </div>
          )}
          
          <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-6">
            {trip.title}
          </h1>
          
          {trip.heroTagline && (
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              {trip.heroTagline}
            </p>
          )}

          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark rounded-full">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark rounded-full">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Book by {new Date(trip.cutoffDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          {lowestPrice > 0 && (
            <div className="mb-8">
              <span className="text-sm text-gray-500">Starting from</span>
              <div className="text-4xl font-black text-primary dark:text-accent">
                ${(lowestPrice / 100).toLocaleString()}
              </div>
            </div>
          )}

          <a
            href="#packages"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-lg transition-colors w-fit"
          >
            View Packages <ChevronRight className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Description with Side Image */}
        {trip.description && (
          <div className="grid lg:grid-cols-2 gap-12 mb-20 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                About This Trip
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {trip.description}
              </p>
              {trip.longDescription && (
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
                  {trip.longDescription}
                </p>
              )}
            </div>
            {trip.galleryImages && trip.galleryImages[0] && (
              <div className="relative">
                <img
                  src={trip.galleryImages[0]}
                  alt={trip.title}
                  className="rounded-2xl shadow-xl"
                />
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-accent rounded-xl -z-10" />
              </div>
            )}
          </div>
        )}

        {/* Highlights as Cards */}
        {trip.highlights && trip.highlights.length > 0 && (
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              What Makes This Trip Special
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trip.highlights.slice(0, 8).map((highlight, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 text-center"
                >
                  <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-accent">{idx + 1}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">{highlight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Itinerary */}
        {trip.itinerary && trip.itinerary.length > 0 && (
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Your Journey
            </h2>
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-primary hidden md:block" />
              
              <div className="space-y-8">
                {trip.itinerary.map((day, idx) => (
                  <div key={idx} className="flex gap-8">
                    {/* Day Circle */}
                    <div className="hidden md:flex w-16 h-16 bg-primary text-white rounded-full items-center justify-center flex-shrink-0 z-10 shadow-lg">
                      <div className="text-center">
                        <div className="text-[10px] uppercase">Day</div>
                        <div className="text-xl font-bold">{day.day}</div>
                      </div>
                    </div>
                    
                    {/* Content Card */}
                    <div className="flex-1 bg-white dark:bg-dark-surface rounded-2xl shadow-lg overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        {day.imageUrl && (
                          <img
                            src={day.imageUrl}
                            alt={day.title}
                            className="w-full md:w-48 h-48 md:h-auto object-cover"
                          />
                        )}
                        <div className="p-6 flex-1">
                          <div className="md:hidden text-sm text-accent font-bold mb-2">Day {day.day}</div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {day.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">{day.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Included/Excluded Side by Side */}
        {(trip.included?.length || trip.excluded?.length) && (
          <div className="mb-20">
            <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-xl overflow-hidden">
              <div className="grid md:grid-cols-2">
                {trip.included && trip.included.length > 0 && (
                  <div className="p-8 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                      Included
                    </h3>
                    <ul className="space-y-4">
                      {trip.included.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trip.excluded && trip.excluded.length > 0 && (
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="h-5 w-5 text-white" />
                      </div>
                      Not Included
                    </h3>
                    <ul className="space-y-4">
                      {trip.excluded.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                          <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
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

        {/* Packages */}
        <div id="packages" className="mb-20 scroll-mt-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Select Your Experience
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trip.packages.map((pkg, idx) => (
              <div
                key={pkg._id}
                className={`relative bg-white dark:bg-dark-surface rounded-3xl shadow-xl overflow-hidden ${
                  idx === 1 ? 'ring-4 ring-accent' : ''
                }`}
              >
                {idx === 1 && (
                  <div className="absolute top-0 left-0 right-0 bg-accent text-white text-center py-2 text-sm font-bold">
                    Most Popular
                  </div>
                )}
                <div className={`p-8 ${idx === 1 ? 'pt-12' : ''}`}>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {pkg.title}
                  </h3>
                  {pkg.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {pkg.description}
                    </p>
                  )}
                  <div className="mb-6">
                    <span className="text-4xl font-black text-primary dark:text-accent">
                      ${(pkg.price / 100).toLocaleString()}
                    </span>
                    <span className="text-gray-500 ml-2">/ person</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                    Only ${(pkg.depositAmount / 100).toLocaleString()} deposit to reserve
                  </div>
                  {pkg.inventory !== undefined && pkg.inventory !== null && pkg.inventory < 10 && (
                    <div className="text-sm text-accent font-bold mb-4">
                      ⚡ Only {pkg.inventory} spots remaining
                    </div>
                  )}
                  <button
                    onClick={() => onSelectPackage(pkg._id)}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
                      idx === 1
                        ? 'bg-accent hover:bg-accent/90 text-white'
                        : 'bg-primary hover:bg-primary-hover text-white'
                    }`}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        {trip.galleryImages && trip.galleryImages.length > 1 && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Capture the Moments
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trip.galleryImages.slice(1).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${trip.title} gallery ${idx + 2}`}
                  className={`rounded-2xl object-cover hover:opacity-90 transition-opacity cursor-pointer ${
                    idx === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
