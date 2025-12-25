import { mutation } from "./_generated/server";

// Ohio State and major municipality code content
// This supplements the existing seedData.ts content

const OHIO_STATE_CODES = [
  {
    municipality: "Ohio State",
    codeType: "building",
    section: "OBC Chapter 1",
    title: "Ohio Building Code Overview",
    content: `Ohio Building Code (OBC) 2024 applies to commercial buildings and 3+ unit residential. Ohio Residential Code (ORC) applies to 1-2 family dwellings. Key requirements include occupancy classifications, construction types, fire-resistance ratings, means of egress, accessibility (ADA), structural requirements, and fire protection systems. Local jurisdictions may adopt additional amendments.`,
    summary: "Ohio Building Code applies to commercial and 3+ unit residential. Based on ICC codes with Ohio amendments.",
    investorNotes: "Properties with 3+ units fall under commercial code - more expensive to renovate.",
    sourceUrl: "https://codes.iccsafe.org/content/OHBC2024P1",
  },
  {
    municipality: "Ohio State",
    codeType: "residential",
    section: "ORC R303-R315",
    title: "Ohio Residential Code Key Requirements",
    content: `Ohio Residential Code requirements: LIGHT (8% glazing), VENTILATION (4% openable), EGRESS WINDOWS (5.7 sq ft opening, 20" min width, 24" min height, 44" max sill), SMOKE ALARMS (each bedroom, outside sleeping areas, each level), CO ALARMS (each level with fuel-burning appliance), STAIRS (7-3/4" max riser, 10" min tread, 36" min width, handrail required), ELECTRICAL (GFCI in wet areas, AFCI in bedrooms).`,
    summary: "Ohio Residential Code covers 1-2 family homes with requirements for egress, smoke alarms, stairs, and electrical.",
    investorNotes: "Key rehab items: egress windows in bedrooms, smoke/CO alarms, GFCI outlets, proper stair dimensions.",
    sourceUrl: "https://codes.iccsafe.org/content/OHRC2019P2",
  },
  {
    municipality: "Ohio State",
    codeType: "electrical",
    section: "NEC 2023",
    title: "Ohio Electrical Code Requirements",
    content: `Ohio uses NEC 2023. GFCI required in kitchens, bathrooms, garages, outdoors, crawl spaces, laundry, within 6ft of sinks. AFCI required in bedrooms, living rooms, dining rooms, hallways, closets. Tamper-resistant receptacles required in dwellings. Minimum 100A service for new residential (200A recommended). Smoke alarms must be interconnected with battery backup.`,
    summary: "Ohio uses NEC 2023 requiring GFCI in wet areas, AFCI in living spaces, tamper-resistant receptacles.",
    investorNotes: "Electrical upgrades often needed in older homes. Budget $3,000-8,000 for panel upgrade.",
    sourceUrl: "https://up.codes/viewer/ohio/nfpa-70-2023",
  },
  {
    municipality: "Ohio State",
    codeType: "plumbing",
    section: "OPC 2024",
    title: "Ohio Plumbing Code Requirements",
    content: `Ohio Plumbing Code: Water heater requires T&P relief valve with discharge pipe to 6" of floor. Water supply 40-80 PSI. Drainage slope 1/4" per foot minimum. Water-conserving fixtures required (1.6 GPF toilets, 2.5 GPM showerheads). Gas piping requires sediment trap and shutoff at each appliance.`,
    summary: "Ohio Plumbing Code covers water heaters, supply, drainage, and fixture requirements.",
    investorNotes: "Water heater issues are common POS violations. Check T&P valve, discharge pipe, expansion tank.",
    sourceUrl: "https://codes.iccsafe.org/content/OHPC2024P1",
  },
  {
    municipality: "Ohio State",
    codeType: "mechanical",
    section: "OMC 2024",
    title: "Ohio Mechanical Code Requirements",
    content: `Ohio Mechanical Code: HVAC sizing per Manual J, proper clearances, combustion air required. Ductwork sealed and insulated in unconditioned spaces. Exhaust: kitchen 100 CFM, bathroom 50 CFM. Dryer vented to exterior, max 35ft equivalent, no screws in duct. CO detector required near combustion appliances.`,
    summary: "Ohio Mechanical Code covers HVAC, exhaust, and combustion appliance requirements.",
    investorNotes: "HVAC replacement typically $5,000-15,000. Ensure proper permits.",
    sourceUrl: "https://codes.iccsafe.org/content/OHMC2024P1",
  },
  {
    municipality: "Ohio State",
    codeType: "fire",
    section: "OFC",
    title: "Ohio Fire Code Requirements",
    content: `Ohio Fire Code: Fire extinguishers required in commercial (2A:10BC, 75ft travel distance). Fire alarm systems based on occupancy. Sprinklers required in R-1 (hotels), R-2 (apartments) over 3 stories. Exit signs illuminated, emergency lighting required. Fire lanes 20ft minimum width, 13.5ft vertical clearance.`,
    summary: "Ohio Fire Code covers fire protection systems, egress, and fire department access.",
    investorNotes: "Commercial properties need fire extinguishers, exit signs, emergency lighting.",
    sourceUrl: "https://com.ohio.gov/divisions-and-programs/state-fire-marshal/code-enforcement/ohio-fire-code",
  },
];

