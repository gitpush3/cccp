import { useState } from "react";

const CITIES = [
  "Los Angeles", "San Francisco", "San Diego", "Sacramento", "Oakland",
  "New York", "Brooklyn", "Queens", "Manhattan", "Bronx",
  "Chicago", "Aurora", "Rockford", "Joliet", "Naperville",
  "Houston", "San Antonio", "Dallas", "Austin", "Fort Worth",
  "Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale",
  "Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading",
  "Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg",
  "Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron",
  "Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem",
  "Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel",
  "Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue",
  "Denver", "Colorado Springs", "Fort Collins", "Lakewood",
  "Boston", "Worcester", "Springfield", "Lowell", "Cambridge"
];

interface CitySelectorProps {
  selectedCity: string;
  onCitySelect: (city: string) => void;
}

export function CitySelector({ selectedCity, onCitySelect }: CitySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCities = CITIES.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <input
        type="text"
        id="city-search"
        placeholder="Search territories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
      />
      
      <div className="max-h-96 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {filteredCities.map((city) => (
          <button
            key={city}
            onClick={() => onCitySelect(city)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              selectedCity === city
                ? "bg-primary/10 text-primary font-bold dark:text-red-400"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            {city}
          </button>
        ))}
      </div>
      
      {filteredCities.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No territories found matching "{searchTerm}"
        </p>
      )}
    </div>
  );
}
