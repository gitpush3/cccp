import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Land use codes with investor notes for LLM reference
const LAND_USE_CODES = [
  { code: "5100", description: "1-FAMILY PLATTED LOT", category: "residential", investorNotes: "Single-family home - most common investment property. Good for fix-and-flip or buy-and-hold rental." },
  { code: "5200", description: "2-FAMILY PLATTED LOT", category: "residential", investorNotes: "Duplex - excellent for house hacking or rental income. Two units on one lot." },
  { code: "5300", description: "3-FAMILY PLATTED LOT", category: "residential", investorNotes: "Triplex - multi-family investment. Can qualify for residential financing up to 4 units." },
  { code: "5400", description: "4-FAMILY PLATTED LOT", category: "residential", investorNotes: "Fourplex - maximum units for residential financing. Popular with investors." },
  { code: "5000", description: "RES VACANT LAND", category: "residential", investorNotes: "Vacant residential lot - development opportunity or land banking." },
  { code: "5500", description: "5+ FAMILY PLATTED LOT", category: "residential", investorNotes: "5+ unit residential - requires commercial financing." },
  { code: "4010", description: "WALK-UP APTS 7-19 U", category: "commercial", investorNotes: "Small apartment building - requires commercial financing. Good cash flow potential." },
  { code: "4020", description: "WALK-UP APTS 20-39 U", category: "commercial", investorNotes: "Medium apartment building - significant investment, professional management recommended." },
  { code: "4030", description: "WALK-UP APTS 40+ U", category: "commercial", investorNotes: "Large walk-up apartment complex." },
  { code: "4080", description: "GARDEN APTS 40+ U", category: "commercial", investorNotes: "Large apartment complex - institutional-grade investment." },
  { code: "4490", description: "ELEVATOR OFFCE >2 ST", category: "commercial", investorNotes: "Office building - commercial real estate, longer lease terms typical." },
  { code: "4500", description: "RETAIL 1 STORY", category: "commercial", investorNotes: "Single-story retail - NNN leases common, location critical." },
  { code: "4510", description: "RETAIL 2+ STORY", category: "commercial", investorNotes: "Multi-story retail building." },
  { code: "4520", description: "SHOPPING CENTER", category: "commercial", investorNotes: "Shopping center - anchor tenant important, CAM charges." },
  { code: "4530", description: "REGIONAL MALL", category: "commercial", investorNotes: "Regional mall - institutional investment." },
  { code: "4540", description: "SUPERMARKET", category: "commercial", investorNotes: "Supermarket - long-term leases, credit tenant." },
  { code: "4550", description: "CONVENIENCE STORE", category: "commercial", investorNotes: "Convenience store - high traffic location important." },
  { code: "4560", description: "RESTAURANT", category: "commercial", investorNotes: "Restaurant property - specialized use, grease trap requirements." },
  { code: "4570", description: "FAST FOOD", category: "commercial", investorNotes: "Fast food restaurant - drive-thru access important." },
  { code: "4580", description: "SERVICE STATION", category: "commercial", investorNotes: "Gas station - environmental considerations, UST regulations." },
  { code: "4585", description: "AUTO REPAIR GARAGE", category: "commercial", investorNotes: "Auto service property - specialized use, environmental considerations." },
  { code: "4590", description: "CAR WASH", category: "commercial", investorNotes: "Car wash - water/sewer capacity important." },
  { code: "4600", description: "WAREHOUSE", category: "industrial", investorNotes: "Warehouse - clear height and loading docks important." },
  { code: "4610", description: "MINI WAREHOUSE", category: "industrial", investorNotes: "Self-storage - low management, steady cash flow." },
  { code: "4700", description: "LIGHT MANUFACTURING", category: "industrial", investorNotes: "Light industrial - zoning restrictions, environmental." },
  { code: "4710", description: "HEAVY MANUFACTURING", category: "industrial", investorNotes: "Heavy industrial - specialized use, environmental concerns." },
  { code: "6100", description: "STATE-OWNED PROP NEC", category: "exempt", investorNotes: "State property - not available for purchase." },
  { code: "6200", description: "COUNTY-OWNED PROP", category: "exempt", investorNotes: "County property - may become available through surplus sales." },
  { code: "6300", description: "CITY/VILLAGE OWNED", category: "exempt", investorNotes: "Municipal property - may become available through surplus sales." },
  { code: "6400", description: "SCHOOL DISTRICT", category: "exempt", investorNotes: "School property - not typically available." },
  { code: "6411", description: "CITY-LAND BANK", category: "exempt", investorNotes: "Land bank property - may be available for purchase through land bank program. Often sold at discount." },
  { code: "6500", description: "CHURCH/RELIGIOUS", category: "exempt", investorNotes: "Religious property - tax exempt, may become available." },
  { code: "6601", description: "PARK DIST-METROPARK", category: "exempt", investorNotes: "Park district property - not available for purchase." },
  { code: "7121", description: "CRA TAX ABATEMENT", category: "residential", investorNotes: "Community Reinvestment Area - property has tax abatement. Significant tax savings for investors." },
  { code: "1000", description: "AGRICULTURAL", category: "agricultural", investorNotes: "Agricultural land - CAUV tax savings, development potential." },
];

// Seed land use codes
export const seedLandUseCodes = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const code of LAND_USE_CODES) {
      // Check if exists
      const existing = await ctx.db
        .query("landUseCodes")
        .withIndex("by_code", (q) => q.eq("code", code.code))
        .first();
      
      if (!existing) {
        await ctx.db.insert("landUseCodes", code);
        inserted++;
      }
    }
    return { inserted, total: LAND_USE_CODES.length };
  },
});

