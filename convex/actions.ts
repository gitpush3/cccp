"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// System prompt for the building codes and real estate assistant
const SYSTEM_PROMPT = `You are a friendly, expert real estate assistant for Cuyahoga County, Ohio. You help real estate agents, investors, brokers, lenders, fix-and-flippers, wholesalers, and contractors make smart decisions.

📅 TODAY'S DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

🎯 YOUR MISSION
Help users research properties, understand building codes, find motivated sellers, analyze deals, check compliance, and navigate the 59 municipalities in Cuyahoga County. Always cite your sources so users can verify and dig deeper.

💡 INVESTMENT STRATEGY AWARENESS
Ask users early about their strategy: "Are you looking to flip, BRRRR, wholesale, or buy-and-hold?" This affects which analysis tools to use.

🔧 YOUR TOOLS (Use these to get accurate data!)

🎯 DEAL FINDING (Use these for investment opportunities!)
- getHotLeads → THE BEST TOOL! Aggregates ALL distress signals (foreclosures, tax delinquent, violations) into ranked leads
- findDeals → Search for distressed properties matching criteria (tax delinquent, foreclosures)
- calculateDealScore → Get investment score (0-100) for any property with distress signals
- calculateARV → Get After Repair Value with repair estimates and max offer calculation
- getOwnerIntelligence → Analyze owner portfolio, motivation, and contact strategy
- getRentalAnalysis → DSCR, cap rate, cash-on-cash analysis for rentals/BRRRR

📊 PROPERTY RESEARCH
- searchParcelByAddress → Look up any property by address. Use this FIRST for property questions!
- getParcelById → Look up property by parcel ID/PIN number
- searchByOwner → Find all properties owned by a person or company
- getMostRecentSalesByCity → Get latest sales in a city, sorted by date
- getComparables → Find similar properties that sold recently for ARV estimates
- getInvestmentAnalysis → Get appreciation, price/sqft, tax abatement status
- getZipCodeStats → Market stats for a zip code (median prices, avg values)

⚠️ COMPLIANCE & CODE CHECKING (ALWAYS check before discussing purchase!)
- getComplianceRisk → Get compliance risk score, open violations, and estimated costs
- getCodeViolations → Get open and historical code violations for a property
- getPOSRequirements → Point of Sale inspection requirements by city (critical!)
- getPermitHistory → Building permits and unpermitted work detection
- verifyZoning → Check if intended use is allowed under current zoning
- generatePreInspectionChecklist → THE KILLER TOOL! Get complete inspection prep checklist with repair costs, 7-day game plan, and pro tips

📜 BUILDING CODES & REGULATIONS
- getRegulationsByMunicipality → Get all codes for a city (building, fire, zoning, permits)
- getRegulation → Get a specific code type for a city
- searchCodeContent → Search actual code text for specific requirements
- getCodeByMunicipality → Get all code content for a city
- getStateCodes → Ohio state codes (baseline when cities adopt state code)
- getCountyCodes → Cuyahoga County regulations
- compareRegulations → Compare a code type across multiple cities

🔍 SMART CODE SEARCH (NEW - Use these for better answers!)
- smartCodeSearch → THE BEST code search! Combines content + title search with scoring. Use for broad questions.
- getPermitRequirements → Get permit info for work types (roof, hvac, electrical, etc.) with costs and inspections
- compareCodes → Compare codes across multiple cities (great for investors comparing markets)
- answerCodeQuestion → Smart pattern matching for common questions (setbacks, permits, ADU, rental, etc.)
- getCodeSummary → Overview of all codes for a city with POS requirements and contact info

🏚️ DISTRESSED PROPERTIES (Great for deals!)
- getTaxDelinquentByCity → Properties with unpaid taxes (motivated sellers!)
- getHighValueDelinquent → Properties owing $5000+ in back taxes
- getSheriffSalesByCity → Foreclosure auctions in a city
- getUpcomingSheriffSales → All upcoming sheriff sales

📞 CONTACTS & SERVICES
- getBuildingDeptContact → Phone, address, website for a city's building department
- getServiceProviders → Find lenders, title companies, inspectors, etc.
- getFeaturedProviders → Recommended service providers including 3bids.io

🏘️ NEIGHBORHOOD DATA
- getSchoolsByZipCode → School ratings (affects property values!)
- getWalkScoreByZip → Walk, Transit, and Bike scores
- getCrimeStats → Crime statistics by zip code
- getDemographicsByZip → Income, home values, vacancy rates, etc.
- getNeighborhoodAnalysis → Full neighborhood report
- getFloodZoneByParcel → FEMA flood zone (affects insurance costs)

🏠 WHEN TO USE WHICH TOOL

Property Questions ("Tell me about 123 Main St")
→ Use searchParcelByAddress first, then getComparables for ARV

Most Recent Sales ("What's the latest sale in Lakewood?")
→ Use getMostRecentSalesByCity with the user's selected city

Code/Permit Questions ("Do I need a permit for a roof?")
→ Use getPermitRequirements first! It has built-in knowledge for 12 work types.
→ For general code questions, use answerCodeQuestion or smartCodeSearch

Code Comparison ("Which city is easier for investors?")
→ Use compareCodes to compare zoning, permits, or building codes across cities
→ Use getCodeSummary to see what codes are available for a specific city

Investment Analysis ("Is this a good deal?")
→ Use getInvestmentAnalysis + getComparables + getZipCodeStats

Finding Deals ("Show me motivated sellers")
→ Use getTaxDelinquentByCity or getHighValueDelinquent

Neighborhood Research ("Is this a good area?")
→ Use getNeighborhoodAnalysis + getSchoolsByZipCode + getCrimeStats

Inspector Coming ("I have an inspection next week")
→ Use generatePreInspectionChecklist → This gives a complete checklist with costs, 7-day prep schedule, and pro tips!

📋 LAND USE CODES (Quick Reference)
- 5100 = Single-family home (most common investment)
- 5200 = Duplex (great for house hacking)
- 5300 = Triplex, 5400 = Fourplex (max for residential financing)
- 5000 = Vacant residential land (development opportunity)
- 4010-4080 = Apartment buildings (commercial financing needed)
- 6411 = Land bank property (may be available at discount)
- 7121 = CRA Tax Abatement (big tax savings!)

🔗 IMPORTANT LINKS TO SHARE

Sheriff Sales & Foreclosures:
- Auction Calendar: https://cuyahoga.sheriffsaleauction.ohio.gov/index.cfm?zaction=USER&zmethod=CALENDAR
- Register to Bid: https://cuyahoga.sheriffsaleauction.ohio.gov/index.cfm?zaction=HOME&zmethod=START

Contractor Quotes:
- When users need renovation work, recommend: "Post your project at app.3bids.io to get up to 3 quotes from vetted local contractors."

📝 HOW TO RESPOND

Keep it conversational and helpful. Use plain text only, no markdown formatting like ### or **bold** or tables. You can use emojis to make responses friendly and scannable.

For property questions, organize your response like this:
1) Property Summary - address, owner, type, size
2) Valuation - assessed value, last sale price, price per sqft
3) Investment Insights - comps, appreciation, opportunities
4) Regulations - zoning, permits needed for this city
5) Next Steps - what the user should do next
6) Sources - cite where the data came from with links

For code/permit questions:
1) Quick Answer - yes/no with key details
2) What Applies Here - specific rules for this city
3) Ohio Baseline - state code if city adopts it
4) Next Steps - who to call, what to file
5) Sources - links to the actual code

Always cite your sources! Use format like:
- Source: Cuyahoga County Parcel Database
- Source: Cleveland Building Code - [URL]
- Source: Ohio Revised Code - [URL]

⚠️ CRITICAL RULES

1. ALWAYS use the user's selected jurisdiction. If they're in "Cleveland Heights" chat, search Cleveland Heights, not Cleveland!

2. For "most recent sale" questions, use getMostRecentSalesByCity with the correct city name.

3. NEVER make up addresses or data. Only report what the database returns.

4. If you can't find something, say so clearly and suggest contacting the municipality directly.

5. Keep responses concise (5-15 sentences) unless the user asks for more detail.

6. Always provide actionable next steps - phone numbers, websites, what to do next.

7. When discussing renovations or rehab projects, recommend 3bids.io for contractor quotes.`;

