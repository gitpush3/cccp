/**
 * Import Cuyahoga County Parcel Data into Convex
 * 
 * This script reads the downloaded CSV files and imports them into the Convex database.
 * 
 * Usage:
 *   1. Download CSV files from Cuyahoga County GIS Hub:
 *      - Cleveland: https://geospatial.gis.cuyahogacounty.gov/datasets/cuyahoga::combined-parcels-cleveland-only/
 *      - Non-Cleveland: https://geospatial.gis.cuyahogacounty.gov/datasets/cuyahoga::combined-parcels-non-cleveland-only/
 *   
 *   2. Place CSV files in the data/ directory
 *   
 *   3. Run this script:
 *      npx convex run scripts/importParcels:importFromCSV --csvPath "./data/Cleveland_Parcels.csv"
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import * as fs from "fs";
import * as csv from "csv-parser";

// Helper function to parse CSV and convert to parcel records
function parseCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        // Map CSV columns to our schema
        const parcel = {
          parcelId: row.PARCEL_ID || row.PARCELPIN,
          parcelPin: row.PARCELPIN,
          bookPage: row.BOOK_PAGE,
          parcelType: row.PARCEL_TYPE,
          parcelYear: row.PARCEL_YEAR ? parseInt(row.PARCEL_YEAR) : undefined,
          
          // Address
          fullAddress: row.PAR_ADDR_ALL || "",
          streetNumber: row.PAR_ADDR,
          streetName: row.PAR_STREET,
          city: row.PAR_CITY,
          zipCode: row.PAR_ZIP,
          unit: row.PAR_UNIT,
          
          // Ownership
          currentOwner: row.PARCEL_OWNER,
          deedOwner: row.DEEDED_OWNER,
          grantee: row.GRANTEE,
          grantor: row.GRANTOR,
          
          // Mailing
          mailName: row.MAIL_NAME,
          mailAddress: row.MAIL_ADDR_STREET,
          mailCity: row.MAIL_CITY,
          mailState: row.MAIL_STATE,
          mailZip: row.MAIL_ZIP,
          
          // Sales
          lastSaleDate: row.TRANSFER_DATE ? new Date(row.TRANSFER_DATE).getTime() : undefined,
          lastSalePrice: row.SALE_PRICE ? parseFloat(row.SALE_PRICE) : undefined,
          saleType: row.SALE_TYPE,
          
          // Property characteristics
          landUseCode: row.LAND_USE || row.CERTIFIED_TAX_LUC,
          landUseDescription: row.LUC_DESCRIPTION,
          totalAcreage: row.TOTAL_ACREAGE ? parseFloat(row.TOTAL_ACREAGE) : undefined,
          totalLandSqFt: row.TOTAL_LAND_SF ? parseFloat(row.TOTAL_LAND_SF) : undefined,
          
          // Building
          resBuildingCount: row.RES_BLDG_COUNT ? parseInt(row.RES_BLDG_COUNT) : undefined,
          comBuildingCount: row.COM_BLDG_COUNT ? parseInt(row.COM_BLDG_COUNT) : undefined,
          resLivingUnits: row.RES_LIVING_UNITS ? parseInt(row.RES_LIVING_UNITS) : undefined,
          comLivingUnits: row.COM_LIVING_UNITS ? parseInt(row.COM_LIVING_UNITS) : undefined,
          yearBuilt: row.YEAR_BUILT ? parseInt(row.YEAR_BUILT) : undefined,
          stories: row.STORIES ? parseFloat(row.STORIES) : undefined,
          style: row.STYLE,
          bedrooms: row.BEDROOMS ? parseInt(row.BEDROOMS) : undefined,
          bathrooms: row.BATHROOMS ? parseFloat(row.BATHROOMS) : undefined,
          totalLivingArea: row.TOTAL_LIVING_AREA ? parseInt(row.TOTAL_LIVING_AREA) : undefined,
          
          // Valuation
          certifiedTaxLand: row.CERTIFIED_TAX_LAND ? parseFloat(row.CERTIFIED_TAX_LAND) : undefined,
          certifiedTaxBuilding: row.CERTIFIED_TAX_BUILDING ? parseFloat(row.CERTIFIED_TAX_BUILDING) : undefined,
          certifiedTaxTotal: row.CERTIFIED_TAX_TOTAL ? parseFloat(row.CERTIFIED_TAX_TOTAL) : undefined,
          certifiedExemptLand: row.CERTIFIED_EXEMPT_LAND ? parseFloat(row.CERTIFIED_EXEMPT_LAND) : undefined,
          certifiedExemptBuilding: row.CERTIFIED_EXEMPT_BUILDING ? parseFloat(row.CERTIFIED_EXEMPT_BUILDING) : undefined,
          certifiedAbatedLand: row.CERTIFIED_ABATED_LAND ? parseFloat(row.CERTIFIED_ABATED_LAND) : undefined,
          certifiedAbatedBuilding: row.CERTIFIED_ABATED_BUILDING ? parseFloat(row.CERTIFIED_ABATED_BUILDING) : undefined,
          grossCertifiedTotal: row.GROSS_CERTIFIED_TOTAL ? parseFloat(row.GROSS_CERTIFIED_TOTAL) : undefined,
          
          // Utilities
          electricity: row.ELECTRICITY === "Y",
          gas: row.GAS === "Y",
          sewer: row.SEWER === "Y",
          water: row.WATER === "Y",
          
          // Appraisal
          neighborhoodCode: row.NEIGHBORHOOD_CODE,
          
          // Metadata
          dataSource: "cuyahoga_county",
          lastUpdated: Date.now(),
        };
        
        results.push(parcel);
      })
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

// Mutation to insert parcels in batches
export const insertParcelBatch = internalMutation({
  args: {
    parcels: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const insertedIds = [];
    
    for (const parcel of args.parcels) {
      const id = await ctx.db.insert("parcels", parcel);
      insertedIds.push(id);
    }
    
    return {
      count: insertedIds.length,
      ids: insertedIds,
    };
  },
});

// Main import function (run from command line)
export const importFromCSV = internalMutation({
  args: {
    csvPath: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;
    
    console.log(`Reading CSV from ${args.csvPath}...`);
    const parcels = await parseCSV(args.csvPath);
    console.log(`Parsed ${parcels.length} parcels`);
    
    // Insert in batches
    let totalInserted = 0;
    for (let i = 0; i < parcels.length; i += batchSize) {
      const batch = parcels.slice(i, i + batchSize);
      const result = await ctx.runMutation(api.scripts.importParcels.insertParcelBatch, {
        parcels: batch,
      });
      totalInserted += result.count;
      
      if (totalInserted % 1000 === 0) {
        console.log(`Inserted ${totalInserted} / ${parcels.length} parcels...`);
      }
    }
    
    console.log(`✓ Import complete! Inserted ${totalInserted} parcels`);
    
    return {
      totalParcels: parcels.length,
      inserted: totalInserted,
    };
  },
});

// Clear all parcels (use with caution!)
export const clearAllParcels = internalMutation({
  handler: async (ctx) => {
    const parcels = await ctx.db.query("parcels").collect();
    
    for (const parcel of parcels) {
      await ctx.db.delete(parcel._id);
    }
    
    return {
      deleted: parcels.length,
    };
  },
});
