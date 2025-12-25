#!/usr/bin/env node
/**
 * Import all regulation code content from regulations_llm_optimized.json
 * Creates ~360+ code content entries (61 jurisdictions x ~6 code types each)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ConvexHttpClient } from "convex/browser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const convexUrl = envContent.match(/CONVEX_URL=(.+)/)?.[1]?.trim();

if (!convexUrl) {
  console.error("CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);
console.log(`Connecting to Convex: ${convexUrl}`);

// Load regulations JSON
const regulationsPath = path.join(__dirname, "../data/regulations_llm_optimized.json");
const regulations = JSON.parse(fs.readFileSync(regulationsPath, "utf-8"));

// Code type descriptions for LLM context
const CODE_TYPE_INFO = {
  building_code: {
    title: "Building Code",
    description: "Commercial and multi-family construction standards based on Ohio Building Code (OBC). Covers structural, fire-resistance, accessibility, and means of egress requirements.",
    investorNotes: "Applies to 3+ unit buildings. More complex than residential code. Plan review required.",
  },
  residential_code: {
    title: "Residential Code", 
    description: "One and two-family dwelling construction standards based on Ohio Residential Code (ORC). Covers egress windows, smoke/CO alarms, stairs, electrical (GFCI/AFCI).",
    investorNotes: "Key items: egress windows in bedrooms (5.7 sq ft), smoke alarms in each bedroom, GFCI in wet areas.",
  },
  fire_code: {
    title: "Fire Code",
    description: "Fire prevention and protection requirements. Covers smoke/CO detectors, fire extinguishers, sprinkler systems, exit signs, emergency lighting.",
    investorNotes: "Smoke detectors required in all bedrooms and hallways. CO detectors on each level. Common POS violation.",
  },
  mechanical_code: {
    title: "Mechanical Code",
    description: "HVAC, ventilation, and exhaust system requirements. Covers equipment sizing, ductwork, combustion air, and exhaust fans.",
    investorNotes: "HVAC replacement typically $5,000-15,000. Ensure proper permits. Dryer vents must exhaust to exterior.",
  },
  plumbing_code: {
    title: "Plumbing Code",
    description: "Water supply, drainage, and fixture requirements. Covers water heaters, backflow prevention, and water-conserving fixtures.",
    investorNotes: "Water heater T&P valve and discharge pipe are common POS items. Check for expansion tank on closed systems.",
  },
  electrical_code: {
    title: "Electrical Code",
    description: "Electrical installation requirements based on NEC 2023. Covers service size, GFCI/AFCI protection, panel requirements.",
    investorNotes: "GFCI required in kitchens, baths, garages, outdoors. AFCI in bedrooms. Budget $3,000-8,000 for panel upgrade.",
  },
  energy_code: {
    title: "Energy Code",
    description: "Energy efficiency requirements for insulation, windows, HVAC efficiency, and air sealing.",
    investorNotes: "New construction and major renovations must meet energy code. May require blower door test.",
  },
  zoning_code: {
    title: "Zoning Code",
    description: "Land use regulations including residential districts, setbacks, height limits, parking requirements, and permitted uses.",
    investorNotes: "CRITICAL: Check zoning before purchasing. Determines if multi-family, ADU, or commercial use is allowed.",
  },
  permitting_information: {
    title: "Permitting Information",
    description: "Building permit requirements, fees, application process, and inspection procedures.",
    investorNotes: "Budget 2-4 weeks for permit approval. Pull permits to avoid issues at resale. Unpermitted work can kill deals.",
  },
  property_maintenance_code: {
    title: "Property Maintenance Code",
    description: "Exterior and interior maintenance standards for existing buildings. Covers structural integrity, weatherproofing, and habitability.",
    investorNotes: "Enforced through Point of Sale inspections and complaints. Common violations: peeling paint, roof damage, broken windows.",
  },
  flood_plain_regulations: {
    title: "Flood Plain Regulations",
    description: "Requirements for construction in flood-prone areas. Covers elevation requirements, flood insurance, and construction methods.",
    investorNotes: "Check FEMA flood maps before purchasing. Flood insurance can be expensive. May limit renovation options.",
  },
  demolition_regulations: {
    title: "Demolition Regulations",
    description: "Requirements for demolishing structures including permits, asbestos abatement, and utility disconnection.",
    investorNotes: "Demolition permits required. Asbestos testing may be needed for pre-1980 buildings. Budget $5,000-20,000 for demo.",
  },
};

// Generate code content entries from regulations
function generateCodeContent(jurisdiction) {
  const entries = [];
  const name = jurisdiction.name;
  const regs = jurisdiction.regulations;
  
  for (const [codeType, reg] of Object.entries(regs)) {
    const info = CODE_TYPE_INFO[codeType];
    if (!info) continue;
    
    // Skip N/A entries for state-level
    if (reg.status === "not_applicable" && jurisdiction.type === "state") continue;
    
    let content, summary;
    
    if (reg.status === "adopts_state") {
      content = `${name} ${info.title}:

STATUS: Adopts Ohio State Code

${name} has adopted the Ohio State ${info.title} without local amendments. All requirements from the state code apply.

${info.description}

For specific requirements, refer to the Ohio State ${info.title}.`;
      summary = `${name} adopts Ohio State ${info.title}. State requirements apply.`;
    } else if (reg.status === "local_code" && reg.url) {
      content = `${name} ${info.title}:

STATUS: Local Code

${name} has its own ${info.title.toLowerCase()} with local requirements and amendments.

${info.description}

SOURCE: ${reg.url}

Contact the ${name} Building Department for specific requirements and interpretations.`;
      summary = `${name} has local ${info.title.toLowerCase()}. See municipal code for specific requirements.`;
    } else if (reg.status === "not_found") {
      content = `${name} ${info.title}:

STATUS: Not Found Online

The ${info.title.toLowerCase()} for ${name} was not found in online sources. Contact the ${name} Building Department directly for requirements.

${info.description}`;
      summary = `${name} ${info.title.toLowerCase()} not found online. Contact building department.`;
    } else if (reg.status === "not_applicable") {
      content = `${name} ${info.title}:

STATUS: Not Applicable / Local Jurisdiction

This code type is handled at the local municipal level in ${name}. Contact the local building department for requirements.`;
      summary = `${name}: ${info.title} handled at local level.`;
    } else {
      continue; // Skip unknown statuses
    }
    
    entries.push({
      municipality: name,
      codeType: codeType.replace(/_/g, "-"),
      section: info.title,
      title: `${name} ${info.title}`,
      content,
      summary,
      investorNotes: info.investorNotes,
      sourceUrl: reg.url || undefined, // Don't pass null, use undefined to omit
    });
  }
  
  return entries;
}

async function main() {
  console.log(`Processing ${regulations.jurisdictions.length} jurisdictions...`);
  
  const allEntries = [];
  for (const jurisdiction of regulations.jurisdictions) {
    const entries = generateCodeContent(jurisdiction);
    allEntries.push(...entries);
  }
  
  console.log(`Generated ${allEntries.length} code content entries`);
  
  // Insert in batches
  const BATCH_SIZE = 20;
  let inserted = 0;
  let skipped = 0;
  
  for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
    const batch = allEntries.slice(i, i + BATCH_SIZE);
    
    for (const entry of batch) {
      try {
        // Check if exists
        const existing = await client.query("codeContent:getByMunicipality", {
          municipality: entry.municipality,
          codeType: entry.codeType,
        });
        
        const alreadyExists = existing.some(e => e.section === entry.section);
        
        if (!alreadyExists) {
          await client.mutation("codeContent:insert", {
            ...entry,
            lastUpdated: Date.now(),
          });
          inserted++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error inserting ${entry.municipality} ${entry.codeType}:`, error.message);
      }
    }
    
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= allEntries.length) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, allEntries.length)} / ${allEntries.length} (inserted: ${inserted}, skipped: ${skipped})`);
    }
  }
  
  console.log(`\n✅ Completed: Inserted ${inserted} entries, skipped ${skipped} existing`);
}

main().catch(console.error);
