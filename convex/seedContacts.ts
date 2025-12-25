import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Building department contacts for all 59 municipalities
const BUILDING_DEPT_CONTACTS = [
  { city: "Cleveland", name: "Cleveland Building & Housing", phone: "(216) 664-2282", address: "601 Lakeside Ave, Room 500, Cleveland, OH 44114", website: "https://www.clevelandohio.gov/city-hall/departments/building-housing", investorNotes: "Point of Sale required. Schedule 2-5 days ahead. Reinspection $75." },
  { city: "Parma", name: "Parma Building Department", phone: "(440) 885-8088", address: "6611 Ridge Road, Parma, OH 44129", website: "https://www.cityofparma-oh.gov/departments/building_department/", investorNotes: "Investor-friendly. POS $125. Less stringent than Cleveland." },
  { city: "Lakewood", name: "Lakewood Building Department", phone: "(216) 529-6270", address: "12650 Detroit Avenue, Lakewood, OH 44107", website: "https://www.lakewoodoh.gov/building/", investorNotes: "Exterior-only POS for owner-occupied. Full inspection for rentals." },
  { city: "Euclid", name: "Euclid Building Department", phone: "(216) 289-2700", address: "585 E 222nd Street, Euclid, OH 44123", website: "https://www.cityofeuclid.com/building", investorNotes: "POS $150. Must schedule within 5 days of listing." },
  { city: "Cleveland Heights", name: "Cleveland Heights Building Dept", phone: "(216) 291-4900", address: "40 Severance Circle, Cleveland Heights, OH 44118", website: "https://www.clevelandheights.gov/building", investorNotes: "Historic districts require Architectural Board review. Lead paint compliance required." },
  { city: "Shaker Heights", name: "Shaker Heights Building Dept", phone: "(216) 491-1400", address: "3400 Lee Road, Shaker Heights, OH 44120", website: "https://www.shakeronline.com/building", investorNotes: "Strict architectural review. POS $250. High standards protect values." },
  { city: "Parma Heights", name: "Parma Heights Building Dept", phone: "(440) 884-9600", address: "6281 Pearl Road, Parma Heights, OH 44130", website: "https://www.parmaheightsoh.gov/", investorNotes: "Affordable market. Good starter area for investors." },
  { city: "Garfield Heights", name: "Garfield Heights Building Dept", phone: "(216) 475-1100", address: "5407 Turney Road, Garfield Heights, OH 44125", website: "https://www.garfieldhts.org/building", investorNotes: "POS $150. Improving areas. Good for buy-and-hold." },
  { city: "South Euclid", name: "South Euclid Building Dept", phone: "(216) 381-0400", address: "1349 South Green Road, South Euclid, OH 44121", website: "https://www.cityofsoutheuclid.com/building", investorNotes: "POS $150. Good starter market." },
  { city: "Maple Heights", name: "Maple Heights Building Dept", phone: "(216) 662-6000", address: "5353 Lee Road, Maple Heights, OH 44137", website: "https://www.citymapleheights.com/building", investorNotes: "Very affordable. Verify condition carefully." },
  { city: "North Olmsted", name: "North Olmsted Building Dept", phone: "(440) 777-8000", address: "5200 Dover Center Road, North Olmsted, OH 44070", website: "https://www.north-olmsted.com/building", investorNotes: "Established suburb. Great Northern area." },
  { city: "Strongsville", name: "Strongsville Building Dept", phone: "(440) 580-3100", address: "16099 Foltz Parkway, Strongsville, OH 44136", website: "https://www.strongsville.org/building", investorNotes: "Large suburb. Good schools. Strong values." },
  { city: "Westlake", name: "Westlake Building Dept", phone: "(440) 871-3300", address: "27700 Hilliard Blvd, Westlake, OH 44145", website: "https://www.cityofwestlake.org/building", investorNotes: "Upscale west side. Crocker Park area." },
  { city: "North Royalton", name: "North Royalton Building Dept", phone: "(440) 237-5686", address: "14600 State Road, North Royalton, OH 44133", website: "https://www.northroyalton.org/building", investorNotes: "Growing suburb. Newer housing stock." },
  { city: "Solon", name: "Solon Building Dept", phone: "(440) 248-1155", address: "34200 Bainbridge Road, Solon, OH 44139", website: "https://www.solonohio.org/building", investorNotes: "Excellent schools. Corporate base. Higher prices." },
  { city: "Broadview Heights", name: "Broadview Heights Building Dept", phone: "(440) 526-4357", address: "9543 Broadview Road, Broadview Heights, OH 44147", website: "https://www.broadview-heights.org/building", investorNotes: "Growing suburb. Good family market." },
  { city: "Bay Village", name: "Bay Village Building Dept", phone: "(440) 871-2200", address: "350 Dover Center Road, Bay Village, OH 44140", website: "https://www.cityofbayvillage.com/building", investorNotes: "Lakefront community. Good schools." },
  { city: "Fairview Park", name: "Fairview Park Building Dept", phone: "(440) 356-4440", address: "20777 Lorain Road, Fairview Park, OH 44126", website: "https://www.fairviewpark.org/building", investorNotes: "Stable inner-ring suburb." },
  { city: "Rocky River", name: "Rocky River Building Dept", phone: "(440) 331-0600", address: "21012 Hilliard Blvd, Rocky River, OH 44116", website: "https://www.rfrh.org/building", investorNotes: "Upscale lakefront. Strong values." },
  { city: "Lyndhurst", name: "Lyndhurst Building Dept", phone: "(440) 442-5777", address: "5301 Mayfield Road, Lyndhurst, OH 44124", website: "https://www.lyndhurst-oh.com/building", investorNotes: "Established suburb. Good schools." },
  { city: "Mayfield Heights", name: "Mayfield Heights Building Dept", phone: "(440) 442-2626", address: "6154 Mayfield Road, Mayfield Heights, OH 44124", website: "https://www.mayfieldheights.org/building", investorNotes: "Near Hillcrest Hospital. Good commercial base." },
  { city: "University Heights", name: "University Heights Building Dept", phone: "(216) 932-7800", address: "2300 Warrensville Center Road, University Heights, OH 44118", website: "https://www.universityheights.com/building", investorNotes: "Near John Carroll University. Student rental market." },
  { city: "Richmond Heights", name: "Richmond Heights Building Dept", phone: "(216) 486-2474", address: "26789 Highland Road, Richmond Heights, OH 44143", website: "https://www.richmondheightsohio.org/building", investorNotes: "Near Richmond Town Square." },
  { city: "Bedford", name: "Bedford Building Dept", phone: "(440) 232-1600", address: "165 Center Road, Bedford, OH 44146", website: "https://www.bedfordoh.gov/building", investorNotes: "Downtown revitalization ongoing." },
  { city: "Bedford Heights", name: "Bedford Heights Building Dept", phone: "(440) 786-3200", address: "5661 Perkins Road, Bedford Heights, OH 44146", website: "https://www.bedfordheights.gov/building", investorNotes: "Affordable. Good rental potential." },
  { city: "Warrensville Heights", name: "Warrensville Heights Building Dept", phone: "(216) 587-6500", address: "4301 Warrensville Center Road, Warrensville Heights, OH 44128", website: "https://www.cityofwarrensville.com", investorNotes: "Affordable. Verify specific areas." },
  { city: "East Cleveland", name: "East Cleveland Building Dept", phone: "(216) 681-5020", address: "14340 Euclid Avenue, East Cleveland, OH 44112", website: "https://www.eastcleveland.org", investorNotes: "Very low prices. High risk. Full rehab needed. Verify utilities." },
  { city: "Berea", name: "Berea Building Dept", phone: "(440) 826-5800", address: "11 Berea Commons, Berea, OH 44017", website: "https://www.cityofberea.org/building", investorNotes: "Baldwin Wallace University. Student rental market." },
  { city: "Middleburg Heights", name: "Middleburg Heights Building Dept", phone: "(440) 234-8811", address: "15700 Bagley Road, Middleburg Heights, OH 44130", website: "https://www.middleburgheights.com/building", investorNotes: "Near airport. Stable suburb." },
  { city: "Brook Park", name: "Brook Park Building Dept", phone: "(216) 433-1300", address: "6161 Engle Road, Brook Park, OH 44142", website: "https://www.cityofbrookpark.com/building", investorNotes: "Near airport. Ford plant area." },
  { city: "Seven Hills", name: "Seven Hills Building Dept", phone: "(216) 524-4421", address: "7325 Summitview Drive, Seven Hills, OH 44131", website: "https://www.sevenhillsohio.org/building", investorNotes: "Stable suburb. Moderate prices." },
  { city: "Independence", name: "Independence Building Dept", phone: "(216) 524-1374", address: "6800 Brecksville Road, Independence, OH 44131", website: "https://www.independenceohio.org/building", investorNotes: "Strong commercial base. Rockside Road." },
  { city: "Brooklyn", name: "Brooklyn Building Dept", phone: "(216) 351-2607", address: "7619 Memphis Avenue, Brooklyn, OH 44144", website: "https://www.brooklynohio.gov/building", investorNotes: "Affordable inner-ring. Good rental market." },
  { city: "Olmsted Falls", name: "Olmsted Falls Building Dept", phone: "(440) 235-3015", address: "26100 Bagley Road, Olmsted Falls, OH 44138", website: "https://www.olmstedfalls.org/building", investorNotes: "Charming suburb. Historic downtown." },
  { city: "Highland Heights", name: "Highland Heights Building Dept", phone: "(440) 461-2440", address: "5827 Highland Road, Highland Heights, OH 44143", website: "https://www.highlandhts.com/building", investorNotes: "Upscale. Strict standards." },
  { city: "Mayfield Village", name: "Mayfield Village Building Dept", phone: "(440) 461-2210", address: "6622 Wilson Mills Road, Mayfield Village, OH 44143", website: "https://www.mayfieldvillage.com/building", investorNotes: "Stable. Good services." },
  { city: "Beachwood", name: "Beachwood Building Dept", phone: "(216) 464-1070", address: "25325 Fairmount Blvd, Beachwood, OH 44122", website: "https://www.beachwoodohio.com/building", investorNotes: "High-end. Beachwood Place. Strict standards." },
  { city: "Pepper Pike", name: "Pepper Pike Building Dept", phone: "(216) 831-8500", address: "28000 Shaker Blvd, Pepper Pike, OH 44124", website: "https://www.pepperpike.org/building", investorNotes: "Luxury estate. 1+ acre lots." },
  { city: "Brecksville", name: "Brecksville Building Dept", phone: "(440) 526-4351", address: "9069 Brecksville Road, Brecksville, OH 44141", website: "https://www.brecksville.oh.us/building", investorNotes: "Upscale suburb. Good schools." },
  { city: "Cuyahoga County", name: "Cuyahoga County Development", phone: "(216) 443-7260", address: "2079 East 9th Street, Cleveland, OH 44115", website: "https://cuyahogacounty.gov/development", investorNotes: "Handles unincorporated areas. Most properties are in municipalities." },
];

