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
        placeholder="Search cities..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      <div className="max-h-96 overflow-y-auto space-y-1">
        {filteredCities.map((city) => (
          <button
            key={city}
            onClick={() => onCitySelect(city)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              selectedCity === city
                ? "bg-blue-100 text-blue-700 font-medium"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            {city}
          </button>
        ))}
      </div>
      
      {filteredCities.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No cities found matching "{searchTerm}"
        </p>
      )}
    </div>
  );
}
