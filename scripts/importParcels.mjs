/**
 * Parcel Data Import Script (ESM version)
 * 
 * Usage:
 *   node scripts/importParcels.mjs cleveland
 *   node scripts/importParcels.mjs non-cleveland
 *   node scripts/importParcels.mjs all
 */

import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from .env.local
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envLines = envContent.split("\n");
for (const line of envLines) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL not found in .env.local");
  process.exit(1);
}

console.log("Connecting to Convex:", CONVEX_URL);
const client = new ConvexHttpClient(CONVEX_URL);

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split("\n");
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const record = {};
    
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || "";
    }
    
    records.push(record);
  }
  
  return records;
}

function parseCSVLine(line) {
  const result = [];
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

function parseNumber(val) {
  if (!val || val === "" || val === "null") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
}

function parseString(val) {
  if (!val || val === "" || val === "null") return undefined;
  return val.trim();
}

function parseParcelRow(row, dataSource) {
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

async function importClevelandParcels() {
  const csvPath = path.join(__dirname, "../cuyahoga parcels/Combined_Parcels_-_Cleveland_Only.csv");
  console.log(`Reading Cleveland parcels from: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parseCSV(csvContent);

  console.log(`Parsed ${records.length} Cleveland parcels`);
  
  const BATCH_SIZE = 100; // Larger batches for Pro tier
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const parcels = batch.map((row) => parseParcelRow(row, "cleveland"));
    
    // Filter out invalid parcels
    const validParcels = parcels.filter((p) => p.parcelId && p.fullAddress);
    
    if (validParcels.length > 0) {
      try {
        await client.mutation("parcels:insertParcelBatch", { parcels: validParcels });
        imported += validParcels.length;
        
        if (imported % 5000 === 0) {
          console.log(`Imported ${imported} / ${records.length} Cleveland parcels...`);
        }
      } catch (error) {
        errors++;
        console.error(`Error at ${i}: ${error.message}`);
        // Brief delay on error then retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  
  console.log(`✅ Completed: Imported ${imported} Cleveland parcels (${errors} batch errors)`);
}

async function importNonClevelandParcels() {
  const csvPath = path.join(__dirname, "../cuyahoga parcels/Combined_Parcels_-_Non-Cleveland_Only.csv");
  console.log(`Reading Non-Cleveland parcels from: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parseCSV(csvContent);

  console.log(`Parsed ${records.length} Non-Cleveland parcels`);
  
  const BATCH_SIZE = 100; // Larger batches for Pro tier
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const parcels = batch.map((row) => parseParcelRow(row, "non_cleveland"));
    
    // Filter out invalid parcels
    const validParcels = parcels.filter((p) => p.parcelId && p.fullAddress);
    
    if (validParcels.length > 0) {
      try {
        await client.mutation("parcels:insertParcelBatch", { parcels: validParcels });
        imported += validParcels.length;
        
        if (imported % 5000 === 0) {
          console.log(`Imported ${imported} / ${records.length} Non-Cleveland parcels...`);
        }
      } catch (error) {
        errors++;
        console.error(`Error at ${i}: ${error.message}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  
  console.log(`✅ Completed: Imported ${imported} Non-Cleveland parcels (${errors} batch errors)`);
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
    case "all":
      await importClevelandParcels();
      await importNonClevelandParcels();
      break;
    default:
      console.log("Usage: node scripts/importParcels.mjs <command>");
      console.log("Commands:");
      console.log("  cleveland       - Import Cleveland parcels (~163k)");
      console.log("  non-cleveland   - Import Non-Cleveland parcels (~357k)");
      console.log("  all             - Import everything");
      process.exit(1);
  }
}

main().catch(console.error);
