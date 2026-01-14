import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Census Demographics - already loaded for all 48 Cuyahoga County zip codes
// Data is static (ACS 5-year estimates), no need for frequent updates
// Can manually refresh annually via: npx convex run censusData:fetchAllCuyahogaDemographics

// Payouts - process pending referral commissions daily
crons.daily(
  "process-referral-payouts",
  { hourUTC: 8, minuteUTC: 0 }, // 8:00 AM UTC
  internal.stripe.processAllPendingPayouts
);

// Weekly data refresh - Sundays at 2 AM UTC (9 PM EST Saturday)
// This triggers external scraper via webhook or internal refresh
// To connect n8n: Set N8N_WEBHOOK_URL env var and create workflow that:
//   1. Scrapes Cuyahoga County Fiscal Office for tax delinquent data
//   2. Scrapes Sheriff Sale auction site for upcoming foreclosures
//   3. POSTs data back to Convex via dataImports:importTaxDelinquentBatch
crons.weekly(
  "weekly-data-refresh",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.dataImports.triggerWeeklyRefresh
);

export default crons;