// ===== CUYAHOGA COUNTY CODE CONTENT =====
// Actual code excerpts for LLM searchability
const CODE_CONTENT = [
  // CLEVELAND ZONING
  {
    municipality: "Cleveland",
    codeType: "zoning",
    section: "329.01",
    title: "Residential District Classifications",
    content: `Cleveland Residential Zoning Districts:
- R1-A: Single-Family Residential (minimum 20,000 sq ft lot)
- R1-B: Single-Family Residential (minimum 12,000 sq ft lot)  
- R1-C: Single-Family Residential (minimum 7,500 sq ft lot)
- R2: Two-Family Residential (duplexes permitted)
- R3: Multi-Family Residential (apartments permitted)
- MF-1: Multi-Family 1 (low density multi-family)
- MF-2: Multi-Family 2 (medium density multi-family)

Setback Requirements:
- Front yard: 25 feet minimum in most residential districts
- Side yard: 5 feet minimum, 15 feet on corner lots
- Rear yard: 25 feet minimum

Height Limits:
- R1 districts: 35 feet / 2.5 stories maximum
- R2 districts: 35 feet / 2.5 stories maximum  
- MF districts: 45-75 feet depending on density`,
    summary: "Cleveland residential zoning districts define lot sizes, setbacks, and building heights for single-family through multi-family properties.",
    investorNotes: "R2 and MF zones allow multi-family - check zoning before purchasing for rental conversion. ADUs may be permitted in some R1 zones.",
    sourceUrl: "https://codelibrary.amlegal.com/codes/cleveland/latest/cleveland_oh/0-0-0-12243",
  },
  {
    municipality: "Cleveland",
    codeType: "zoning",
    section: "337.02",
    title: "Accessory Dwelling Units (ADUs)",
    content: `Accessory Dwelling Units in Cleveland:
ADUs are permitted in residential districts subject to:
- Maximum size: 800 sq ft or 40% of principal dwelling, whichever is less
- Must be located on same lot as principal single-family dwelling
- Owner must occupy either principal dwelling or ADU
- One ADU per lot maximum
- Must meet all setback requirements
- Separate utility meters may be required
- Off-street parking: 1 additional space required

ADU Types Permitted:
- Detached: Separate structure in rear yard
- Attached: Addition to principal dwelling
- Internal: Conversion of existing space (basement, attic)`,
    summary: "Cleveland permits ADUs up to 800 sq ft on single-family lots with owner occupancy requirement.",
    investorNotes: "ADUs can add rental income but require owner occupancy. Good for house hacking strategy. Check if property already has unpermitted ADU.",
    sourceUrl: "https://codelibrary.amlegal.com/codes/cleveland/latest/cleveland_oh/0-0-0-12243",
  },
  {
    municipality: "Cleveland",
    codeType: "permits",
    section: "Building Permit Requirements",
    title: "When Building Permits Are Required",
    content: `Cleveland Building Permit Requirements:

Permits REQUIRED for:
- New construction of any building
- Additions or structural alterations
- Roofing replacement (not repairs)
- Window/door replacement (if changing size)
- Electrical work (except minor repairs)
- Plumbing work (except minor repairs)
- HVAC installation or replacement
- Deck construction (attached or detached)
- Fence over 6 feet
- Demolition of any structure
- Change of use or occupancy
- Swimming pools (in-ground and above-ground over 24")

Permits NOT required for:
- Painting and decorating
- Flooring replacement (non-structural)
- Cabinet installation
- Minor repairs (same-for-same replacement)
- Fences under 6 feet in rear yard

Permit Fees:
- Residential: Based on project valuation
- Minimum fee: $50
- Plan review: Additional 65% of permit fee

Processing Time:
- Simple permits: 1-3 business days
- Complex projects: 2-4 weeks for plan review`,
    summary: "Cleveland requires permits for most construction work including roofing, windows, electrical, plumbing, and HVAC.",
    investorNotes: "Budget 2-4 weeks for permit approval on rehab projects. Pull permits to avoid issues at resale. Unpermitted work can kill deals.",
    sourceUrl: "https://www.clevelandohio.gov/city-hall/departments/building-housing/divisions/permits",
  },
  {
    municipality: "Cleveland",
    codeType: "building",
    section: "3103.01",
    title: "Point of Sale Inspection Requirements",
    content: `Cleveland Point of Sale (POS) Inspection:

Required for ALL residential property sales in Cleveland.

Inspection Covers:
- Structural integrity
- Electrical system safety
- Plumbing system function
- Heating system operation
- Roof condition
- Exterior maintenance
- Smoke/CO detectors
- Egress windows in bedrooms
- Handrails and guardrails

Common Violations:
- Missing smoke detectors (required in each bedroom, hallway, basement)
- Missing CO detectors (required on each floor)
- Electrical hazards (open junction boxes, improper wiring)
- Plumbing leaks
- Missing handrails on stairs
- Peeling exterior paint
- Roof damage

Fees:
- Single-family: $150
- Two-family: $200
- Three-family: $250

Timeline:
- Schedule inspection: 2-5 business days
- Reinspection: $75 per visit
- Certificate valid: 180 days

Escrow Holdback:
- Seller may escrow 1.5x repair cost if unable to complete before closing`,
    summary: "Cleveland requires Point of Sale inspection for all residential sales covering safety, structural, and code compliance items.",
    investorNotes: "CRITICAL for investors: Budget $2,000-5,000 for typical POS repairs. Get pre-inspection before making offers. Common issues: smoke detectors, handrails, electrical.",
    sourceUrl: "https://www.clevelandohio.gov/city-hall/departments/building-housing",
  },
  {
    municipality: "Cleveland",
    codeType: "fire",
    section: "1501.01",
    title: "Smoke and Carbon Monoxide Detector Requirements",
    content: `Cleveland Smoke and CO Detector Requirements:

Smoke Detectors Required:
- Inside each bedroom
- Outside each sleeping area (hallway)
- On each level including basement
- In attached garage
- Interconnected (when one sounds, all sound)
- Hardwired with battery backup in new construction
- Battery-operated acceptable in existing buildings

Carbon Monoxide Detectors Required:
- On each floor with sleeping areas
- Within 10 feet of bedroom doors
- Near attached garage
- Near fuel-burning appliances

Detector Specifications:
- Must be UL listed
- Replace every 10 years (smoke) or per manufacturer (CO)
- Test monthly
- Replace batteries annually

Penalties:
- Violation of housing code
- Required for Point of Sale certificate
- Required for rental registration`,
    summary: "Cleveland requires smoke detectors in all bedrooms and hallways, CO detectors on each floor with sleeping areas.",
    investorNotes: "Install interconnected hardwired detectors during rehab - adds value and passes POS. Budget $50-100 per detector installed.",
    sourceUrl: "https://codelibrary.amlegal.com/codes/cleveland/latest/cleveland_oh/0-0-0-16768",
  },
  {
    municipality: "Cleveland",
    codeType: "rental",
    section: "365.01",
    title: "Rental Property Registration",
    content: `Cleveland Rental Registration Requirements:

All rental properties must be registered with the City.

Registration Requirements:
- Annual registration required
- Fee: $35 per unit
- Must provide owner contact information
- Must provide local agent if owner lives outside Cuyahoga County
- Must pass inspection every 3 years (or upon complaint)

Inspection Requirements:
- Initial inspection before first tenant
- Reinspection every 3 years
- Complaint-based inspections
- Must correct violations within 30 days

Common Rental Violations:
- Smoke/CO detectors missing or non-functional
- Heating system issues
- Plumbing leaks
- Electrical hazards
- Structural defects
- Pest infestation
- Missing egress windows

Penalties for Non-Registration:
- $500 fine per unit
- Cannot evict tenants
- Cannot collect rent through courts`,
    summary: "Cleveland requires annual rental registration at $35/unit with inspections every 3 years.",
    investorNotes: "Register rentals immediately after purchase. Unregistered properties cannot pursue evictions. Budget for inspection repairs.",
    sourceUrl: "https://www.clevelandohio.gov/city-hall/departments/building-housing",
  },
  // OHIO STATE CODES
  {
    municipality: "Ohio State",
    codeType: "building",
    section: "OBC Chapter 1",
    title: "Ohio Building Code Applicability",
    content: `Ohio Building Code (OBC) Applicability:

The Ohio Building Code applies to:
- All commercial buildings
- Residential buildings with 3+ units
- Mixed-use buildings

Ohio Residential Code (ORC) applies to:
- One and two-family dwellings
- Townhouses (3 stories or less)

Key OBC Requirements:
- Occupancy classifications (A, B, E, F, H, I, M, R, S, U)
- Construction types (I, II, III, IV, V)
- Fire-resistance ratings
- Means of egress
- Accessibility (ADA compliance)
- Structural requirements
- Fire protection systems

Municipalities May:
- Adopt state code as-is
- Adopt with local amendments
- Enforce through local building department

Plan Review:
- Required for all commercial construction
- Structural, electrical, mechanical, plumbing
- Fire protection review by State Fire Marshal for certain occupancies`,
    summary: "Ohio Building Code applies to commercial and 3+ unit residential. One and two-family homes follow Ohio Residential Code.",
    investorNotes: "Properties with 3+ units fall under commercial code - more expensive to renovate. Check occupancy classification before purchasing.",
    sourceUrl: "https://codes.iccsafe.org/content/OHBC2024P1",
  },
  {
    municipality: "Ohio State",
    codeType: "residential",
    section: "ORC R303",
    title: "Light and Ventilation Requirements",
    content: `Ohio Residential Code - Light and Ventilation:

Natural Light Requirements:
- Habitable rooms: Minimum 8% of floor area in glazing
- Example: 100 sq ft room needs 8 sq ft of windows

Natural Ventilation Requirements:
- Habitable rooms: Minimum 4% of floor area openable
- Or mechanical ventilation providing 0.35 ACH

Bedroom Egress Requirements:
- Minimum opening: 5.7 sq ft
- Minimum width: 20 inches
- Minimum height: 24 inches
- Maximum sill height: 44 inches from floor
- Must open directly to exterior

Bathroom Ventilation:
- Openable window (1.5 sq ft minimum) OR
- Mechanical exhaust: 50 CFM intermittent / 20 CFM continuous

Kitchen Ventilation:
- Range hood vented to exterior recommended
- Minimum 100 CFM for residential`,
    summary: "Ohio requires habitable rooms to have 8% glazing for light and 4% openable for ventilation. Bedrooms need egress windows.",
    investorNotes: "Basement bedrooms need egress windows (5.7 sq ft opening). Adding egress costs $2,000-4,000 but adds legal bedroom.",
    sourceUrl: "https://codes.iccsafe.org/content/OHRC2019P2",
  },
  // LAKEWOOD
  {
    municipality: "Lakewood",
    codeType: "permits",
    section: "1301.01",
    title: "Lakewood Building Permit Requirements",
    content: `Lakewood Building Permit Requirements:

Permits Required:
- New construction
- Additions and alterations
- Roofing (full replacement)
- Electrical work
- Plumbing work
- HVAC replacement
- Decks and porches
- Fences over 4 feet
- Driveways and parking areas
- Swimming pools

Permit Fees:
- Based on project valuation
- Minimum fee: $50
- Plan review: 50% of permit fee

Point of Sale:
- Lakewood requires exterior inspection for all sales
- Interior inspection if rental property
- Certificate valid 1 year

Contact:
- Lakewood Building Department
- 12650 Detroit Avenue
- (216) 529-6270`,
    summary: "Lakewood requires permits for construction, roofing, electrical, plumbing, HVAC. Point of Sale exterior inspection required for all sales.",
    investorNotes: "Lakewood POS is exterior-only for owner-occupied, full inspection for rentals. Faster than Cleveland POS process.",
    sourceUrl: "https://www.lakewoodoh.gov/building/",
  },
  // PARMA
  {
    municipality: "Parma",
    codeType: "permits",
    section: "1301.01",
    title: "Parma Building Permit Requirements",
    content: `Parma Building Permit Requirements:

Permits Required:
- New construction
- Additions over 100 sq ft
- Structural alterations
- Roofing replacement
- Electrical work (over $500)
- Plumbing work
- HVAC replacement
- Decks attached to house
- Fences (permit required, no fee)
- Driveways

Permit Fees:
- Residential: $8 per $1,000 valuation
- Minimum: $50
- Electrical: $50 minimum
- Plumbing: $50 minimum
- HVAC: $75

Point of Sale:
- Required for all residential sales
- Fee: $125 single-family
- Covers exterior and interior safety items
- Valid 1 year

Contact:
- Parma Building Department
- 6611 Ridge Road
- (440) 885-8088`,
    summary: "Parma requires permits for most construction. Point of Sale inspection required for all residential sales at $125.",
    investorNotes: "Parma is investor-friendly with reasonable permit fees. POS less stringent than Cleveland. Good rental market.",
    sourceUrl: "https://www.cityofparma-oh.gov/departments/building_department/",
  },
  // EUCLID
  {
    municipality: "Euclid",
    codeType: "permits",
    section: "1301.01",
    title: "Euclid Building and Point of Sale Requirements",
    content: `Euclid Building Permit and Point of Sale Requirements:

Building Permits Required:
- New construction
- Additions and alterations
- Roofing
- Electrical, plumbing, HVAC
- Decks and fences

Point of Sale Inspection:
- Required for ALL property transfers
- Interior and exterior inspection
- Fee: $150 single-family, $200 two-family
- Must schedule within 5 days of listing
- Valid 180 days

Common POS Violations in Euclid:
- Smoke/CO detectors
- GFCI outlets in kitchen/bath
- Handrails
- Water heater strapping
- Exterior maintenance

Rental Registration:
- Required for all rental properties
- Annual fee: $50 per unit
- Inspection every 2 years`,
    summary: "Euclid requires Point of Sale inspection for all property transfers. Rental registration required with biennial inspections.",
    investorNotes: "Euclid has affordable housing stock but strict POS. Budget for repairs. Good cash flow market for rentals.",
    sourceUrl: "https://www.cityofeuclid.com/building",
  },
  // GENERAL INVESTOR INFO
  {
    municipality: "Cuyahoga County",
    codeType: "investor-guide",
    section: "Tax Abatement Programs",
    title: "Cuyahoga County Tax Abatement Programs",
    content: `Cuyahoga County Tax Abatement Programs:

Community Reinvestment Area (CRA):
- 100% tax abatement on improvements for 10-15 years
- Available in designated areas
- New construction and substantial rehab
- Must apply BEFORE starting work
- Minimum investment thresholds vary by municipality

Tax Increment Financing (TIF):
- Diverts increased property taxes to infrastructure
- Used for larger developments
- Requires municipal approval

Residential Tax Abatement (Cleveland):
- 15-year, 100% abatement on new construction
- 15-year, 100% abatement on rehab over $10,000
- Must apply before permit issuance
- Owner-occupied and rental eligible

How to Check for Existing Abatement:
- Look for tax_luc code 7121 (CRA Tax Abatement)
- Check county auditor website
- Abatement transfers with property

Impact on Investment:
- Significantly reduces carrying costs
- Improves cash flow
- May affect resale if abatement expiring`,
    summary: "CRA tax abatements provide 100% property tax reduction on improvements for 10-15 years. Must apply before starting work.",
    investorNotes: "ALWAYS check for CRA eligibility before renovating. 15-year abatement can save $50,000+ on a typical Cleveland rehab.",
    sourceUrl: "https://www.clevelandohio.gov/city-hall/departments/community-development",
  },
  {
    municipality: "Cuyahoga County",
    codeType: "investor-guide",
    section: "Land Bank Properties",
    title: "Cuyahoga Land Bank Program",
    content: `Cuyahoga County Land Bank:

The Cuyahoga County Land Reutilization Corporation (Land Bank) acquires and sells vacant and abandoned properties.

How to Purchase:
- Browse available properties at cuyahogalandbank.org
- Submit application with renovation plan
- Properties sold "as-is"
- Prices typically $1,000 - $25,000

Requirements:
- Must renovate within 18 months
- Must meet building codes
- Cannot flip immediately (holding period)
- Background check required

Benefits:
- Below-market prices
- Clear title (Land Bank clears liens)
- May qualify for rehab financing

Identifying Land Bank Properties:
- Look for owner "CUYAHOGA COUNTY LAND REUTILIZATION CORPORATION"
- Tax LUC code 6411 (CITY-LAND BANK) or similar
- ext_luc 6210 (COUNTY LAND BANK)

Tips:
- Properties need significant work
- Get contractor estimates before purchasing
- Check for environmental issues
- Verify utility connections`,
    summary: "Cuyahoga Land Bank sells vacant properties at discount prices. Must renovate within 18 months.",
    investorNotes: "Land Bank properties are great deals but need full rehab. Budget $50-100k+ for renovation. Good for experienced investors.",
    sourceUrl: "https://cuyahogalandbank.org/",
  },
];

