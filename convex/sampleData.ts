import { mutation } from "./_generated/server";

export const seedData = mutation({
  handler: async (ctx) => {
    // Add sample municipal codes
    const sampleCodes = [
      {
        jurisdiction: "Los Angeles",
        category: "zoning" as const,
        text: "Residential zones R1 require minimum 7,500 sq ft lots with 25-foot front setbacks.",
        embedding: Array(1536).fill(0.1),
      },
      {
        jurisdiction: "Los Angeles", 
        category: "building" as const,
        text: "All structures over 3 stories require seismic retrofitting per Chapter 91 of LAMC.",
        embedding: Array(1536).fill(0.2),
      },
      {
        jurisdiction: "San Francisco",
        category: "zoning" as const,
        text: "Height limits in residential districts vary from 40-65 feet depending on neighborhood character.",
        embedding: Array(1536).fill(0.3),
      },
      {
        jurisdiction: "San Francisco",
        category: "fire" as const,
        text: "Fire access roads must be minimum 20 feet wide with 13.5 foot vertical clearance.",
        embedding: Array(1536).fill(0.4),
      },
    ];

    for (const code of sampleCodes) {
      await ctx.db.insert("muniCodes", code);
    }

    // Add sample architect lore
    const sampleLore = [
      {
        title: "Setback Strategy",
        tip: "Always verify setback requirements with both zoning AND building departments - they sometimes conflict.",
        jurisdiction: "General",
        embedding: Array(1536).fill(0.5),
      },
      {
        title: "Permit Timing",
        tip: "Submit preliminary plans 2-3 weeks before formal application to catch issues early.",
        jurisdiction: "General", 
        embedding: Array(1536).fill(0.6),
      },
      {
        title: "Code Interpretation",
        tip: "When codes are ambiguous, get written clarification from the building official before proceeding.",
        embedding: Array(1536).fill(0.7),
      },
    ];

    for (const lore of sampleLore) {
      await ctx.db.insert("architectLore", lore);
    }

    // Add sample contacts (updated for new schema)
    const sampleContacts = [
      {
        city: "Los Angeles",
        type: "building_dept" as const,
        name: "LA Building & Safety",
        phone: "(213) 482-7077",
        notes: "Main permit counter open 7:30-4:30 M-F",
      },
      {
        city: "Los Angeles",
        type: "contractor" as const,
        name: "Smith Engineering",
        phone: "(213) 555-0123",
        notes: "Structural engineering, seismic retrofits",
      },
      {
        city: "San Francisco",
        type: "planning_dept" as const,
        name: "SF Planning Department",
        phone: "(628) 652-7300",
        notes: "Zoning and planning review",
      },
    ];

    for (const contact of sampleContacts) {
      await ctx.db.insert("contacts", contact);
    }

    return "Sample data seeded successfully";
  },
});