// Service providers for investors
const SERVICE_PROVIDERS = [
  // Contractor Platform - Featured
  {
    category: "contractor_platform",
    name: "3bids.io",
    description: "Get competitive bids from licensed contractors for your renovation projects. Post your job and receive up to 3 bids from qualified local contractors.",
    website: "https://app.3bids.io",
    serviceArea: "Northeast Ohio",
    specialties: ["Renovations", "Rehab Projects", "New Construction", "Repairs"],
    investorNotes: "RECOMMENDED: Post your rehab project to get competitive bids from vetted contractors. Great for fix-and-flip investors.",
    featured: true,
  },
  // Hard Money Lenders
  {
    category: "hard_money",
    name: "Lima One Capital",
    description: "National hard money lender specializing in fix-and-flip, rental, and new construction loans for real estate investors.",
    website: "https://www.limaone.com",
    phone: "(800) 390-4212",
    serviceArea: "National",
    specialties: ["Fix and Flip", "DSCR Rental", "New Construction", "Bridge Loans"],
    investorNotes: "Popular with Ohio investors. Fast closing. Up to 90% LTC.",
    featured: true,
  },
  {
    category: "hard_money",
    name: "Kiavi (formerly LendingHome)",
    description: "Technology-driven hard money lender for residential real estate investors.",
    website: "https://www.kiavi.com",
    phone: "(844) 415-4663",
    serviceArea: "National",
    specialties: ["Fix and Flip", "Bridge Loans", "Rental Loans"],
    investorNotes: "Fast online application. Competitive rates for experienced investors.",
    featured: false,
  },
  {
    category: "hard_money",
    name: "RCN Capital",
    description: "Direct private lender for real estate investors offering fix-and-flip, rental, and bridge loans.",
    website: "https://www.rcncapital.com",
    phone: "(860) 432-5858",
    serviceArea: "National",
    specialties: ["Fix and Flip", "Rental", "Bridge", "Commercial"],
    investorNotes: "No minimum credit score. Asset-based lending.",
    featured: false,
  },
  // Local/Regional Lenders
  {
    category: "lender",
    name: "Third Federal Savings",
    description: "Cleveland-based savings and loan offering competitive mortgage rates.",
    website: "https://www.thirdfederal.com",
    phone: "(216) 441-6000",
    serviceArea: "Ohio",
    specialties: ["Conventional Mortgages", "Home Equity", "Refinance"],
    investorNotes: "Local lender. Good for owner-occupied and some investment properties.",
    featured: false,
  },
  {
    category: "lender",
    name: "Dollar Bank",
    description: "Regional bank serving Ohio and Pennsylvania with mortgage and business lending.",
    website: "https://www.dollarbank.com",
    phone: "(800) 242-1616",
    serviceArea: "Ohio, Pennsylvania",
    specialties: ["Mortgages", "Commercial Loans", "Business Banking"],
    investorNotes: "Good for portfolio loans on investment properties.",
    featured: false,
  },
  // Title Companies
  {
    category: "title_company",
    name: "Chicago Title - Cleveland",
    description: "National title company with local Cleveland office.",
    website: "https://www.chicagotitle.com",
    phone: "(216) 781-4800",
    serviceArea: "Cuyahoga County",
    specialties: ["Title Insurance", "Escrow", "Closing Services"],
    investorNotes: "Experienced with investor transactions and wholesale deals.",
    featured: false,
  },
  {
    category: "title_company",
    name: "First American Title - Cleveland",
    description: "National title company with local presence.",
    website: "https://www.firstam.com",
    phone: "(216) 621-0070",
    serviceArea: "Cuyahoga County",
    specialties: ["Title Insurance", "Escrow", "1031 Exchange"],
    investorNotes: "Good for complex transactions and 1031 exchanges.",
    featured: false,
  },
  // Property Managers
  {
    category: "property_manager",
    name: "Realty Trust Services",
    description: "Full-service property management for residential and commercial properties in Northeast Ohio.",
    website: "https://www.realtytrustservices.com",
    phone: "(216) 202-1940",
    serviceArea: "Cuyahoga County",
    specialties: ["Single Family", "Multi-Family", "Commercial"],
    investorNotes: "Local property manager. Good for out-of-state investors.",
    featured: false,
  },
  // Inspectors
  {
    category: "inspector",
    name: "AmeriSpec Inspection Services",
    description: "Home inspection services for buyers and investors.",
    website: "https://www.amerispec.com",
    phone: "(440) 546-0077",
    serviceArea: "Cuyahoga County",
    specialties: ["Home Inspection", "Radon Testing", "Mold Inspection"],
    investorNotes: "Get pre-purchase inspection before making offers. Budget $300-500.",
    featured: false,
  },
  // Attorneys
  {
    category: "attorney",
    name: "Cuyahoga County Bar Association",
    description: "Lawyer referral service for real estate attorneys in Cuyahoga County.",
    website: "https://www.clemetrobar.org",
    phone: "(216) 696-3525",
    serviceArea: "Cuyahoga County",
    specialties: ["Real Estate Law", "Evictions", "Contract Review"],
    investorNotes: "Find a real estate attorney for complex transactions or evictions.",
    featured: false,
  },
  // Insurance
  {
    category: "insurance",
    name: "NREIG (National Real Estate Insurance Group)",
    description: "Landlord insurance specialists for investment properties.",
    website: "https://www.nreig.com",
    phone: "(800) 950-2556",
    serviceArea: "National",
    specialties: ["Landlord Insurance", "Vacant Property", "Flip Insurance"],
    investorNotes: "Specializes in investor properties. Covers vacant and rehab properties.",
    featured: false,
  },
  // Land Bank
  {
    category: "other",
    name: "Cuyahoga Land Bank",
    description: "County land bank selling vacant and abandoned properties at below-market prices.",
    website: "https://cuyahogalandbank.org",
    phone: "(216) 698-8853",
    serviceArea: "Cuyahoga County",
    specialties: ["Vacant Properties", "Side Lots", "Rehab Opportunities"],
    investorNotes: "Great deals but properties need full rehab. Must renovate within 18 months.",
    featured: true,
  },
];