// Seed code content for LLM searchability
export const seedCodeContent = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    const now = Date.now();
    
    for (const code of CODE_CONTENT) {
      // Check if exists by municipality + section
      const existing = await ctx.db
        .query("codeContent")
        .withIndex("by_municipality", (q) => q.eq("municipality", code.municipality))
        .filter((q) => q.eq(q.field("section"), code.section))
        .first();
      
      if (!existing) {
        await ctx.db.insert("codeContent", {
          ...code,
          lastUpdated: now,
        });
        inserted++;
      }
    }
    return { inserted, total: CODE_CONTENT.length };
  },
});

// Clear and reseed code content
export const reseedCodeContent = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all existing
    const existing = await ctx.db.query("codeContent").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    // Insert fresh
    const now = Date.now();
    for (const code of CODE_CONTENT) {
      await ctx.db.insert("codeContent", {
        ...code,
        lastUpdated: now,
      });
    }
    return { deleted: existing.length, inserted: CODE_CONTENT.length };
  },
});

// ===== POINT OF SALE REQUIREMENTS =====
// Critical investor data - varies by municipality

const POS_REQUIREMENTS = [
  {
    city: "CLEVELAND",
    posRequired: true,
    posCost: 150,
    inspectionType: "interior_exterior",
    avgProcessingDays: 14,
    escrowRequired: true,
    escrowPercent: 150,
    transferRestrictions: "Certificate required before deed transfer",
    commonFailureItems: ["Smoke detectors", "GFCI outlets", "Handrails", "Water heater strapping", "Exterior paint/siding"],
    investorNotes: "Strict enforcement. Budget $2-5K for typical repairs. Schedule inspection ASAP after contract.",
    contactPhone: "216-664-2282",
    contactWebsite: "https://www.clevelandohio.gov/city-hall/departments/building-housing",
  },
  {
    city: "CLEVELAND HEIGHTS",
    posRequired: true,
    posCost: 125,
    inspectionType: "interior_exterior",
    avgProcessingDays: 21,
    escrowRequired: true,
    escrowPercent: 100,
    transferRestrictions: "Cannot close without POS certificate or escrow agreement",
    commonFailureItems: ["Smoke/CO detectors", "Electrical panel issues", "Window glazing", "Garage door openers", "Roof condition"],
    investorNotes: "Very strict municipality. One of the toughest POS in the county. Factor extra time and money.",
    contactPhone: "216-291-4900",
    contactWebsite: "https://www.clevelandheights.gov/269/Building",
  },
  {
    city: "LAKEWOOD",
    posRequired: true,
    posCost: 100,
    inspectionType: "interior_exterior",
    avgProcessingDays: 14,
    escrowRequired: true,
    escrowPercent: 125,
    transferRestrictions: "Occupancy permit required",
    commonFailureItems: ["Smoke detectors", "GFCI outlets", "Handrails", "Peeling paint", "Garage condition"],
    investorNotes: "Moderate strictness. Good investor market with reasonable POS process.",
    contactPhone: "216-529-6270",
    contactWebsite: "https://www.lakewoodoh.gov/building/",
  },
  {
    city: "PARMA",
    posRequired: true,
    posCost: 85,
    inspectionType: "interior_exterior",
    avgProcessingDays: 10,
    escrowRequired: false,
    transferRestrictions: "Certificate or compliance letter required",
    commonFailureItems: ["Smoke detectors", "GFCI", "Handrails", "Water heater"],
    investorNotes: "Reasonable POS process. Large inventory of affordable homes.",
    contactPhone: "440-887-7400",
    contactWebsite: "https://www.cityofparma-oh.gov/building",
  },
  {
    city: "EUCLID",
    posRequired: true,
    posCost: 100,
    inspectionType: "interior_exterior",
    avgProcessingDays: 14,
    escrowRequired: true,
    escrowPercent: 100,
    transferRestrictions: "POS certificate required",
    commonFailureItems: ["Smoke/CO detectors", "GFCI", "Electrical issues", "Plumbing", "Exterior maintenance"],
    investorNotes: "Active enforcement. Good deals available but factor in compliance costs.",
    contactPhone: "216-289-2703",
    contactWebsite: "https://www.cityofeuclid.com/building",
  },
  {
    city: "SHAKER HEIGHTS",
    posRequired: true,
    posCost: 150,
    inspectionType: "interior_exterior",
    avgProcessingDays: 21,
    escrowRequired: true,
    escrowPercent: 150,
    transferRestrictions: "Strict compliance required before transfer",
    commonFailureItems: ["Historic preservation items", "Window condition", "Electrical", "Exterior appearance", "Landscaping"],
    investorNotes: "High-end market with VERY strict POS. Historic homes have additional requirements.",
    contactPhone: "216-491-1420",
    contactWebsite: "https://www.shakeronline.com/building",
  },
  {
    city: "SOUTH EUCLID",
    posRequired: true,
    posCost: 75,
    inspectionType: "interior_exterior",
    avgProcessingDays: 14,
    escrowRequired: true,
    escrowPercent: 100,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke detectors", "GFCI", "Handrails", "Exterior maintenance"],
    investorNotes: "Standard POS process. Good entry-level investor market.",
    contactPhone: "216-381-0400",
    contactWebsite: "https://www.southeuclid.com/building",
  },
  {
    city: "MAPLE HEIGHTS",
    posRequired: true,
    posCost: 75,
    inspectionType: "interior_exterior",
    avgProcessingDays: 10,
    escrowRequired: false,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke detectors", "GFCI", "Basic safety items"],
    investorNotes: "Affordable market with less strict POS. Good for cash flow investors.",
    contactPhone: "216-662-6000",
    contactWebsite: "https://www.cityofmapleheights.com",
  },
  {
    city: "GARFIELD HEIGHTS",
    posRequired: true,
    posCost: 75,
    inspectionType: "interior_exterior",
    avgProcessingDays: 10,
    escrowRequired: false,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke detectors", "GFCI", "Handrails"],
    investorNotes: "Affordable homes. Less strict than inner-ring suburbs.",
    contactPhone: "216-475-1100",
    contactWebsite: "https://www.garfieldhts.org/building",
  },
  {
    city: "EAST CLEVELAND",
    posRequired: true,
    posCost: 50,
    inspectionType: "interior_exterior",
    avgProcessingDays: 7,
    escrowRequired: false,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke detectors", "Basic safety"],
    investorNotes: "Very affordable market. Less strict POS but higher risk area. Due diligence critical.",
    contactPhone: "216-681-5020",
    contactWebsite: "https://eastcleveland.org/building",
  },
  {
    city: "ROCKY RIVER",
    posRequired: true,
    posCost: 125,
    inspectionType: "interior_exterior",
    avgProcessingDays: 14,
    escrowRequired: true,
    escrowPercent: 100,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke/CO detectors", "GFCI", "Windows", "Exterior"],
    investorNotes: "Higher-end market. Well-maintained properties. Strict standards.",
    contactPhone: "440-331-0600",
    contactWebsite: "https://www.rfrh.org/building",
  },
  {
    city: "BAY VILLAGE",
    posRequired: true,
    posCost: 100,
    inspectionType: "exterior_only",
    avgProcessingDays: 10,
    escrowRequired: false,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Exterior paint", "Roof condition", "Garage doors"],
    investorNotes: "Exterior-only inspection. High-end lakefront community.",
    contactPhone: "440-871-2200",
    contactWebsite: "https://www.cityofbayvillage.com/building",
  },
  {
    city: "WESTLAKE",
    posRequired: false,
    investorNotes: "No POS required. One of the easiest closings in the county.",
    contactPhone: "440-871-3300",
    contactWebsite: "https://www.cityofwestlake.org/building",
  },
  {
    city: "NORTH OLMSTED",
    posRequired: false,
    investorNotes: "No POS required. Good suburb with easy transactions.",
    contactPhone: "440-777-8000",
    contactWebsite: "https://www.north-olmsted.com/building",
  },
  {
    city: "STRONGSVILLE",
    posRequired: false,
    investorNotes: "No POS required. Family-friendly suburb, easy closing process.",
    contactPhone: "440-580-3100",
    contactWebsite: "https://www.strongsville.org/building",
  },
  {
    city: "BROOK PARK",
    posRequired: true,
    posCost: 75,
    inspectionType: "interior_exterior",
    avgProcessingDays: 10,
    escrowRequired: false,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke detectors", "GFCI", "Basic safety"],
    investorNotes: "Near airport. Affordable market with standard POS.",
    contactPhone: "216-433-1300",
    contactWebsite: "https://www.cityofbrookpark.com/building",
  },
  {
    city: "MIDDLEBURG HEIGHTS",
    posRequired: false,
    investorNotes: "No POS required. Convenient location, easy transactions.",
    contactPhone: "440-234-8811",
    contactWebsite: "https://www.middleburgheights.com/building",
  },
  {
    city: "PARMA HEIGHTS",
    posRequired: true,
    posCost: 75,
    inspectionType: "interior_exterior",
    avgProcessingDays: 10,
    escrowRequired: false,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke detectors", "GFCI", "Handrails"],
    investorNotes: "Similar to Parma. Affordable with standard POS.",
    contactPhone: "440-884-9600",
    contactWebsite: "https://www.parmaheightsoh.gov/building",
  },
  {
    city: "SEVEN HILLS",
    posRequired: false,
    investorNotes: "No POS required. Nice suburb with easy transactions.",
    contactPhone: "216-524-4421",
    contactWebsite: "https://www.sevenhillsohio.org/building",
  },
  {
    city: "BROADVIEW HEIGHTS",
    posRequired: false,
    investorNotes: "No POS required. Growing suburb, easy closing process.",
    contactPhone: "440-838-4705",
    contactWebsite: "https://www.broadview-heights.org/building",
  },
  {
    city: "BEACHWOOD",
    posRequired: true,
    posCost: 150,
    inspectionType: "interior_exterior",
    avgProcessingDays: 14,
    escrowRequired: true,
    escrowPercent: 100,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke/CO detectors", "GFCI", "High-end finish items"],
    investorNotes: "Upscale suburb. High property values, strict standards.",
    contactPhone: "216-292-1970",
    contactWebsite: "https://www.beachwoodohio.com/building",
  },
  {
    city: "LYNDHURST",
    posRequired: true,
    posCost: 100,
    inspectionType: "interior_exterior",
    avgProcessingDays: 14,
    escrowRequired: true,
    escrowPercent: 100,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke/CO detectors", "GFCI", "Electrical panel", "Windows"],
    investorNotes: "Near Legacy Village. Good rental market.",
    contactPhone: "440-442-5777",
    contactWebsite: "https://www.lyndhurst-oh.com/building",
  },
  {
    city: "RICHMOND HEIGHTS",
    posRequired: true,
    posCost: 75,
    inspectionType: "interior_exterior",
    avgProcessingDays: 10,
    escrowRequired: false,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke detectors", "GFCI", "Basic safety"],
    investorNotes: "Affordable east-side suburb. Standard POS.",
    contactPhone: "216-383-6300",
    contactWebsite: "https://richmondheightsohio.org/building",
  },
  {
    city: "MAYFIELD HEIGHTS",
    posRequired: true,
    posCost: 100,
    inspectionType: "interior_exterior",
    avgProcessingDays: 14,
    escrowRequired: false,
    transferRestrictions: "Certificate required",
    commonFailureItems: ["Smoke/CO detectors", "GFCI", "Electrical", "Exterior"],
    investorNotes: "Near Hillcrest Hospital. Good location.",
    contactPhone: "440-442-2626",
    contactWebsite: "https://www.mayfieldheights.org/building",
  },
];

