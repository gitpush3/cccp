import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Census Bureau API integration for demographics data
// API Documentation: https://www.census.gov/data/developers/data-sets.html
// No API key required for basic access (limited to 500 requests/day without key)

const CENSUS_API_BASE = "https://api.census.gov/data";
const ACS_YEAR = "2022"; // American Community Survey 5-year estimates
const ACS_DATASET = "acs/acs5";

// Cuyahoga County FIPS: 39035 (State 39 = Ohio, County 035 = Cuyahoga)
const STATE_FIPS = "39";
const COUNTY_FIPS = "035";

// All Cuyahoga County zip codes
const CUYAHOGA_ZIP_CODES = [
  "44101", "44102", "44103", "44104", "44105", "44106", "44107", "44108",
  "44109", "44110", "44111", "44112", "44113", "44114", "44115", "44116",
  "44117", "44118", "44119", "44120", "44121", "44122", "44123", "44124",
  "44125", "44126", "44127", "44128", "44129", "44130", "44131", "44132",
  "44133", "44134", "44135", "44136", "44137", "44138", "44139", "44140",
  "44141", "44142", "44143", "44144", "44145", "44146", "44147", "44149",
];

// Census variable codes for ACS 5-year estimates
const CENSUS_VARIABLES = {
  // Population
  totalPopulation: "B01003_001E",
  
  // Age
  medianAge: "B01002_001E",
  
  // Income
  medianHouseholdIncome: "B19013_001E",
  
  // Housing
  totalHousingUnits: "B25001_001E",
  occupiedHousingUnits: "B25002_002E",
  vacantHousingUnits: "B25002_003E",
  ownerOccupied: "B25003_002E",
  renterOccupied: "B25003_003E",
  medianHomeValue: "B25077_001E",
  medianRent: "B25064_001E",
  
  // Education (Bachelor's degree or higher, age 25+)
  totalPop25Plus: "B15003_001E",
  bachelorsDegree: "B15003_022E",
  mastersDegree: "B15003_023E",
  professionalDegree: "B15003_024E",
  doctorateDegree: "B15003_025E",
  
  // Poverty
  totalForPovertyCalc: "B17001_001E",
  belowPovertyLevel: "B17001_002E",
  
  // Employment (civilian labor force 16+)
  laborForce: "B23025_002E",
  employed: "B23025_004E",
  unemployed: "B23025_005E",
};

interface DemographicsData {
  zipCode: string;
  city?: string;
  population?: number;
  medianHouseholdIncome?: number;
  medianAge?: number;
  ownerOccupiedPercent?: number;
  renterOccupiedPercent?: number;
  vacancyRate?: number;
  medianHomeValue?: number;
  medianRent?: number;
  povertyRate?: number;
  unemploymentRate?: number;
  collegeEducatedPercent?: number;
  dataYear: number;
}

