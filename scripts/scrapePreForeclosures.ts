/**
 * Pre-Foreclosure Scraper for Cuyahoga County
 *
 * Scrapes foreclosure case data from the Cuyahoga County Clerk of Courts
 * and updates the preForeclosureEvents table in Convex.
 *
 * Run weekly via: npm run scrape:foreclosures
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import puppeteer, { Browser, Page } from "puppeteer";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONFIG = {
  CONVEX_URL: process.env.VITE_CONVEX_URL || process.env.CONVEX_URL || "",
  FORECLOSURE_SEARCH_URL: "https://cpdocket.cp.cuyahogacounty.gov/SheriffSearch/search.aspx",
  MAX_SALE_DATES: 30,
  DELAY_BETWEEN_REQUESTS: 2500,
  HEADLESS: true,
};

interface ScrapedCase {
  caseNumber: string;
  parcelId?: string;
  address: string;
  city: string;
  defendant?: string;
  plaintiff?: string;
  attorney?: string;
  saleDate?: string;
  status?: string;
  appraisedValue?: number;
  minimumBid?: number;
  propertyType?: string;
  description?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  const mmddyyyy = dateStr.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return undefined;
}

function extractCity(address: string): string {
  const cities = [
    "CLEVELAND", "PARMA", "LAKEWOOD", "EUCLID", "CLEVELAND HEIGHTS",
    "PARMA HEIGHTS", "SHAKER HEIGHTS", "GARFIELD HEIGHTS", "SOUTH EUCLID",
    "MAPLE HEIGHTS", "NORTH OLMSTED", "STRONGSVILLE", "WESTLAKE",
    "NORTH ROYALTON", "SOLON", "BROADVIEW HEIGHTS", "BAY VILLAGE",
    "FAIRVIEW PARK", "ROCKY RIVER", "LYNDHURST", "MAYFIELD HEIGHTS",
    "UNIVERSITY HEIGHTS", "RICHMOND HEIGHTS", "BEDFORD", "BEDFORD HEIGHTS",
    "WARRENSVILLE HEIGHTS", "EAST CLEVELAND", "BEREA", "MIDDLEBURG HEIGHTS",
    "BROOK PARK", "SEVEN HILLS", "INDEPENDENCE", "BROOKLYN", "OLMSTED FALLS",
    "HIGHLAND HEIGHTS", "BEACHWOOD", "PEPPER PIKE", "BRATENAHL",
  ];

  const upperAddress = address.toUpperCase();
  for (const city of cities) {
    if (upperAddress.includes(city)) return city;
  }
  return "CLEVELAND";
}

function determineStage(daysUntilSale: number): string {
  if (daysUntilSale <= 0) return "completed";
  if (daysUntilSale <= 7) return "scheduled";
  if (daysUntilSale <= 21) return "advertising";
  if (daysUntilSale <= 60) return "appraisal";
  if (daysUntilSale <= 90) return "praecipe_filed";
  if (daysUntilSale <= 120) return "decree_issued";
  return "default_motion";
}

class PreForeclosureScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private convex: ConvexHttpClient;
  private stats = { saleDatesProcessed: 0, casesProcessed: 0, errors: 0 };

  constructor() {
    if (!CONFIG.CONVEX_URL) throw new Error("CONVEX_URL not set");
    this.convex = new ConvexHttpClient(CONFIG.CONVEX_URL);
  }

  async initialize(): Promise<void> {
    console.log("Launching browser...");
    this.browser = await puppeteer.launch({
      headless: CONFIG.HEADLESS,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0");
    await this.page.setViewport({ width: 1280, height: 900 });
    console.log("Browser ready");
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeAllSaleDates(): Promise<ScrapedCase[]> {
    if (!this.page) throw new Error("Browser not initialized");
    const allCases: ScrapedCase[] = [];

    console.log("\nNavigating to foreclosure search...");
    await this.page.goto(CONFIG.FORECLOSURE_SEARCH_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(2000);

    // Get sale dates from dropdown
    const saleDates = await this.page.$$eval("select option", (options) => {
      return options
        .map(opt => {
          const text = opt.textContent?.trim() || "";
          const value = opt.getAttribute("value") || "";
          const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          if (dateMatch && value) {
            return { date: dateMatch[1], value, isTax: text.toLowerCase().includes("tax") };
          }
          return null;
        })
        .filter(Boolean);
    });

    console.log(`Found ${saleDates.length} sale dates`);

    // Filter to only future or very recent dates (investor leads)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDates = saleDates.filter(sd => {
      if (!sd) return false;
      const parts = sd.date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!parts) return false;
      const saleDate = new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      // Include dates from 7 days ago (recent sales to track) through future
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return saleDate >= weekAgo;
    });

    console.log(`Filtering to ${futureDates.length} upcoming sale dates\n`);

    for (const saleDate of futureDates.slice(0, CONFIG.MAX_SALE_DATES)) {
      if (!saleDate) continue;

      console.log(`Processing: ${saleDate.date} (${saleDate.isTax ? "Tax" : "Non-Tax"})`);

      try {
        await this.page.goto(CONFIG.FORECLOSURE_SEARCH_URL, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(1000);

        // Select the date from dropdown
        const selectElement = await this.page.$("select");
        if (selectElement) {
          await selectElement.select(saleDate.value);
          await sleep(500);
        }

        // Click search
        const searchButton = await this.page.$('input[value="Start Search"]');
        if (searchButton) {
          await searchButton.click();
          await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
          await sleep(1500);
        }

        // Extract cases using the actual page structure
        const cases = await this.extractCasesFromResults(saleDate.date);

        if (cases.length > 0) {
          console.log(`  ✓ Found ${cases.length} cases`);
          allCases.push(...cases);
        } else {
          console.log(`  - No cases`);
        }

        this.stats.saleDatesProcessed++;
      } catch (err: any) {
        console.error(`  ✗ Error: ${err.message}`);
        this.stats.errors++;
      }

      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS);
    }

    return allCases;
  }

  async extractCasesFromResults(saleDate: string): Promise<ScrapedCase[]> {
    if (!this.page) return [];

    // First, get raw page text to check for case data
    const rawText = await this.page.evaluate(() => document.body.innerText);

    if (!rawText.includes("Case") && !rawText.includes("CV")) {
      return [];
    }

    // Extract data based on the actual page structure
    const pageData = await this.page.evaluate(() => {
      const cases: any[] = [];
      const pageText = document.body.innerText;

      // Try different splitting strategies
      // Look for CV case numbers as anchors
      const cvPattern = /CV[-\s]?\d{2}[-\s]?\d+/gi;
      const cvMatches = pageText.match(cvPattern);

      if (!cvMatches || cvMatches.length === 0) {
        return [];
      }

      // Split by "Case" or by CV numbers
      let caseBlocks: string[] = [];

      // Try splitting by "Case #" first
      if (pageText.includes("Case #")) {
        caseBlocks = pageText.split(/Case\s*#\s*:?\s*/i);
      } else if (pageText.includes("Case:")) {
        caseBlocks = pageText.split(/Case\s*:\s*/i);
      } else {
        // Split by CV numbers directly
        caseBlocks = pageText.split(/(?=CV[-\s]?\d{2}[-\s]?\d+)/i);
      }

      for (let i = 1; i < caseBlocks.length; i++) {
        const block = caseBlocks[i];

        // Extract case number - very flexible pattern
        const caseMatch = block.match(/(CV[-\s]?\d{2}[-\s]?\d+)/i);
        if (!caseMatch) continue;

        const caseNumber = caseMatch[1].toUpperCase().replace(/[\s-]+/g, "");

        // Extract parcel number
        const parcelMatch = block.match(/Parcel[^\d]*([\d]+-[\d]+-[\d]+)/i) ||
                            block.match(/([\d]{3}-[\d]{2}-[\d]{3})/);
        const parcelId = parcelMatch ? parcelMatch[1] : undefined;

        // Extract address - look for street number followed by street name
        let address = "";
        // Pattern 1: After "Address" label
        let addrMatch = block.match(/Address[:\s]+(\d+[^\n]+)/i);
        if (!addrMatch) {
          // Pattern 2: Street number + street type
          addrMatch = block.match(/(\d+\s+[A-Z][A-Z\s]+(?:BLVD|BOULEVARD|AVE|AVENUE|ST|STREET|RD|ROAD|DR|DRIVE|CT|COURT|LN|LANE|WAY|PLACE|PL|PKWY|PARKWAY)[^\n]*)/i);
        }
        if (!addrMatch) {
          // Pattern 3: Any line starting with a number that looks like address
          addrMatch = block.match(/\n\s*(\d{2,5}\s+[A-Z][A-Z\s]+[A-Z])\s*\n/i);
        }
        if (addrMatch) {
          address = addrMatch[1].trim().replace(/\s+/g, " ");
        }

        // Extract defendant - after "VS" or "V."
        const vsMatch = block.match(/(?:VS\.?|V\.)\s+([A-Z][A-Z\s,\/]+?)(?:\n|Parcel|Address|Appraised|Attorney|Case|$)/i);
        const defendant = vsMatch ? vsMatch[1].trim().replace(/[\/,]+/g, ", ").replace(/\s+/g, " ") : undefined;

        // Extract plaintiff - before "VS"
        const plaintiffMatch = block.match(/([A-Z][A-Z\s,\.]+(?:BANK|MORTGAGE|LENDING|ASSOCIATION|LLC|INC|TRUST|COMPANY|CORP|NA|N\.A\.)[\sA-Z,\.]*?)\s+(?:VS\.?|V\.)/i);
        const plaintiff = plaintiffMatch ? plaintiffMatch[1].trim() : undefined;

        // Extract appraised value
        const appraisedMatch = block.match(/Appraised[:\s]*\$?\s*([\d,]+)/i);
        const appraisedValue = appraisedMatch ? parseInt(appraisedMatch[1].replace(/,/g, "")) : undefined;

        // Extract minimum bid
        const minBidMatch = block.match(/Minimum\s*Bid[:\s]*\$?\s*([\d,]+)/i);
        const minimumBid = minBidMatch ? parseInt(minBidMatch[1].replace(/,/g, "")) : undefined;

        // Extract status
        const statusMatch = block.match(/Status[:\s]*([A-Z][A-Z\s]+?)(?:\n|IF|$)/i);
        const status = statusMatch ? statusMatch[1].trim() : undefined;

        // Extract property type / land type
        const typeMatch = block.match(/(?:Land\s*Type|Property)[:\s]*([A-Z][A-Z\s-]+?)(?:\n|$)/i) ||
                          block.match(/(Residential|Commercial|Industrial|Vacant|Single\s*Family|Multi[\s-]?Family)/i);
        const propertyType = typeMatch ? typeMatch[1].trim() : undefined;

        // Extract description
        const descMatch = block.match(/Description[:\s]*([^\n]+)/i);
        const description = descMatch ? descMatch[1].trim() : undefined;

        // Extract attorney
        const attorneyMatch = block.match(/Attorney[:\s]*([A-Z][A-Za-z\s,\.&]+?)(?:\n|Appraised|Minimum|Status|$)/i);
        const attorney = attorneyMatch ? attorneyMatch[1].trim() : undefined;

        // Accept case even with partial data
        cases.push({
          caseNumber,
          parcelId,
          address: address || "",
          defendant,
          plaintiff,
          appraisedValue,
          minimumBid,
          status,
          propertyType,
          description,
          attorney,
          _debug: block.substring(0, 200), // Keep for debugging
        });
      }

      return cases;
    });

    // Filter and process the data
    const validCases = pageData
      .filter((c: any) => c.caseNumber && (c.address || c.parcelId)) // Need case # and either address or parcel
      .map((c: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _debug, ...rest } = c;
        return {
          ...rest,
          city: extractCity(c.address || ""),
          saleDate,
        };
      });

    if (pageData.length > 0 && validCases.length === 0) {
      console.log("    [Debug] Found cases but none passed validation. Sample:");
      console.log(JSON.stringify(pageData[0], null, 2));
    }

    return validCases;
  }

  async processCase(scrapedCase: ScrapedCase): Promise<void> {
    try {
      let daysUntilSale: number | undefined;
      if (scrapedCase.saleDate) {
        const saleDateParsed = parseDate(scrapedCase.saleDate);
        if (saleDateParsed) {
          const saleDate = new Date(saleDateParsed);
          daysUntilSale = Math.ceil((saleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        }
      }

      const currentStage = daysUntilSale !== undefined ? determineStage(daysUntilSale) : "scheduled";

      await this.convex.mutation(api.preForeclosure.upsertPreForeclosure, {
        caseNumber: scrapedCase.caseNumber,
        parcelId: scrapedCase.parcelId,
        address: scrapedCase.address,
        city: scrapedCase.city,
        defendant: scrapedCase.defendant,
        plaintiff: scrapedCase.plaintiff,
        currentStage,
        scheduledSaleDate: parseDate(scrapedCase.saleDate),
        appraisedValue: scrapedCase.appraisedValue,
        propertyType: scrapedCase.propertyType,
        sourceUrl: `https://cpdocket.cp.cuyahogacounty.gov/CV/${scrapedCase.caseNumber}`,
      });

      this.stats.casesProcessed++;
    } catch (error: any) {
      console.error(`    ✗ ${scrapedCase.caseNumber}: ${error.message}`);
      this.stats.errors++;
    }
  }

  async run(): Promise<void> {
    console.log("=".repeat(60));
    console.log("Pre-Foreclosure Scraper - Cuyahoga County");
    console.log(`Time: ${new Date().toISOString()}`);
    console.log("=".repeat(60));

    try {
      await this.initialize();
      const cases = await this.scrapeAllSaleDates();

      console.log(`\n${"=".repeat(60)}`);
      console.log(`Total cases found: ${cases.length}`);
      console.log("=".repeat(60));

      if (cases.length > 0) {
        console.log("\nSaving to database...\n");

        // Group by city for summary
        const byCity: Record<string, number> = {};
        for (const c of cases) {
          byCity[c.city] = (byCity[c.city] || 0) + 1;
        }

        console.log("Cases by city:");
        Object.entries(byCity)
          .sort((a, b) => b[1] - a[1])
          .forEach(([city, count]) => console.log(`  ${city}: ${count}`));

        console.log("\nSaving cases...");
        for (const scrapedCase of cases) {
          await this.processCase(scrapedCase);
        }
      }
    } catch (error) {
      console.error("Scraper error:", error);
      this.stats.errors++;
    } finally {
      await this.close();
    }

    console.log("\n" + "=".repeat(60));
    console.log("Complete!");
    console.log("=".repeat(60));
    console.log(`Sale Dates: ${this.stats.saleDatesProcessed}`);
    console.log(`Cases Saved: ${this.stats.casesProcessed}`);
    console.log(`Errors: ${this.stats.errors}`);
  }
}

async function main() {
  const scraper = new PreForeclosureScraper();
  await scraper.run();
}

main().catch(console.error);
