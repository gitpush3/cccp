import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";

export default function TripsListPage() {
  const trips = useQuery(api.trips.listPublishedTrips);

  if (trips === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading trips...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-primary dark:text-white mb-4">
            Upcoming Adventures
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experience travel and exploration in a whole new light. Choose your next getaway below.
          </p>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400">No trips available at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trips.map((trip) => (
              <Link
                key={trip._id}
                to={`/trips/${trip.slug}`}
                className="group bg-white dark:bg-dark-surface rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800"
              >
                {/* Trip Image */}
                <div className="aspect-[16/10] bg-gradient-to-br from-primary to-accent relative overflow-hidden">
                  {trip.imageUrl ? (
                    <img
                      src={trip.imageUrl}
                      alt={trip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-16 w-16 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-xl font-bold text-white mb-1">{trip.title}</h2>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(trip.startDate).toLocaleDateString()}</span>
                    </div>
                    {trip.packages && trip.packages.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{trip.packages.length} package{trip.packages.length > 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>

                  {trip.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4">
                      {trip.description}
                    </p>
                  )}

                  {trip.packages && trip.packages.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Starting at</span>
                      <span className="text-xl font-bold text-primary dark:text-accent">
                        ${(Math.min(...trip.packages.map(p => p.price)) / 100).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
