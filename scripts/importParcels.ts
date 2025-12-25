/**
 * Parcel Data Import Script
 * 
 * Imports Cuyahoga County parcel data from CSV files into Convex database.
 * 
 * Usage:
 *   npx ts-node scripts/importParcels.ts cleveland
 *   npx ts-node scripts/importParcels.ts non-cleveland
 *   npx ts-node scripts/importParcels.ts land-use-codes
 * 
 * CSV files should be in: /Users/user/Desktop/chat/cuyahoga parcels/
 * 
 * Before running, install csv-parse:
 *   npm install csv-parse
 */

import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";

// Simple CSV parser (no external dependencies)
function parseCSV(content: string): any[] {
  const lines = content.split("\n");
  if (lines.length < 2) return [];
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  const records: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const record: any = {};
    
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || "";
    }
    
    records.push(record);
  }
  
  return records;
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Load environment
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL or VITE_CONVEX_URL environment variable not set");
  console.error("Run: source .env.local or set the variable");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

// CSV column mappings (based on actual CSV headers)
function parseParcelRow(row: any, dataSource: string): any {
  const parseNumber = (val: string | undefined): number | undefined => {
    if (!val || val === "" || val === "null") return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  };

  const parseString = (val: string | undefined): string | undefined => {
    if (!val || val === "" || val === "null") return undefined;
    return val.trim();
  };

  // Extract city from full address or par_city
  const city = parseString(row.par_city) || "UNKNOWN";
  const zipCode = parseString(row.par_zip) || "00000";

  return {
    parcelId: row.parcelpin || row.parcel_id || "",
    parcelPin: parseString(row.parcelpin),
    bookPage: parseString(row.book_page),
    parcelType: parseString(row.parcel_type),
    parcelYear: parseNumber(row.parcel_year),
    
    fullAddress: parseString(row.par_addr_all) || "",
    streetNumber: parseString(row.par_addr),
    streetPredir: parseString(row.par_predir),
    streetName: parseString(row.par_street),
    streetSuffix: parseString(row.par_suffix),
    unit: parseString(row.par_unit),
    city: city.toUpperCase(),
    zipCode: zipCode,
    
    currentOwner: parseString(row.deeded_owner),
    grantee: parseString(row.grantee),
    grantor: parseString(row.grantor),
    
    mailName: parseString(row.mail_name),
    mailAddress: parseString(row.mail_addr_street),
    mailCity: parseString(row.mail_city),
    mailState: parseString(row.mail_state),
    mailZip: parseString(row.mail_zip),
    
    lastSaleDate: parseString(row.transfer_date),
    lastSalePrice: parseNumber(row.sales_amount),
    
    taxLuc: parseString(row.tax_luc),
    taxLucDescription: parseString(row.tax_luc_description),
    extLuc: parseString(row.ext_luc),
    extLucDescription: parseString(row.ext_luc_description),
    zoningCode: parseString(row.zoning_code),
    zoningUse: parseString(row.zoning_use),
    propertyClass: parseString(row.property_class),
    
    taxDistrict: parseString(row.tax_district),
    neighborhoodCode: parseString(row.neighborhood_code),
    
    totalAcreage: parseNumber(row.total_acreage),
    totalSquareFt: parseNumber(row.total_square_ft),
    totalLegalFront: parseNumber(row.total_legal_front),
    
    resBuildingCount: parseNumber(row.res_bldg_count),
    totalResLivingArea: parseNumber(row.total_res_liv_area),
    totalResRooms: parseNumber(row.total_res_rooms),
    comBuildingCount: parseNumber(row.com_bldg_count),
    totalComUseArea: parseNumber(row.total_com_use_area),
    comLivingUnits: parseNumber(row.com_living_units),
    
    certifiedTaxLand: parseNumber(row.certified_tax_land),
    certifiedTaxBuilding: parseNumber(row.certified_tax_building),
    certifiedTaxTotal: parseNumber(row.certified_tax_total),
    certifiedExemptTotal: parseNumber(row.certified_exempt_total),
    certifiedAbatedTotal: parseNumber(row.certified_abated_total),
    grossCertifiedLand: parseNumber(row.gross_certified_land),
    grossCertifiedBuilding: parseNumber(row.gross_certified_building),
    grossCertifiedTotal: parseNumber(row.gross_certified_total),
    taxYear: parseNumber(row.tax_year),
    
    roadType: parseString(row.road_type),
    water: parseString(row.water),
    sewer: parseString(row.sewer),
    gas: parseString(row.gas),
    electricity: parseString(row.electricity),
    
    taxAbatement: parseString(row.tax_abatement),
    condoComplexId: parseString(row.condo_complex_id),
    
    dataSource: dataSource,
    lastUpdated: Date.now(),
  };
}