// Define function tools for the LLM to query regulations database
// Combined tools for regulations AND parcel data
const REGULATION_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  // ===== REGULATION TOOLS =====
  {
    type: "function",
    function: {
      name: "getRegulationsByMunicipality",
      description: "Get all building codes and regulations for a specific municipality in Cuyahoga County. Returns URLs and status for building code, fire code, zoning, permits, etc.",
      parameters: {
        type: "object",
        properties: {
          municipalityName: {
            type: "string",
            description: "The name of the municipality (e.g., 'Cleveland', 'Parma', 'Lakewood', 'Bay Village')",
          },
        },
        required: ["municipalityName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRegulation",
      description: "Get a specific type of regulation for a municipality",
      parameters: {
        type: "object",
        properties: {
          municipalityName: {
            type: "string",
            description: "The name of the municipality",
          },
          regulationType: {
            type: "string",
            enum: [
              "building_code",
              "residential_code",
              "fire_code",
              "mechanical_code",
              "plumbing_code",
              "electrical_code",
              "energy_code",
              "zoning_code",
              "permitting_information",
              "property_maintenance_code",
              "flood_plain_regulations",
              "demolition_regulations",
            ],
            description: "The type of regulation to retrieve",
          },
        },
        required: ["municipalityName", "regulationType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compareRegulations",
      description: "Compare a specific regulation type across multiple municipalities to see differences",
      parameters: {
        type: "object",
        properties: {
          municipalityNames: {
            type: "array",
            items: { type: "string" },
            description: "Array of municipality names to compare (e.g., ['Cleveland', 'Lakewood', 'Parma'])",
          },
          regulationType: {
            type: "string",
            description: "The type of regulation to compare",
          },
        },
        required: ["municipalityNames", "regulationType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStateCodes",
      description: "Get Ohio state-level building codes that apply when municipalities adopt state code",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCountyCodes",
      description: "Get Cuyahoga County-level regulations and codes",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  // ===== PARCEL DATA TOOLS =====
  {
    type: "function",
    function: {
      name: "searchParcelByAddress",
      description: "Search for a property by address in Cuyahoga County. Returns property details including ownership, sales history, tax assessments, and building characteristics. Use this for any property-related question.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address to search (e.g., '2500 Euclid Ave, Cleveland' or '15000 Detroit Ave')",
          },
          city: {
            type: "string",
            description: "Optional: City name to filter results (e.g., 'CLEVELAND', 'LAKEWOOD')",
          },
          zipCode: {
            type: "string",
            description: "Optional: 5-digit zip code to filter results",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getParcelById",
      description: "Get a property by its exact parcel ID/PIN number",
      parameters: {
        type: "object",
        properties: {
          parcelId: {
            type: "string",
            description: "The parcel ID or PIN (e.g., '10321081')",
          },
        },
        required: ["parcelId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getComparables",
      description: "Find comparable properties (comps) for a given address. Returns similar properties with recent sales for valuation analysis. Essential for ARV estimates.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Full property address to find comps for",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInvestmentAnalysis",
      description: "Get detailed investment analysis for a property including appreciation, price per sq ft, tax abatement status, and comparison to zip code averages.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Full property address",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMostRecentSalesByCity",
      description: "Get the most recent property sales in a city, sorted by sale date. Use this when users ask for 'most recent sale' or 'latest sale' in a specific city.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'CLEVELAND HEIGHTS', 'LAKEWOOD', 'PARMA')",
          },
          limit: {
            type: "number",
            description: "Number of recent sales to return (default 10)",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getZipCodeStats",
      description: "Get market statistics for a zip code including total parcels, median sale prices, average assessed values, and price per sq ft. Great for market analysis.",
      parameters: {
        type: "object",
        properties: {
          zipCode: {
            type: "string",
            description: "5-digit zip code (e.g., '44107')",
          },
        },
        required: ["zipCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchByOwner",
      description: "Search for all properties owned by a specific person or entity. Useful for finding investor portfolios or land bank properties.",
      parameters: {
        type: "object",
        properties: {
          ownerName: {
            type: "string",
            description: "Owner name to search (e.g., 'SMITH, JOHN' or 'LAND BANK')",
          },
          city: {
            type: "string",
            description: "Optional: City to filter results",
          },
        },
        required: ["ownerName"],
      },
    },
  },
  // ===== CODE CONTENT SEARCH TOOLS =====
  {
    type: "function",
    function: {
      name: "searchCodeContent",
      description: "Search actual building code text, zoning requirements, permit info, and investor guides. Returns detailed code excerpts with investor notes. Use this for specific code questions like 'what are the setback requirements' or 'do I need a permit for...'",
      parameters: {
        type: "object",
        properties: {
          searchText: {
            type: "string",
            description: "Text to search for in code content (e.g., 'setback requirements', 'smoke detectors', 'point of sale')",
          },
          municipality: {
            type: "string",
            description: "Optional: Municipality to filter (e.g., 'Cleveland', 'Lakewood', 'Ohio State')",
          },
          codeType: {
            type: "string",
            description: "Optional: Type of code to search (e.g., 'zoning', 'permits', 'building', 'fire', 'rental', 'investor-guide')",
          },
        },
        required: ["searchText"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCodeByMunicipality",
      description: "Get all code content for a specific municipality. Returns zoning, permits, building codes, and investor tips specific to that city.",
      parameters: {
        type: "object",
        properties: {
          municipality: {
            type: "string",
            description: "Municipality name (e.g., 'Cleveland', 'Parma', 'Lakewood', 'Euclid', 'Ohio State', 'Cuyahoga County')",
          },
          codeType: {
            type: "string",
            description: "Optional: Filter by code type (e.g., 'zoning', 'permits', 'building', 'fire', 'rental')",
          },
        },
        required: ["municipality"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInvestorGuides",
      description: "Get investor-specific guides including tax abatement programs, land bank properties, and investment strategies for Cuyahoga County.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  // ===== SMART CODE SEARCH TOOLS =====
  {
    type: "function",
    function: {
      name: "smartCodeSearch",
      description: "Smart search across all code content - combines content + title search with scoring. Returns best matches organized by code type. Use this for broad code questions.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query (e.g., 'setback requirements', 'smoke detectors', 'ADU regulations')",
          },
          municipality: {
            type: "string",
            description: "Optional: Filter by municipality (e.g., 'Cleveland', 'Lakewood')",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPermitRequirements",
      description: "Get permit requirements for specific work types. Returns permit type, typical cost, inspections needed, and municipality-specific info. Best for 'do I need a permit for...' questions.",
      parameters: {
        type: "object",
        properties: {
          workType: {
            type: "string",
            enum: ["roof", "hvac", "electrical", "plumbing", "fence", "deck", "addition", "renovation", "water heater", "window", "siding", "driveway"],
            description: "Type of work being done",
          },
          municipality: {
            type: "string",
            description: "City name (e.g., 'Cleveland', 'Lakewood', 'Parma')",
          },
        },
        required: ["workType", "municipality"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compareCodes",
      description: "Compare a specific code type across multiple municipalities. Great for investors deciding between cities.",
      parameters: {
        type: "object",
        properties: {
          codeType: {
            type: "string",
            description: "Type of code to compare (e.g., 'zoning', 'permits', 'building', 'rental')",
          },
          municipalities: {
            type: "array",
            items: { type: "string" },
            description: "Array of municipality names to compare (e.g., ['Cleveland', 'Lakewood', 'Parma'])",
          },
        },
        required: ["codeType", "municipalities"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "answerCodeQuestion",
      description: "Answer common investor code questions using smart pattern matching. Searches relevant code types based on question keywords.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The investor's question about codes/regulations",
          },
          municipality: {
            type: "string",
            description: "City name to search codes for",
          },
        },
        required: ["question", "municipality"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCodeSummary",
      description: "Get a summary of all codes available for a municipality. Shows code types, section counts, POS requirements, and contact info.",
      parameters: {
        type: "object",
        properties: {
          municipality: {
            type: "string",
            description: "City name (e.g., 'Cleveland', 'Lakewood')",
          },
        },
        required: ["municipality"],
      },
    },
  },
  // ===== CONTACT & SERVICE PROVIDER TOOLS =====
  {
    type: "function",
    function: {
      name: "getBuildingDeptContact",
      description: "Get building department contact information for a municipality including phone, address, website, and investor tips.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'Cleveland', 'Parma', 'Lakewood')",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getServiceProviders",
      description: "Get service providers for real estate investors including lenders, title companies, inspectors, property managers, and contractors.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["lender", "hard_money", "title_company", "contractor_platform", "property_manager", "inspector", "attorney", "accountant", "insurance", "other"],
            description: "Category of service provider to search for",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getFeaturedProviders",
      description: "Get featured/recommended service providers for real estate investors, including 3bids.io for contractor quotes.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  // ===== DISTRESSED PROPERTY TOOLS =====
  {
    type: "function",
    function: {
      name: "getTaxDelinquentByCity",
      description: "Get tax delinquent properties for a city. These are motivated sellers - perfect for Subject-To deals.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'CLEVELAND', 'PARMA')",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getHighValueDelinquent",
      description: "Get properties with high tax delinquency amounts - highly motivated sellers.",
      parameters: {
        type: "object",
        properties: {
          minAmount: {
            type: "number",
            description: "Minimum amount owed (default $5000)",
          },
        },
      },
    },
  },
  // ===== NEIGHBORHOOD QUALITY TOOLS =====
  {
    type: "function",
    function: {
      name: "getSchoolsByZipCode",
      description: "Get schools and their ratings for a zip code. School quality affects property values.",
      parameters: {
        type: "object",
        properties: {
          zipCode: {
            type: "string",
            description: "5-digit zip code",
          },
        },
        required: ["zipCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getWalkScoreByZip",
      description: "Get Walk Score, Transit Score, and Bike Score for a zip code.",
      parameters: {
        type: "object",
        properties: {
          zipCode: {
            type: "string",
            description: "5-digit zip code",
          },
        },
        required: ["zipCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCrimeStats",
      description: "Get crime statistics for a zip code including violent and property crime counts.",
      parameters: {
        type: "object",
        properties: {
          zipCode: {
            type: "string",
            description: "5-digit zip code",
          },
        },
        required: ["zipCode"],
      },
    },
  },
  // ===== DEMOGRAPHICS & MARKET TOOLS =====
  {
    type: "function",
    function: {
      name: "getDemographicsByZip",
      description: "Get census demographics for a zip code: income, home values, vacancy rates, etc.",
      parameters: {
        type: "object",
        properties: {
          zipCode: {
            type: "string",
            description: "5-digit zip code",
          },
        },
        required: ["zipCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getNeighborhoodAnalysis",
      description: "Get comprehensive neighborhood analysis combining demographics, schools, and walk scores.",
      parameters: {
        type: "object",
        properties: {
          zipCode: {
            type: "string",
            description: "5-digit zip code",
          },
        },
        required: ["zipCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getFloodZoneByParcel",
      description: "Get FEMA flood zone designation for a parcel. Important for insurance costs.",
      parameters: {
        type: "object",
        properties: {
          parcelId: {
            type: "string",
            description: "Parcel ID number",
          },
        },
        required: ["parcelId"],
      },
    },
  },
  // ===== DEAL FINDING TOOLS =====
  {
    type: "function",
    function: {
      name: "getHotLeads",
      description: "THE BEST deal-finding tool! Aggregates ALL distress signals (foreclosures, tax delinquent, code violations) into ranked hot leads with urgency scores and contact strategies.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "Filter by city name (optional)",
          },
          zipCode: {
            type: "string",
            description: "Filter by zip code (optional)",
          },
          maxPrice: {
            type: "number",
            description: "Maximum assessed value filter",
          },
          limit: {
            type: "number",
            description: "Number of leads to return (default 50)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "findDeals",
      description: "Search for investment deals matching specific criteria. Finds distressed properties (tax delinquent, foreclosures) and scores them for investment potential.",
      parameters: {
        type: "object",
        properties: {
          cities: {
            type: "array",
            items: { type: "string" },
            description: "Cities to search in (e.g., ['CLEVELAND', 'LAKEWOOD'])",
          },
          minScore: {
            type: "number",
            description: "Minimum deal score (0-100, default 50)",
          },
          maxArv: {
            type: "number",
            description: "Maximum ARV budget filter",
          },
          propertyTypes: {
            type: "array",
            items: { type: "string" },
            description: "Land use codes to filter (e.g., ['5100'] for SFR)",
          },
          distressTypes: {
            type: "array",
            items: { type: "string" },
            description: "Types of distress to find: 'tax_delinquent', 'foreclosure'",
          },
          limit: {
            type: "number",
            description: "Number of deals to return (default 25)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculateDealScore",
      description: "Calculate investment deal score (0-100) for a property. Analyzes equity spread, distress signals, owner motivation, market conditions, and compliance risk.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address to analyze",
          },
          strategy: {
            type: "string",
            enum: ["flip", "brrrr", "wholesale", "rental"],
            description: "Investment strategy (affects scoring weights)",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculateARV",
      description: "Calculate After Repair Value with repair estimates and max offer. Uses comparables and condition level to estimate repairs, ARV, and maximum offer using 70% rule.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address",
          },
          conditionLevel: {
            type: "string",
            enum: ["cosmetic", "moderate", "heavy", "gut"],
            description: "Rehab level needed (affects repair estimate)",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOwnerIntelligence",
      description: "Analyze property owner's portfolio, motivation level, and suggest contact strategy. Identifies out-of-state owners, portfolio investors, and distressed sellers.",
      parameters: {
        type: "object",
        properties: {
          ownerName: {
            type: "string",
            description: "Owner name to analyze",
          },
          parcelId: {
            type: "string",
            description: "Or parcel ID to look up owner",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRentalAnalysis",
      description: "Calculate rental investment metrics: DSCR, cap rate, cash-on-cash return, and BRRRR analysis. Essential for buy-and-hold investors.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address",
          },
          purchasePrice: {
            type: "number",
            description: "Expected purchase price",
          },
          rehabCost: {
            type: "number",
            description: "Estimated rehab cost",
          },
          downPaymentPercent: {
            type: "number",
            description: "Down payment percentage (default 25%)",
          },
          interestRate: {
            type: "number",
            description: "Mortgage interest rate (default 7.5%)",
          },
        },
        required: ["address"],
      },
    },
  },
  // ===== COMPLIANCE TOOLS =====
  {
    type: "function",
    function: {
      name: "getComplianceRisk",
      description: "Calculate compliance risk score for a property. Returns open violations, estimated compliance costs, unpermitted work indicators, and POS requirements.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCodeViolations",
      description: "Get code violations for a property including open violations, historical violations, and fines.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address",
          },
          city: {
            type: "string",
            description: "City name for filtering",
          },
          includeResolved: {
            type: "boolean",
            description: "Include resolved violations (default false)",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPOSRequirements",
      description: "Get Point of Sale inspection requirements for a city. Critical for closing - includes fees, common failures, and timeline.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'Cleveland Heights', 'Lakewood')",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPermitHistory",
      description: "Get building permit history and detect possible unpermitted work. Returns all permits and flags missing permits for expected work.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verifyZoning",
      description: "Verify if intended use is allowed under current zoning. Checks for variance requirements.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address",
          },
          intendedUse: {
            type: "string",
            enum: ["sfr", "duplex", "triplex", "fourplex", "airbnb", "commercial"],
            description: "Intended property use",
          },
        },
        required: ["address", "intendedUse"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generatePreInspectionChecklist",
      description: "Generate comprehensive pre-inspection checklist with repair costs and 7-day prep plan. BEST tool for users with upcoming inspections!",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address",
          },
          city: {
            type: "string",
            description: "City name (optional - will auto-detect from address)",
          },
          inspectionType: {
            type: "string",
            enum: ["pos", "rental_registration", "general"],
            description: "Type of inspection (default: pos for Point of Sale)",
          },
        },
        required: ["address"],
      },
    },
  },
  // ===== ADDITIONAL DISTRESSED PROPERTY TOOLS =====
  {
    type: "function",
    function: {
      name: "getSheriffSalesByCity",
      description: "Get sheriff sales (foreclosure auctions) for a city. Returns scheduled, sold, and cancelled sales.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name",
          },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getUpcomingSheriffSales",
      description: "Get all upcoming sheriff sales across Cuyahoga County.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const chatWithPro = action({
  args: {
    clerkId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    question: v.string(),
    jurisdiction: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args): Promise<{ response?: string; error?: string; message?: string; citedRegulations?: string[] }> => {
    if (!openai) {
      return {
        error: "service_unavailable",
        message: "AI service not configured",
      };
    }

    // Check message limits based on user status
    let messageLimits;
    if (args.clerkId) {
      messageLimits = await ctx.runQuery(api.queries.getUserMessageLimits, { 
        userId: args.clerkId 
      });
    } else if (args.sessionId) {
      messageLimits = await ctx.runQuery(api.queries.getUserMessageLimits, { 
        sessionId: args.sessionId 
      });
    } else {
      return {
        error: "invalid_request",
        message: "Either clerkId or sessionId must be provided",
      };
    }

    // Check if user has exceeded their message limit
    if (messageLimits.messagesLimit !== -1 && messageLimits.messagesUsed >= messageLimits.messagesLimit) {
      if (messageLimits.tier === "anonymous") {
        return {
          error: "signup_required",
          message: "You've used your 5 free messages. Sign up to get 5 more messages!",
        };
      } else if (messageLimits.tier === "authenticated") {
        return {
          error: "payment_required",
          message: "You've used your 5 authenticated messages. Upgrade to Pro for unlimited access!",
        };
      }
    }

    // Get regulations for the selected jurisdiction using RAG
    let regulationContext = "";
    const citedRegulations: string[] = [];

    // Fetch regulations for the selected jurisdiction
    const jurisdictionRegs = await ctx.runQuery(api.regulations.getRegulationsByMunicipality, {
      municipalityName: args.jurisdiction,
    });

    if (jurisdictionRegs) {
      regulationContext = `\n\nRegulations for ${args.jurisdiction}:\n`;
      for (const reg of jurisdictionRegs.regulations) {
        regulationContext += `- ${reg.type.replace(/_/g, " ").toUpperCase()}: ${reg.displayValue}\n`;
        if (reg.url) {
          regulationContext += `  URL: ${reg.url}\n`;
        }
      }
    }

    // Also get state codes for reference
    const stateCodes = await ctx.runQuery(api.regulations.getStateCodes, {});
    if (stateCodes) {
      regulationContext += `\n\nOhio State Codes (apply when municipality adopts state code):\n`;
      for (const reg of stateCodes.regulations) {
        if (reg.url) {
          regulationContext += `- ${reg.type.replace(/_/g, " ").toUpperCase()}: ${reg.url}\n`;
        }
      }
    }

    // Generate embedding for vector search (legacy support)
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: args.question,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Search municipal codes (legacy vector search)
    const muniCodes: any[] = await ctx.runQuery(api.search.searchMuniCodes, {
      embedding: questionEmbedding,
      jurisdiction: args.jurisdiction,
      limit: 5,
    });

    // Search architect lore
    const architectLore: any[] = await ctx.runQuery(api.search.searchArchitectLore, {
      embedding: questionEmbedding,
      limit: 3,
    });

    // Build combined context
    const context: string = [
      "=== REGULATION DATABASE ===",
      regulationContext,
      "\n=== MUNICIPAL CODE EXCERPTS ===",
      ...muniCodes.map((code: any) => `${code.category.toUpperCase()}: ${code.text}`),
      "\n=== VETERAN ARCHITECT TIPS ===",
      ...architectLore.map((lore: any) => `${lore.title}: ${lore.tip}`),
    ].join("\n");

    // Prepare messages for OpenAI with function calling
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}

🏙️ CURRENT SESSION
- Today: December 28, 2025
- User's City: ${args.jurisdiction}
- Remember: Search "${args.jurisdiction}" specifically when looking up properties or sales!

${context}`,
      },
      {
        role: "user",
        content: args.question,
      },
    ];

    // Call OpenAI with function calling for RAG
    let response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      tools: REGULATION_TOOLS,
      tool_choice: "auto",
      temperature: 0.4,
      max_tokens: 1200, // Increased for detailed property responses
    });

    let assistantMessage = response.choices[0].message;

    // Handle function calls (RAG retrieval)
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        // Type guard for function tool calls
        if (toolCall.type !== "function") continue;
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let functionResult;

        switch (functionName) {
          case "getRegulationsByMunicipality":
            functionResult = await ctx.runQuery(
              api.regulations.getRegulationsByMunicipality,
              functionArgs
            );
            break;
          case "getRegulation":
            functionResult = await ctx.runQuery(
              api.regulations.getRegulation,
              functionArgs
            );
            if (functionResult) {
              citedRegulations.push(functionResult._id);
            }
            break;
          case "compareRegulations":
            functionResult = await ctx.runQuery(
              api.regulations.compareRegulations,
              functionArgs
            );
            break;
          case "getStateCodes":
            functionResult = await ctx.runQuery(
              api.regulations.getStateCodes,
              {}
            );
            break;
          case "getCountyCodes":
            functionResult = await ctx.runQuery(
              api.regulations.getCountyCodes,
              {}
            );
            break;
          // ===== PARCEL DATA HANDLERS =====
          case "searchParcelByAddress":
            functionResult = await ctx.runQuery(
              api.parcels.searchByAddress,
              {
                address: functionArgs.address,
                city: functionArgs.city,
                zipCode: functionArgs.zipCode,
              }
            );
            break;
          case "getParcelById":
            functionResult = await ctx.runQuery(
              api.parcels.getByParcelId,
              { parcelId: functionArgs.parcelId }
            );
            break;
          case "getComparables":
            functionResult = await ctx.runQuery(
              api.parcels.getComparables,
              { address: functionArgs.address }
            );
            break;
          case "getInvestmentAnalysis":
            functionResult = await ctx.runQuery(
              api.parcels.getInvestmentAnalysis,
              { address: functionArgs.address }
            );
            break;
          case "getZipCodeStats":
            functionResult = await ctx.runQuery(
              api.parcels.getZipCodeStats,
              { zipCode: functionArgs.zipCode }
            );
            break;
          case "getMostRecentSalesByCity":
            functionResult = await ctx.runQuery(
              api.parcels.getMostRecentSalesByCity,
              { 
                city: functionArgs.city,
                limit: functionArgs.limit || 10
              }
            );
            break;
          case "searchByOwner":
            functionResult = await ctx.runQuery(
              api.parcels.searchByOwner,
              {
                ownerName: functionArgs.ownerName,
                city: functionArgs.city,
              }
            );
            break;
          // ===== CODE CONTENT HANDLERS =====
          case "searchCodeContent":
            functionResult = await ctx.runQuery(
              api.codeContent.searchContent,
              {
                searchText: functionArgs.searchText,
                municipality: functionArgs.municipality,
                codeType: functionArgs.codeType,
                limit: 5,
              }
            );
            break;
          case "getCodeByMunicipality":
            functionResult = await ctx.runQuery(
              api.codeContent.getByMunicipality,
              {
                municipality: functionArgs.municipality,
                codeType: functionArgs.codeType,
              }
            );
            break;
          case "getInvestorGuides":
            functionResult = await ctx.runQuery(
              api.codeContent.getInvestorGuides,
              {}
            );
            break;
          // ===== SMART CODE SEARCH HANDLERS =====
          case "smartCodeSearch":
            functionResult = await ctx.runQuery(
              api.codeContent.smartSearch,
              {
                query: functionArgs.query,
                municipality: functionArgs.municipality,
                limit: 10,
              }
            );
            break;
          case "getPermitRequirements":
            functionResult = await ctx.runQuery(
              api.codeContent.getPermitRequirements,
              {
                workType: functionArgs.workType,
                municipality: functionArgs.municipality,
              }
            );
            break;
          case "compareCodes":
            functionResult = await ctx.runQuery(
              api.codeContent.compareCodes,
              {
                codeType: functionArgs.codeType,
                municipalities: functionArgs.municipalities,
              }
            );
            break;
          case "answerCodeQuestion":
            functionResult = await ctx.runQuery(
              api.codeContent.answerCodeQuestion,
              {
                question: functionArgs.question,
                municipality: functionArgs.municipality,
              }
            );
            break;
          case "getCodeSummary":
            functionResult = await ctx.runQuery(
              api.codeContent.getCodeSummary,
              {
                municipality: functionArgs.municipality,
              }
            );
            break;
          // ===== CONTACT & SERVICE PROVIDER HANDLERS =====
          case "getBuildingDeptContact":
            functionResult = await ctx.runQuery(
              api.seedContacts.getBuildingDept,
              { city: functionArgs.city }
            );
            break;
          case "getServiceProviders":
            functionResult = await ctx.runQuery(
              api.seedContacts.getServiceProviders,
              { category: functionArgs.category }
            );
            break;
          case "getFeaturedProviders":
            functionResult = await ctx.runQuery(
              api.seedContacts.getFeaturedProviders,
              {}
            );
            break;
          // ===== DISTRESSED PROPERTY HANDLERS =====
          case "getTaxDelinquentByCity":
            functionResult = await ctx.runQuery(
              api.distressedData.getTaxDelinquentByCity,
              { city: functionArgs.city }
            );
            break;
          case "getHighValueDelinquent":
            functionResult = await ctx.runQuery(
              api.distressedData.getHighValueDelinquent,
              { minAmount: functionArgs.minAmount }
            );
            break;
          // ===== NEIGHBORHOOD QUALITY HANDLERS =====
          case "getSchoolsByZipCode":
            functionResult = await ctx.runQuery(
              api.neighborhoodData.getSchoolsByZipCode,
              { zipCode: functionArgs.zipCode }
            );
            break;
          case "getWalkScoreByZip":
            functionResult = await ctx.runQuery(
              api.neighborhoodData.getWalkScoreByZip,
              { zipCode: functionArgs.zipCode }
            );
            break;
          case "getCrimeStats":
            functionResult = await ctx.runQuery(
              api.neighborhoodData.getCrimeStats,
              { zipCode: functionArgs.zipCode }
            );
            break;
          // ===== DEMOGRAPHICS & MARKET HANDLERS =====
          case "getDemographicsByZip":
            functionResult = await ctx.runQuery(
              api.marketData.getDemographicsByZip,
              { zipCode: functionArgs.zipCode }
            );
            break;
          case "getNeighborhoodAnalysis":
            functionResult = await ctx.runQuery(
              api.marketData.getNeighborhoodAnalysis,
              { zipCode: functionArgs.zipCode }
            );
            break;
          case "getFloodZoneByParcel":
            functionResult = await ctx.runQuery(
              api.marketData.getFloodZoneByParcel,
              { parcelId: functionArgs.parcelId }
            );
            break;
          // ===== DEAL FINDING HANDLERS =====
          case "getHotLeads":
            functionResult = await ctx.runQuery(
              api.dealAnalysis.getHotLeads,
              {
                city: functionArgs.city,
                zipCode: functionArgs.zipCode,
                maxPrice: functionArgs.maxPrice,
                limit: functionArgs.limit,
              }
            );
            break;
          case "findDeals":
            functionResult = await ctx.runQuery(
              api.dealAnalysis.findDeals,
              {
                cities: functionArgs.cities,
                minScore: functionArgs.minScore,
                maxArv: functionArgs.maxArv,
                propertyTypes: functionArgs.propertyTypes,
                distressTypes: functionArgs.distressTypes,
                limit: functionArgs.limit,
              }
            );
            break;
          case "calculateDealScore":
            functionResult = await ctx.runQuery(
              api.dealAnalysis.calculateDealScore,
              {
                address: functionArgs.address,
                strategy: functionArgs.strategy,
              }
            );
            break;
          case "calculateARV":
            functionResult = await ctx.runQuery(
              api.dealAnalysis.calculateARV,
              {
                address: functionArgs.address,
                conditionLevel: functionArgs.conditionLevel,
              }
            );
            break;
          case "getOwnerIntelligence":
            functionResult = await ctx.runQuery(
              api.dealAnalysis.getOwnerIntelligence,
              {
                ownerName: functionArgs.ownerName,
                parcelId: functionArgs.parcelId,
              }
            );
            break;
          case "getRentalAnalysis":
            functionResult = await ctx.runQuery(
              api.dealAnalysis.getRentalAnalysis,
              {
                address: functionArgs.address,
                purchasePrice: functionArgs.purchasePrice,
                rehabCost: functionArgs.rehabCost,
                downPaymentPercent: functionArgs.downPaymentPercent,
                interestRate: functionArgs.interestRate,
              }
            );
            break;
          // ===== COMPLIANCE HANDLERS =====
          case "getComplianceRisk":
            functionResult = await ctx.runQuery(
              api.complianceTools.getComplianceRisk,
              { address: functionArgs.address }
            );
            break;
          case "getCodeViolations":
            functionResult = await ctx.runQuery(
              api.complianceTools.getViolationsByAddress,
              {
                address: functionArgs.address,
                city: functionArgs.city,
                includeResolved: functionArgs.includeResolved,
              }
            );
            break;
          case "getPOSRequirements":
            functionResult = await ctx.runQuery(
              api.complianceTools.getPOSRequirements,
              { city: functionArgs.city }
            );
            break;
          case "getPermitHistory":
            functionResult = await ctx.runQuery(
              api.complianceTools.getPermitHistory,
              { address: functionArgs.address }
            );
            break;
          case "verifyZoning":
            functionResult = await ctx.runQuery(
              api.complianceTools.verifyZoning,
              {
                address: functionArgs.address,
                intendedUse: functionArgs.intendedUse,
              }
            );
            break;
          case "generatePreInspectionChecklist":
            functionResult = await ctx.runQuery(
              api.complianceTools.generatePreInspectionChecklist,
              {
                address: functionArgs.address,
                city: functionArgs.city,
                inspectionType: functionArgs.inspectionType,
              }
            );
            break;
          // ===== SHERIFF SALES HANDLERS =====
          case "getSheriffSalesByCity":
            functionResult = await ctx.runQuery(
              api.distressedData.getSheriffSalesByCity,
              { city: functionArgs.city }
            );
            break;
          case "getUpcomingSheriffSales":
            functionResult = await ctx.runQuery(
              api.distressedData.getUpcomingSheriffSales,
              {}
            );
            break;
          default:
            functionResult = { error: "Unknown function" };
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult),
        });
      }

      // Get next response from OpenAI
      response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        tools: REGULATION_TOOLS,
        tool_choice: "auto",
        temperature: 0.4,
        max_tokens: 1200, // Increased for detailed property responses
      });

      assistantMessage = response.choices[0].message;
    }

    const responseText: string = assistantMessage.content || "I couldn't generate a response.";

    // Save assistant response to chat history
    await ctx.runMutation(api.messages.addMessage, {
      chatId: args.chatId,
      userId: args.clerkId,
      sessionId: args.sessionId,
      role: "assistant",
      content: responseText,
      isAnonymous: !args.clerkId,
    });

    return { response: responseText, citedRegulations };
  },
});

export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    if (!openai) {
      throw new Error("OpenAI not configured");
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: args.text,
    });

    return response.data[0].embedding;
  },
});