// Seed Point of Sale requirements
export const seedPOSRequirements = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;

    for (const pos of POS_REQUIREMENTS) {
      const existing = await ctx.db
        .query("posRequirements")
        .withIndex("by_city", (q) => q.eq("city", pos.city))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { ...pos, lastUpdated: Date.now() });
        updated++;
      } else {
        await ctx.db.insert("posRequirements", { ...pos, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, updated, total: POS_REQUIREMENTS.length };
  },
});

// ===== SAMPLE DATA FOR TESTING =====

// Sample tax delinquent data
export const seedSampleTaxDelinquent = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleData = [
      {
        parcelId: "10321081",
        address: "3456 E 147TH ST",
        city: "CLEVELAND",
        zipCode: "44120",
        ownerName: "SMITH, JOHN",
        totalAmountOwed: 8500,
        yearsDelinquent: 3,
        oldestDelinquentYear: 2021,
        paymentPlanStatus: "none" as const,
        certifiedForSale: true,
      },
      {
        parcelId: "11523067",
        address: "15234 LAKE SHORE BLVD",
        city: "CLEVELAND",
        zipCode: "44110",
        ownerName: "JOHNSON LLC",
        totalAmountOwed: 12000,
        yearsDelinquent: 4,
        oldestDelinquentYear: 2020,
        paymentPlanStatus: "defaulted" as const,
        certifiedForSale: true,
      },
      {
        parcelId: "64312045",
        address: "1823 WINCHESTER AVE",
        city: "LAKEWOOD",
        zipCode: "44107",
        ownerName: "WILLIAMS, MARY",
        totalAmountOwed: 5200,
        yearsDelinquent: 2,
        oldestDelinquentYear: 2022,
        paymentPlanStatus: "none" as const,
        certifiedForSale: false,
      },
      {
        parcelId: "47125089",
        address: "4521 BROOKPARK RD",
        city: "PARMA",
        zipCode: "44134",
        ownerName: "GARCIA INVESTMENTS LLC",
        totalAmountOwed: 15000,
        yearsDelinquent: 5,
        oldestDelinquentYear: 2019,
        paymentPlanStatus: "none" as const,
        certifiedForSale: true,
      },
      {
        parcelId: "68234091",
        address: "2156 LEE RD",
        city: "CLEVELAND HEIGHTS",
        zipCode: "44118",
        ownerName: "BROWN, ROBERT",
        totalAmountOwed: 7800,
        yearsDelinquent: 3,
        oldestDelinquentYear: 2021,
        paymentPlanStatus: "active" as const,
        certifiedForSale: false,
      },
    ];

    let inserted = 0;
    for (const record of sampleData) {
      const existing = await ctx.db
        .query("taxDelinquent")
        .withIndex("by_parcel_id", (q) => q.eq("parcelId", record.parcelId))
        .first();

      if (!existing) {
        await ctx.db.insert("taxDelinquent", { ...record, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, total: sampleData.length };
  },
});