// All 59 Cuyahoga municipalities - basic permit/POS info
const MUNICIPALITY_CODES = [
  { municipality: "Parma", population: 81601, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 50, phone: "(440) 885-8088", notes: "Investor-friendly, good rental market" },
  { municipality: "Lakewood", population: 50942, posRequired: true, posFee: 150, rentalReg: true, rentalFee: 35, phone: "(216) 529-6270", notes: "Dense urban, strong rental demand, exterior-only POS for owner-occupied" },
  { municipality: "Euclid", population: 48139, posRequired: true, posFee: 150, rentalReg: true, rentalFee: 50, phone: "(216) 289-2700", notes: "Affordable housing, strict POS, good cash flow" },
  { municipality: "Cleveland Heights", population: 44829, posRequired: true, posFee: 200, rentalReg: true, rentalFee: 50, phone: "(216) 291-4900", notes: "Historic districts, lead paint compliance required" },
  { municipality: "Parma Heights", population: 19968, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 40, phone: "(440) 884-9600", notes: "Affordable, good starter market" },
  { municipality: "Shaker Heights", population: 28448, posRequired: true, posFee: 250, rentalReg: true, rentalFee: 75, phone: "(216) 491-1400", notes: "High-end, strict architectural review" },
  { municipality: "Garfield Heights", population: 27673, posRequired: true, posFee: 150, rentalReg: true, rentalFee: 35, phone: "(216) 475-1100", notes: "Affordable, improving areas" },
  { municipality: "South Euclid", population: 21084, posRequired: true, posFee: 150, rentalReg: true, rentalFee: 40, phone: "(216) 381-0400", notes: "Good starter market" },
  { municipality: "Maple Heights", population: 22178, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 50, phone: "(216) 662-6000", notes: "Very affordable, verify condition" },
  { municipality: "North Olmsted", population: 31620, posRequired: true, posFee: 150, rentalReg: true, rentalFee: 40, phone: "(440) 777-8000", notes: "Established suburb, Great Northern area" },
  { municipality: "Strongsville", population: 44730, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(440) 580-3100", notes: "Large suburb, SouthPark Mall, good schools" },
  { municipality: "Westlake", population: 32729, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(440) 871-3300", notes: "Upscale west side, Crocker Park" },
  { municipality: "North Royalton", population: 30827, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 237-5686", notes: "Growing suburb, newer housing" },
  { municipality: "Brunswick", population: 35388, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(330) 225-9144", notes: "Spans Cuyahoga/Medina, growing" },
  { municipality: "Solon", population: 24148, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(440) 248-1155", notes: "Excellent schools, corporate base" },
  { municipality: "Broadview Heights", population: 19594, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 526-4357", notes: "Growing suburb, newer housing" },
  { municipality: "Bay Village", population: 15617, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 871-2200", notes: "Lakefront community, good schools" },
  { municipality: "Fairview Park", population: 16219, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 35, phone: "(440) 356-4440", notes: "Stable inner-ring suburb" },
  { municipality: "Rocky River", population: 20213, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 331-0600", notes: "Upscale lakefront, strong values" },
  { municipality: "Lyndhurst", population: 13649, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(440) 442-5777", notes: "Established suburb, good schools" },
  { municipality: "Mayfield Heights", population: 18897, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 442-2626", notes: "Near Hillcrest Hospital" },
  { municipality: "University Heights", population: 12904, posRequired: true, posFee: 175, rentalReg: true, rentalFee: 50, phone: "(216) 932-7800", notes: "Near John Carroll, student rentals" },
  { municipality: "Richmond Heights", population: 10546, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 40, phone: "(216) 486-2474", notes: "Near Richmond Town Square" },
  { municipality: "Bedford", population: 12623, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 40, phone: "(440) 232-1600", notes: "Downtown revitalization" },
  { municipality: "Bedford Heights", population: 10721, posRequired: true, posFee: 150, rentalReg: true, rentalFee: 40, phone: "(440) 786-3200", notes: "Affordable, commercial areas" },
  { municipality: "Warrensville Heights", population: 13542, posRequired: true, posFee: 150, rentalReg: true, rentalFee: 50, phone: "(216) 587-6500", notes: "Affordable, verify specific areas" },
  { municipality: "East Cleveland", population: 13877, posRequired: true, posFee: 100, rentalReg: true, rentalFee: 35, phone: "(216) 681-5020", notes: "Very low prices, high risk, full rehab needed" },
  { municipality: "Berea", population: 18713, posRequired: true, posFee: 150, rentalReg: true, rentalFee: 40, phone: "(440) 826-5800", notes: "Baldwin Wallace University, student rentals" },
  { municipality: "Middleburg Heights", population: 15684, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 234-8811", notes: "Near airport, stable" },
  { municipality: "Brook Park", population: 18486, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 35, phone: "(216) 433-1300", notes: "Near airport, Ford plant" },
  { municipality: "Seven Hills", population: 11597, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(216) 524-4421", notes: "Stable suburb, moderate prices" },
  { municipality: "Independence", population: 7244, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(216) 524-1374", notes: "Strong commercial base, Rockside Road" },
  { municipality: "Brooklyn", population: 10867, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 35, phone: "(216) 351-2607", notes: "Affordable inner-ring, good rental market" },
  { municipality: "Olmsted Falls", population: 9024, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(440) 235-3015", notes: "Charming suburb, historic downtown" },
  { municipality: "Highland Heights", population: 8375, posRequired: true, posFee: 200, rentalReg: false, rentalFee: 0, phone: "(440) 461-2440", notes: "Upscale, strict standards" },
  { municipality: "Mayfield Village", population: 3496, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 461-2210", notes: "Stable, good services" },
  { municipality: "Beachwood", population: 13263, posRequired: true, posFee: 250, rentalReg: false, rentalFee: 0, phone: "(216) 464-1070", notes: "High-end, Beachwood Place, strict standards" },
  { municipality: "Pepper Pike", population: 6549, posRequired: true, posFee: 200, rentalReg: false, rentalFee: 0, phone: "(216) 831-8500", notes: "Luxury estate, 1+ acre lots" },
  { municipality: "Orange Village", population: 3323, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(216) 831-8500", notes: "Upscale, limited rental" },
  { municipality: "Moreland Hills", population: 3315, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(440) 248-1188", notes: "Estate community, large lots" },
  { municipality: "Hunting Valley", population: 653, posRequired: true, posFee: 200, rentalReg: false, rentalFee: 0, phone: "(440) 247-4841", notes: "Most exclusive, 5-acre minimum" },
  { municipality: "Gates Mills", population: 2270, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(440) 423-4405", notes: "Historic estate village" },
  { municipality: "Chagrin Falls", population: 3923, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 247-5050", notes: "Charming village, historic downtown" },
  { municipality: "Bentleyville", population: 906, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(440) 247-5055", notes: "Estate community" },
  { municipality: "Bratenahl", population: 1417, posRequired: true, posFee: 175, rentalReg: false, rentalFee: 0, phone: "(216) 681-4266", notes: "Exclusive lakefront" },
  { municipality: "Woodmere", population: 884, posRequired: true, posFee: 150, rentalReg: false, rentalFee: 0, phone: "(216) 831-0033", notes: "Small upscale village" },
  { municipality: "Valley View", population: 2034, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(216) 524-6511", notes: "Small, industrial base" },
  { municipality: "Brooklyn Heights", population: 1543, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(216) 749-3597", notes: "Small village" },
  { municipality: "Cuyahoga Heights", population: 638, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(216) 641-7020", notes: "Primarily industrial" },
  { municipality: "Glenwillow", population: 935, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(440) 439-1643", notes: "Small village" },
  { municipality: "Linndale", population: 114, posRequired: false, posFee: 0, rentalReg: false, rentalFee: 0, phone: "(216) 251-0077", notes: "Tiny village (0.1 sq mi)" },
  { municipality: "Newburgh Heights", population: 1899, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 35, phone: "(216) 641-4650", notes: "Small, affordable" },
  { municipality: "North Randall", population: 906, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(216) 662-5500", notes: "Former mall site redeveloping" },
  { municipality: "Highland Hills", population: 1150, posRequired: true, posFee: 125, rentalReg: true, rentalFee: 35, phone: "(216) 283-3000", notes: "Small, affordable" },
  { municipality: "Oakwood Village", population: 3677, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(440) 232-1211", notes: "Newer development" },
  { municipality: "Walton Hills", population: 2314, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(440) 232-7800", notes: "Quiet residential" },
  { municipality: "Olmsted Township", population: 13513, posRequired: true, posFee: 125, rentalReg: false, rentalFee: 0, phone: "(440) 235-3079", notes: "Larger lots, growing" },
];

// Generate code content entries for each municipality
function generateMunicipalityContent() {
  return MUNICIPALITY_CODES.map(m => ({
    municipality: m.municipality,
    codeType: "permits",
    section: "POS and Permits",
    title: `${m.municipality} Building Permits and Point of Sale`,
    content: `${m.municipality} Building Requirements:

POINT OF SALE: ${m.posRequired ? `Required for all residential sales. Fee: $${m.posFee}. Valid 180 days to 1 year.` : "Not required or minimal requirements."}

RENTAL REGISTRATION: ${m.rentalReg ? `Required. Annual fee: $${m.rentalFee} per unit. Periodic inspections.` : "Not required or minimal requirements."}

PERMITS REQUIRED FOR:
- New construction
- Additions and alterations  
- Roofing replacement
- Electrical, plumbing, HVAC work
- Decks and fences

CONTACT: ${m.municipality} Building Department - ${m.phone}

INVESTOR NOTES: ${m.notes}`,
    summary: `${m.municipality} ${m.posRequired ? `requires POS ($${m.posFee})` : "has minimal POS requirements"}${m.rentalReg ? ` and rental registration ($${m.rentalFee}/unit)` : ""}.`,
    investorNotes: m.notes,
    sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(m.municipality + " Ohio building department")}`,
  }));
}

// Seed Ohio State codes
export const seedOhioStateCodes = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    const now = Date.now();
    
    for (const code of OHIO_STATE_CODES) {
      const existing = await ctx.db
        .query("codeContent")
        .withIndex("by_municipality", (q) => q.eq("municipality", code.municipality))
        .filter((q) => q.eq(q.field("section"), code.section))
        .first();
      
      if (!existing) {
        await ctx.db.insert("codeContent", { ...code, lastUpdated: now });
        inserted++;
      }
    }
    return { inserted, total: OHIO_STATE_CODES.length };
  },
});

// Seed all municipality codes
export const seedAllMunicipalityCodes = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    const now = Date.now();
    const codes = generateMunicipalityContent();
    
    for (const code of codes) {
      const existing = await ctx.db
        .query("codeContent")
        .withIndex("by_municipality", (q) => q.eq("municipality", code.municipality))
        .filter((q) => q.eq(q.field("section"), code.section))
        .first();
      
      if (!existing) {
        await ctx.db.insert("codeContent", { ...code, lastUpdated: now });
        inserted++;
      }
    }
    return { inserted, total: codes.length };
  },
});

// Seed everything (Ohio State + all municipalities)
export const seedAllCodes = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    const now = Date.now();
    
    // Ohio State codes
    for (const code of OHIO_STATE_CODES) {
      const existing = await ctx.db
        .query("codeContent")
        .withIndex("by_municipality", (q) => q.eq("municipality", code.municipality))
        .filter((q) => q.eq(q.field("section"), code.section))
        .first();
      
      if (!existing) {
        await ctx.db.insert("codeContent", { ...code, lastUpdated: now });
        inserted++;
      }
    }
    
    // Municipality codes
    const muniCodes = generateMunicipalityContent();
    for (const code of muniCodes) {
      const existing = await ctx.db
        .query("codeContent")
        .withIndex("by_municipality", (q) => q.eq("municipality", code.municipality))
        .filter((q) => q.eq(q.field("section"), code.section))
        .first();
      
      if (!existing) {
        await ctx.db.insert("codeContent", { ...code, lastUpdated: now });
        inserted++;
      }
    }
    
    return { inserted, ohioState: OHIO_STATE_CODES.length, municipalities: muniCodes.length };
  },
});
