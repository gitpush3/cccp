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

export default crons;