// Sample sheriff sales data
export const seedSampleSheriffSales = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleData = [
      {
        caseNumber: "CV-24-123456",
        parcelId: "10456789",
        address: "5678 SUPERIOR AVE",
        city: "CLEVELAND",
        zipCode: "44103",
        saleDate: "2026-02-15",
        saleTime: "9:00 AM",
        openingBid: 45000,
        appraisedValue: 85000,
        plaintiff: "WELLS FARGO BANK",
        defendant: "DOE, JANE",
        status: "scheduled" as const,
        propertyType: "Single Family",
        caseType: "Foreclosure",
        sourceUrl: "https://cuyahoga.sheriffsaleauction.ohio.gov",
      },
      {
        caseNumber: "CV-24-234567",
        parcelId: "64789012",
        address: "12345 DETROIT AVE",
        city: "LAKEWOOD",
        zipCode: "44107",
        saleDate: "2026-02-22",
        saleTime: "9:00 AM",
        openingBid: 95000,
        appraisedValue: 175000,
        plaintiff: "CHASE BANK",
        defendant: "MILLER, TOM",
        status: "scheduled" as const,
        propertyType: "Single Family",
        caseType: "Foreclosure",
        sourceUrl: "https://cuyahoga.sheriffsaleauction.ohio.gov",
      },
      {
        caseNumber: "CV-24-345678",
        parcelId: "47234567",
        address: "7890 STATE RD",
        city: "PARMA",
        zipCode: "44134",
        saleDate: "2026-02-08",
        saleTime: "9:00 AM",
        openingBid: 55000,
        appraisedValue: 110000,
        plaintiff: "US BANK",
        defendant: "WILSON TRUST",
        status: "scheduled" as const,
        propertyType: "Single Family",
        caseType: "Foreclosure",
        sourceUrl: "https://cuyahoga.sheriffsaleauction.ohio.gov",
      },
    ];

    let inserted = 0;
    for (const sale of sampleData) {
      const existing = await ctx.db
        .query("sheriffSales")
        .withIndex("by_case_number", (q) => q.eq("caseNumber", sale.caseNumber))
        .first();

      if (!existing) {
        await ctx.db.insert("sheriffSales", { ...sale, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, total: sampleData.length };
  },
});

