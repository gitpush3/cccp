import { cronJobs } from "convex/server";

const crons = cronJobs();

// Census Demographics - already loaded for all 48 Cuyahoga County zip codes
// Data is static (ACS 5-year estimates), no need for frequent updates
// Can manually refresh annually via: npx convex run censusData:fetchAllCuyahogaDemographics

export default crons;
