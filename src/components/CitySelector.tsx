import { useState } from "react";

const CITIES = [
  // Cities
  "Bay Village", "Beachwood", "Bedford", "Bedford Heights", "Berea",
  "Brecksville", "Broadview Heights", "Brook Park", "Brooklyn", "Cleveland",
  "Cleveland Heights", "East Cleveland", "Euclid", "Fairview Park", "Garfield Heights",
  "Highland Heights", "Independence", "Lakewood", "Lyndhurst", "Maple Heights",
  "Mayfield Heights", "Middleburg Heights", "North Olmsted", "North Royalton", "Olmsted Falls",
  "Parma", "Parma Heights", "Pepper Pike", "Richmond Heights", "Rocky River",
  "Seven Hills", "Shaker Heights", "Solon", "South Euclid", "Strongsville",
  "University Heights", "Warrensville Heights", "Westlake",
  // Villages
  "Bentleyville", "Bratenahl", "Brooklyn Heights", "Chagrin Falls", "Cuyahoga Heights",
  "Gates Mills", "Glenwillow", "Highland Hills", "Hunting Valley", "Linndale",
  "Mayfield", "Moreland Hills", "Newburgh Heights", "North Randall", "Oakwood",
  "Orange", "Valley View", "Walton Hills", "Woodmere",
  // Townships
  "Chagrin Falls Township", "Olmsted Township"
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