// Land use codes with investor notes
const LAND_USE_CODES = [
  { code: "5100", description: "1-FAMILY PLATTED LOT", category: "residential", investorNotes: "Single-family home - most common investment property. Good for fix-and-flip or buy-and-hold rental." },
  { code: "5200", description: "2-FAMILY PLATTED LOT", category: "residential", investorNotes: "Duplex - excellent for house hacking or rental income. Two units on one lot." },
  { code: "5300", description: "3-FAMILY PLATTED LOT", category: "residential", investorNotes: "Triplex - multi-family investment. Can qualify for residential financing up to 4 units." },
  { code: "5400", description: "4-FAMILY PLATTED LOT", category: "residential", investorNotes: "Fourplex - maximum units for residential financing. Popular with investors." },
  { code: "5000", description: "RES VACANT LAND", category: "residential", investorNotes: "Vacant residential lot - development opportunity or land banking." },
  { code: "4010", description: "WALK-UP APTS 7-19 U", category: "commercial", investorNotes: "Small apartment building - requires commercial financing. Good cash flow potential." },
  { code: "4020", description: "WALK-UP APTS 20-39 U", category: "commercial", investorNotes: "Medium apartment building - significant investment, professional management recommended." },
  { code: "4080", description: "GARDEN APTS 40+ U", category: "commercial", investorNotes: "Large apartment complex - institutional-grade investment." },
  { code: "4490", description: "ELEVATOR OFFCE >2 ST", category: "commercial", investorNotes: "Office building - commercial real estate, longer lease terms typical." },
  { code: "4585", description: "AUTO REPAIR GARAGE", category: "commercial", investorNotes: "Auto service property - specialized use, environmental considerations." },
  { code: "6100", description: "STATE-OWNED PROP NEC", category: "exempt", investorNotes: "State property - not available for purchase." },
  { code: "6411", description: "CITY-LAND BANK", category: "exempt", investorNotes: "Land bank property - may be available for purchase through land bank program. Often sold at discount." },
  { code: "6601", description: "PARK DIST-METROPARK", category: "exempt", investorNotes: "Park district property - not available for purchase." },
  { code: "7121", description: "CRA TAX ABATEMENT", category: "residential", investorNotes: "Community Reinvestment Area - property has tax abatement. Significant tax savings for investors." },
];

async function importClevelandParcels() {
  const csvPath = path.join(__dirname, "../cuyahoga parcels/Combined_Parcels_-_Cleveland_Only.csv");
  console.log(`Reading Cleveland parcels from: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parseCSV(csvContent);

  console.log(`Parsed ${records.length} Cleveland parcels`);
  
  const BATCH_SIZE = 100;
  let imported = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const parcels = batch.map((row: any) => parseParcelRow(row, "cleveland"));
    
    // Filter out invalid parcels
    const validParcels = parcels.filter((p: any) => p.parcelId && p.fullAddress);
    
    if (validParcels.length > 0) {
      try {
        await client.mutation("parcels:insertParcelBatch" as any, { parcels: validParcels });
        imported += validParcels.length;
        
        if (imported % 1000 === 0) {
          console.log(`Imported ${imported} Cleveland parcels...`);
        }
      } catch (error) {
        console.error(`Error importing batch at ${i}:`, error);
      }
    }
  }
  
  console.log(`✅ Completed: Imported ${imported} Cleveland parcels`);
}

async function importNonClevelandParcels() {
  const csvPath = path.join(__dirname, "../cuyahoga parcels/Combined_Parcels_-_Non-Cleveland_Only.csv");
  console.log(`Reading Non-Cleveland parcels from: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parseCSV(csvContent);

  console.log(`Parsed ${records.length} Non-Cleveland parcels`);
  
  const BATCH_SIZE = 100;
  let imported = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const parcels = batch.map((row: any) => parseParcelRow(row, "non_cleveland"));
    
    // Filter out invalid parcels
    const validParcels = parcels.filter((p: any) => p.parcelId && p.fullAddress);
    
    if (validParcels.length > 0) {
      try {
        await client.mutation("parcels:insertParcelBatch" as any, { parcels: validParcels });
        imported += validParcels.length;
        
        if (imported % 1000 === 0) {
          console.log(`Imported ${imported} Non-Cleveland parcels...`);
        }
      } catch (error) {
        console.error(`Error importing batch at ${i}:`, error);
      }
    }
  }
  
  console.log(`✅ Completed: Imported ${imported} Non-Cleveland parcels`);
}

async function importLandUseCodes() {
  console.log("Importing land use codes...");
  
  try {
    await client.mutation("parcels:insertLandUseCodes" as any, { codes: LAND_USE_CODES });
    console.log(`✅ Imported ${LAND_USE_CODES.length} land use codes`);
  } catch (error) {
    console.error("Error importing land use codes:", error);
  }
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case "cleveland":
      await importClevelandParcels();
      break;
    case "non-cleveland":
      await importNonClevelandParcels();
      break;
    case "land-use-codes":
      await importLandUseCodes();
      break;
    case "all":
      await importLandUseCodes();
      await importClevelandParcels();
      await importNonClevelandParcels();
      break;
    default:
      console.log("Usage: npx ts-node scripts/importParcels.ts <command>");
      console.log("Commands:");
      console.log("  cleveland       - Import Cleveland parcels (~163k)");
      console.log("  non-cleveland   - Import Non-Cleveland parcels (~357k)");
      console.log("  land-use-codes  - Import land use code reference table");
      console.log("  all             - Import everything");
      process.exit(1);
  }
}

main().catch(console.error);
