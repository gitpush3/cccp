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
    <div className="space-y-3">
      <input
        type="text"
        id="city-search"
        placeholder="Search territories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2.5 rounded-full border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent backdrop-blur-sm transition-all"
      />
      
      <div className="max-h-[60vh] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2">
        {filteredCities.map((city) => (
          <button
            key={city}
            onClick={() => onCitySelect(city)}
            className={`w-full text-left px-4 py-2.5 rounded-full text-sm transition-all ${
              selectedCity === city
                ? "bg-white text-primary font-bold shadow-glow"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {city}
          </button>
        ))}
      </div>
      
      {filteredCities.length === 0 && (
        <p className="text-sm text-white/50 text-center py-4 italic">
          No territories found matching "{searchTerm}"
        </p>
      )}
    </div>
  );
}