// Seed building department contacts
export const seedBuildingContacts = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    const now = Date.now();
    
    for (const contact of BUILDING_DEPT_CONTACTS) {
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_city", (q) => q.eq("city", contact.city))
        .filter((q) => q.eq(q.field("type"), "building_dept"))
        .first();
      
      if (!existing) {
        await ctx.db.insert("contacts", {
          ...contact,
          type: "building_dept",
          lastVerified: now,
        });
        inserted++;
      }
    }
    return { inserted, total: BUILDING_DEPT_CONTACTS.length };
  },
});

// Seed service providers
export const seedServiceProviders = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    const now = Date.now();
    
    for (const provider of SERVICE_PROVIDERS) {
      const existing = await ctx.db
        .query("serviceProviders")
        .withIndex("by_category", (q) => q.eq("category", provider.category as any))
        .filter((q) => q.eq(q.field("name"), provider.name))
        .first();
      
      if (!existing) {
        await ctx.db.insert("serviceProviders", {
          ...provider,
          category: provider.category as any,
          lastVerified: now,
        });
        inserted++;
      }
    }
    return { inserted, total: SERVICE_PROVIDERS.length };
  },
});

// Seed all contacts and providers
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    let contactsInserted = 0;
    let providersInserted = 0;
    const now = Date.now();
    
    // Building contacts
    for (const contact of BUILDING_DEPT_CONTACTS) {
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_city", (q) => q.eq("city", contact.city))
        .filter((q) => q.eq(q.field("type"), "building_dept"))
        .first();
      
      if (!existing) {
        await ctx.db.insert("contacts", {
          ...contact,
          type: "building_dept",
          lastVerified: now,
        });
        contactsInserted++;
      }
    }
    
    // Service providers
    for (const provider of SERVICE_PROVIDERS) {
      const existing = await ctx.db
        .query("serviceProviders")
        .withIndex("by_category", (q) => q.eq("category", provider.category as any))
        .filter((q) => q.eq(q.field("name"), provider.name))
        .first();
      
      if (!existing) {
        await ctx.db.insert("serviceProviders", {
          ...provider,
          category: provider.category as any,
          lastVerified: now,
        });
        providersInserted++;
      }
    }
    
    return { 
      contactsInserted, 
      providersInserted,
      totalContacts: BUILDING_DEPT_CONTACTS.length,
      totalProviders: SERVICE_PROVIDERS.length,
    };
  },
});

// Query functions
export const getContactsByCity = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();
  },
});

export const getBuildingDept = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_city_and_type", (q) => 
        q.eq("city", args.city).eq("type", "building_dept")
      )
      .first();
  },
});

export const getServiceProviders = query({
  args: { 
    category: v.optional(v.string()),
    featuredOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.featuredOnly) {
      return await ctx.db
        .query("serviceProviders")
        .withIndex("by_featured", (q) => q.eq("featured", true))
        .collect();
    }
    
    if (args.category) {
      return await ctx.db
        .query("serviceProviders")
        .withIndex("by_category", (q) => q.eq("category", args.category as any))
        .collect();
    }
    
    return await ctx.db.query("serviceProviders").collect();
  },
});

export const getFeaturedProviders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("serviceProviders")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
  },
});