// Sample code violations
export const seedSampleCodeViolations = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleData = [
      {
        parcelId: "10321081",
        address: "3456 E 147TH ST, CLEVELAND",
        city: "CLEVELAND",
        zipCode: "44120",
        violationType: "exterior_maintenance",
        violationCode: "BMC 369.15",
        violationDescription: "Peeling paint and deteriorated siding on exterior walls",
        severity: "major" as const,
        status: "open" as const,
        issuedDate: "2025-08-15",
        dueDate: "2025-10-15",
        fineAmount: 250,
        caseNumber: "VN-2025-12345",
      },
      {
        parcelId: "64312045",
        address: "1823 WINCHESTER AVE, LAKEWOOD",
        city: "LAKEWOOD",
        zipCode: "44107",
        violationType: "unsafe_structure",
        violationCode: "LMC 1341.02",
        violationDescription: "Deteriorated front porch railing - safety hazard",
        severity: "critical" as const,
        status: "open" as const,
        issuedDate: "2025-09-01",
        dueDate: "2025-09-30",
        fineAmount: 500,
        caseNumber: "VN-2025-5678",
      },
      {
        parcelId: "11523067",
        address: "15234 LAKE SHORE BLVD, CLEVELAND",
        city: "CLEVELAND",
        zipCode: "44110",
        violationType: "vacant_building",
        violationCode: "BMC 3103.09",
        violationDescription: "Vacant building not properly secured - open windows",
        severity: "major" as const,
        status: "lien_placed" as const,
        issuedDate: "2025-03-15",
        dueDate: "2025-04-15",
        fineAmount: 1000,
        caseNumber: "VN-2025-3456",
      },
    ];

    let inserted = 0;
    for (const violation of sampleData) {
      const existing = await ctx.db
        .query("codeViolations")
        .filter((q) => q.eq(q.field("caseNumber"), violation.caseNumber))
        .first();

      if (!existing) {
        await ctx.db.insert("codeViolations", { ...violation, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, total: sampleData.length };
  },
});