// Internal mutation to save demographics to database
export const saveDemographics = internalMutation({
  args: {
    demographics: v.array(v.object({
      zipCode: v.string(),
      city: v.optional(v.string()),
      population: v.optional(v.number()),
      medianHouseholdIncome: v.optional(v.number()),
      medianAge: v.optional(v.number()),
      ownerOccupiedPercent: v.optional(v.number()),
      renterOccupiedPercent: v.optional(v.number()),
      vacancyRate: v.optional(v.number()),
      medianHomeValue: v.optional(v.number()),
      medianRent: v.optional(v.number()),
      povertyRate: v.optional(v.number()),
      unemploymentRate: v.optional(v.number()),
      collegeEducatedPercent: v.optional(v.number()),
      dataYear: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const demo of args.demographics) {
      const existing = await ctx.db
        .query("demographics")
        .withIndex("by_zip_code", (q) => q.eq("zipCode", demo.zipCode))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...demo,
          lastUpdated: Date.now(),
        });
        updated++;
      } else {
        await ctx.db.insert("demographics", {
          ...demo,
          lastUpdated: Date.now(),
        });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

// Fetch demographics for a batch of zip codes
export const fetchCensusDemographics = internalAction({
  args: {
    zipCodes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; count?: number }> => {
    const zipCodes = args.zipCodes || CUYAHOGA_ZIP_CODES;
    
    try {
      // Build the variable list for the API call
      const variableList = Object.values(CENSUS_VARIABLES).join(",");
      
      // Census API - query ZCTA (Zip Code Tabulation Area) directly
      // ZCTA doesn't require state filter in ACS 5-year
      const url = `${CENSUS_API_BASE}/${ACS_YEAR}/${ACS_DATASET}?get=NAME,${variableList}&for=zip%20code%20tabulation%20area:${zipCodes.join(",")}`;
      
      console.log("Fetching Census data from:", url);
      
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Census API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length < 2) {
        return {
          success: false,
          message: "Invalid response from Census API",
        };
      }

      // First row is headers, rest is data
      const headers = data[0] as string[];
      const rows = data.slice(1) as string[][];
      
      // Create a map of variable name to column index
      const varIndex: Record<string, number> = {};
      headers.forEach((header, index) => {
        varIndex[header] = index;
      });

      // Parse the data
      const demographics: DemographicsData[] = [];
      
      for (const row of rows) {
        // Get the zip code (ZCTA)
        const zipCode = row[varIndex["zip code tabulation area"]] || row[row.length - 1];
        
        // Only process Cuyahoga County zip codes
        if (!zipCodes.includes(zipCode)) continue;
        
        const getValue = (varCode: string): number | undefined => {
          const idx = varIndex[varCode];
          if (idx === undefined) return undefined;
          const val = parseFloat(row[idx]);
          return isNaN(val) || val < 0 ? undefined : val;
        };
        
        const population = getValue(CENSUS_VARIABLES.totalPopulation);
        const totalHousing = getValue(CENSUS_VARIABLES.totalHousingUnits);
        const occupied = getValue(CENSUS_VARIABLES.occupiedHousingUnits);
        const vacant = getValue(CENSUS_VARIABLES.vacantHousingUnits);
        const ownerOcc = getValue(CENSUS_VARIABLES.ownerOccupied);
        const renterOcc = getValue(CENSUS_VARIABLES.renterOccupied);
        const totalPop25 = getValue(CENSUS_VARIABLES.totalPop25Plus);
        const bachelors = getValue(CENSUS_VARIABLES.bachelorsDegree);
        const masters = getValue(CENSUS_VARIABLES.mastersDegree);
        const professional = getValue(CENSUS_VARIABLES.professionalDegree);
        const doctorate = getValue(CENSUS_VARIABLES.doctorateDegree);
        const povertyTotal = getValue(CENSUS_VARIABLES.totalForPovertyCalc);
        const belowPoverty = getValue(CENSUS_VARIABLES.belowPovertyLevel);
        const laborForce = getValue(CENSUS_VARIABLES.laborForce);
        const unemployed = getValue(CENSUS_VARIABLES.unemployed);
        
        // Calculate percentages
        const ownerOccupiedPercent = occupied && ownerOcc 
          ? Math.round((ownerOcc / occupied) * 100) 
          : undefined;
        const renterOccupiedPercent = occupied && renterOcc 
          ? Math.round((renterOcc / occupied) * 100) 
          : undefined;
        const vacancyRate = totalHousing && vacant 
          ? Math.round((vacant / totalHousing) * 100) 
          : undefined;
        
        // College educated = bachelor's or higher
        const collegeTotal = (bachelors || 0) + (masters || 0) + (professional || 0) + (doctorate || 0);
        const collegeEducatedPercent = totalPop25 && collegeTotal 
          ? Math.round((collegeTotal / totalPop25) * 100) 
          : undefined;
        
        const povertyRate = povertyTotal && belowPoverty 
          ? Math.round((belowPoverty / povertyTotal) * 100) 
          : undefined;
        
        const unemploymentRate = laborForce && unemployed 
          ? Math.round((unemployed / laborForce) * 100) 
          : undefined;
        
        demographics.push({
          zipCode,
          city: getZipCity(zipCode),
          population,
          medianHouseholdIncome: getValue(CENSUS_VARIABLES.medianHouseholdIncome),
          medianAge: getValue(CENSUS_VARIABLES.medianAge),
          ownerOccupiedPercent,
          renterOccupiedPercent,
          vacancyRate,
          medianHomeValue: getValue(CENSUS_VARIABLES.medianHomeValue),
          medianRent: getValue(CENSUS_VARIABLES.medianRent),
          povertyRate,
          unemploymentRate,
          collegeEducatedPercent,
          dataYear: parseInt(ACS_YEAR),
        });
      }

      if (demographics.length === 0) {
        return {
          success: false,
          message: "No matching zip codes found in Census data",
        };
      }

      // Save to database
      const result = await ctx.runMutation(internal.censusData.saveDemographics, {
        demographics,
      });

      return {
        success: true,
        message: `Fetched demographics for ${demographics.length} zip codes. Inserted: ${result.inserted}, Updated: ${result.updated}`,
        count: demographics.length,
      };

    } catch (error) {
      return {
        success: false,
        message: `Census API error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Map zip codes to primary city names
function getZipCity(zipCode: string): string | undefined {
  const zipCityMap: Record<string, string> = {
    "44101": "CLEVELAND",
    "44102": "CLEVELAND",
    "44103": "CLEVELAND",
    "44104": "CLEVELAND",
    "44105": "CLEVELAND",
    "44106": "CLEVELAND",
    "44107": "LAKEWOOD",
    "44108": "CLEVELAND",
    "44109": "CLEVELAND",
    "44110": "CLEVELAND",
    "44111": "CLEVELAND",
    "44112": "CLEVELAND",
    "44113": "CLEVELAND",
    "44114": "CLEVELAND",
    "44115": "CLEVELAND",
    "44116": "ROCKY RIVER",
    "44117": "EUCLID",
    "44118": "CLEVELAND HEIGHTS",
    "44119": "CLEVELAND",
    "44120": "SHAKER HEIGHTS",
    "44121": "SOUTH EUCLID",
    "44122": "BEACHWOOD",
    "44123": "EUCLID",
    "44124": "LYNDHURST",
    "44125": "GARFIELD HEIGHTS",
    "44126": "FAIRVIEW PARK",
    "44127": "CLEVELAND",
    "44128": "CLEVELAND",
    "44129": "PARMA",
    "44130": "PARMA",
    "44131": "INDEPENDENCE",
    "44132": "EUCLID",
    "44133": "NORTH ROYALTON",
    "44134": "PARMA",
    "44135": "CLEVELAND",
    "44136": "STRONGSVILLE",
    "44137": "MAPLE HEIGHTS",
    "44138": "OLMSTED FALLS",
    "44139": "SOLON",
    "44140": "BAY VILLAGE",
    "44141": "BRECKSVILLE",
    "44142": "BROOK PARK",
    "44143": "RICHMOND HEIGHTS",
    "44144": "BROOKLYN",
    "44145": "WESTLAKE",
    "44146": "BEDFORD",
    "44147": "BROADVIEW HEIGHTS",
    "44149": "STRONGSVILLE",
  };
  
  return zipCityMap[zipCode];
}

// Manual trigger for testing
export const triggerCensusFetch = action({
  args: {
    zipCodes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; count?: number }> => {
    return await ctx.runAction(internal.censusData.fetchCensusDemographics, {
      zipCodes: args.zipCodes,
    });
  },
});

// Fetch demographics for all Cuyahoga County zip codes
export const fetchAllCuyahogaDemographics = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message: string; count?: number }> => {
    return await ctx.runAction(internal.censusData.fetchCensusDemographics, {
      zipCodes: CUYAHOGA_ZIP_CODES,
    });
  },
});
