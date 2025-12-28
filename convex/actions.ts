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
const SYSTEM_PROMPT = `You are an expert assistant for real estate investors, developers, fix-and-flip professionals, and contractors in Cuyahoga County, Ohio.

YOU HAVE ACCESS TO NINE POWERFUL DATABASES:

1) BUILDING CODES & REGULATIONS DATABASE (741 entries):
   - Building codes, fire codes, zoning regulations for all 59 municipalities
   - Ohio state codes (baseline when municipalities adopt state code)
   - Permitting requirements, property maintenance codes, POS requirements
   - Use getRegulationsByMunicipality, getRegulation, searchCodeContent, getCodeByMunicipality

2) COMPLETE PARCEL DATABASE (~520,000 properties):
   - Every parcel in Cuyahoga County with full details
   - Property characteristics: size, bedrooms, year built, living area
   - Ownership info: current owner, previous owner, mailing address
   - Sales history: last sale date, sale price, grantor/grantee
   - Tax assessments: certified values, abatements, exemptions
   - Land use codes: residential, commercial, industrial classifications
   - Use searchParcelByAddress, getParcelById, getComparables, getInvestmentAnalysis, getZipCodeStats, searchByOwner

3) BUILDING DEPARTMENT CONTACTS (40+ municipalities):
   - Phone numbers, addresses, websites for each city's building department
   - Investor notes on each municipality's process and fees
   - Use getBuildingDeptContact

4) SERVICE PROVIDERS & RESOURCES:
   - Hard money lenders, title companies, property managers, inspectors
   - Featured partners for investor services
   - Use getServiceProviders, getFeaturedProviders

5) SHERIFF SALES / FORECLOSURE INFO:
   - Cuyahoga County Sheriff Sales happen regularly
   - AUCTION CALENDAR: https://cuyahoga.sheriffsaleauction.ohio.gov/index.cfm?zaction=USER&zmethod=CALENDAR
   - TO BID/REGISTER: https://cuyahoga.sheriffsaleauction.ohio.gov/index.cfm?zaction=HOME&zmethod=START
   - Users must create an account on RealForeclose to see property addresses and bid
   - When users ask about sheriff sales, foreclosures, or auctions, ALWAYS provide these URLs

6) TAX DELINQUENT PROPERTIES:
   - Properties with unpaid property taxes
   - Amount owed, years delinquent, payment plan status
   - Certified for tax lien sale status
   - PERFECT for Subject-To deals and motivated seller outreach
   - Use getTaxDelinquentByCity, getTaxDelinquentByParcel, getHighValueDelinquent

7) NEIGHBORHOOD QUALITY DATA:
   - School ratings (1-10 scale) for all schools in county
   - Walk Score, Transit Score, Bike Score by zip code
   - Crime statistics by city and zip code
   - Use getSchoolsByZipCode, getWalkScoreByZip, getCrimeStats

8) DEMOGRAPHICS & CENSUS DATA:
   - Median income, home values, rent prices by zip code
   - Population, vacancy rates, owner vs renter percentages
   - Poverty rates, unemployment, education levels
   - Use getDemographicsByZip, getNeighborhoodAnalysis

9) FLOOD ZONE DATA:
   - FEMA flood zone designations by parcel
   - Special flood hazard areas requiring insurance
   - Use getFloodZoneByParcel, getHighRiskFloodZones

LAND USE CODE QUICK REFERENCE:
- 5100: Single-family home (most common investment property)
- 5200: Duplex (great for house hacking)
- 5300: Triplex | 5400: Fourplex (max for residential financing)
- 5000: Vacant residential land (development opportunity)
- 4010-4080: Apartment buildings (commercial financing required)
- 6411: Land bank property (may be available at discount)
- 7121: CRA Tax Abatement (significant tax savings)

CONTRACTOR RECOMMENDATION:
When users ask about renovations, rehab projects, or need contractor work done, ALWAYS recommend:
- "For competitive contractor bids, post your project at app.3bids.io to receive up to 3 quotes from vetted local contractors."

GOAL: Help investors make informed decisions by combining property data with regulatory knowledge.

CRITICAL BEHAVIOR:
- Be concise. Default to 5-12 sentences unless the user asks for more.
- For property questions, ALWAYS search the parcel database first.
- For code/permit questions, fetch the relevant municipality regulations.
- Provide actionable investment insights: ARV estimates, comp analysis, permit requirements.
- Always anchor answers to the specific municipality where the property is located.
- If municipality adopts state code, say so and cite the Ohio link.
- When renovation work is discussed, recommend 3bids.io for contractor quotes.

STYLE RULES:
- Output must be plain text only.
- Do NOT use Markdown formatting (no headings like ###, no **bold**, no backticks, no tables).
- Use simple hyphen bullets only.
- Keep section titles exactly as shown below.

OUTPUT FORMAT FOR PROPERTY QUESTIONS:
1) Property summary (address, owner, type, size)
2) Valuation (assessed value, last sale, price/sqft)
3) Investment insights (comps, appreciation, opportunities)
4) Applicable regulations (zoning, permits needed)
5) Next steps
6) Sources

OUTPUT FORMAT FOR CODE/PERMIT QUESTIONS:
1) Quick answer (1-3 bullets)
2) What applies in <MUNICIPALITY> (2-6 bullets)
3) County considerations (0-3 bullets)
4) Ohio baseline (0-3 bullets)
5) Next steps (2-5 bullets)
6) Sources (footnotes)

CITATIONS:
- Cite sources as footnotes like [1], [2]...
- In "Sources", list each citation as: [1] <Title> — <URL>
- For parcel data, cite as: [Cuyahoga County Parcel Database]

If you cannot find a property or regulation, say so clearly and recommend contacting the municipality.`;

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
            description: "Property address to search (e.g., '1234 Main St, Cleveland' or '1234 Main St')",
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
        content: `${SYSTEM_PROMPT}\n\nCurrent jurisdiction context: ${args.jurisdiction}\n\n${context}`,
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

    // Save assistant response to chat history (user message already added by client)
    await ctx.runMutation(api.messages.addMessage, {
      chatId: args.chatId,
      userId: args.clerkId,
      role: "assistant",
      content: responseText,
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