// Sample demographics
export const seedSampleDemographics = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleData = [
      {
        zipCode: "44107",
        city: "LAKEWOOD",
        population: 52131,
        medianHouseholdIncome: 52000,
        medianAge: 34,
        ownerOccupiedPercent: 42,
        renterOccupiedPercent: 58,
        vacancyRate: 6.5,
        medianHomeValue: 165000,
        medianRent: 950,
        povertyRate: 12.5,
        unemploymentRate: 4.2,
        collegeEducatedPercent: 48,
        dataYear: 2022,
      },
      {
        zipCode: "44118",
        city: "CLEVELAND HEIGHTS",
        population: 45000,
        medianHouseholdIncome: 58000,
        medianAge: 38,
        ownerOccupiedPercent: 55,
        renterOccupiedPercent: 45,
        vacancyRate: 8.0,
        medianHomeValue: 145000,
        medianRent: 1050,
        povertyRate: 14.0,
        unemploymentRate: 5.1,
        collegeEducatedPercent: 52,
        dataYear: 2022,
      },
      {
        zipCode: "44120",
        city: "CLEVELAND",
        population: 28000,
        medianHouseholdIncome: 32000,
        medianAge: 36,
        ownerOccupiedPercent: 38,
        renterOccupiedPercent: 62,
        vacancyRate: 15.0,
        medianHomeValue: 65000,
        medianRent: 750,
        povertyRate: 28.0,
        unemploymentRate: 8.5,
        collegeEducatedPercent: 22,
        dataYear: 2022,
      },
      {
        zipCode: "44134",
        city: "PARMA",
        population: 35000,
        medianHouseholdIncome: 48000,
        medianAge: 42,
        ownerOccupiedPercent: 68,
        renterOccupiedPercent: 32,
        vacancyRate: 5.5,
        medianHomeValue: 135000,
        medianRent: 875,
        povertyRate: 10.0,
        unemploymentRate: 4.0,
        collegeEducatedPercent: 28,
        dataYear: 2022,
      },
    ];

    let inserted = 0;
    for (const demo of sampleData) {
      const existing = await ctx.db
        .query("demographics")
        .withIndex("by_zip_code", (q) => q.eq("zipCode", demo.zipCode))
        .first();

      if (!existing) {
        await ctx.db.insert("demographics", { ...demo, lastUpdated: Date.now() });
        inserted++;
      }
    }

    return { inserted, total: sampleData.length };
  },
});

// Seed all sample data at once
export const seedAllSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    return {
      message: "Run individual seed functions to populate data:",
      functions: [
        "seedLandUseCodes - Land use code reference",
        "seedCodeContent - Building codes and investor guides",
        "seedPOSRequirements - Point of Sale requirements (24 cities)",
        "seedSampleTaxDelinquent - Sample distressed properties",
        "seedSampleSheriffSales - Sample foreclosures",
        "seedSampleCodeViolations - Sample code violations",
        "seedSampleDemographics - Sample demographics",
      ],
    };
  },
});
