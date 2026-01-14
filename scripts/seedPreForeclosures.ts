/**
 * Seed Pre-Foreclosure Data
 *
 * Populates the preForeclosureEvents table with sample data for testing.
 * Run: npm run seed:foreclosures
 */

import { config } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Load environment variables from .env.local
config({ path: ".env.local" });

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL || "";

if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL not set. Add to .env.local or environment.");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

// Helper to generate dates relative to today
function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

// Sample pre-foreclosure data across different stages
const SAMPLE_DATA = [
  // LAKEWOOD - Various stages
  {
    caseNumber: "CV-24-956789",
    address: "1234 LAKE AVE",
    city: "LAKEWOOD",
    zipCode: "44107",
    defendant: "JOHNSON, MICHAEL R",
    plaintiff: "BANK OF AMERICA NA",
    currentStage: "lis_pendens",
    lisPendensDate: daysAgo(14),
    complaintFiledDate: daysAgo(10),
    estimatedValue: 185000,
  },
  {
    caseNumber: "CV-24-945678",
    address: "15678 DETROIT AVE",
    city: "LAKEWOOD",
    zipCode: "44107",
    defendant: "SMITH, PATRICIA A",
    plaintiff: "WELLS FARGO BANK NA",
    currentStage: "summons_served",
    lisPendensDate: daysAgo(45),
    complaintFiledDate: daysAgo(42),
    summonsServedDate: daysAgo(30),
    answerDeadline: daysAgo(2),
    answerFiled: false, // Owner didn't respond - motivated!
    estimatedValue: 165000,
  },
  {
    caseNumber: "CV-24-934567",
    address: "2345 MADISON AVE",
    city: "LAKEWOOD",
    zipCode: "44107",
    defendant: "WILLIAMS, JAMES T",
    plaintiff: "JP MORGAN CHASE BANK",
    currentStage: "default_motion",
    lisPendensDate: daysAgo(90),
    complaintFiledDate: daysAgo(87),
    summonsServedDate: daysAgo(75),
    answerDeadline: daysAgo(47),
    answerFiled: false,
    defaultMotionDate: daysAgo(30),
    estimatedValue: 210000,
  },
  {
    caseNumber: "CV-24-923456",
    address: "18900 CLIFTON BLVD",
    city: "LAKEWOOD",
    zipCode: "44107",
    defendant: "BROWN, ROBERT L",
    plaintiff: "US BANK NA",
    currentStage: "decree_issued",
    lisPendensDate: daysAgo(140),
    complaintFiledDate: daysAgo(137),
    summonsServedDate: daysAgo(125),
    answerDeadline: daysAgo(97),
    answerFiled: false,
    defaultMotionDate: daysAgo(80),
    defaultJudgmentDate: daysAgo(60),
    decreeDate: daysAgo(45),
    estimatedValue: 195000,
  },
  {
    caseNumber: "CV-24-912345",
    address: "1567 WARREN RD",
    city: "LAKEWOOD",
    zipCode: "44107",
    defendant: "DAVIS, LINDA M",
    plaintiff: "NATIONSTAR MORTGAGE",
    currentStage: "scheduled",
    lisPendensDate: daysAgo(180),
    complaintFiledDate: daysAgo(177),
    summonsServedDate: daysAgo(165),
    answerDeadline: daysAgo(137),
    answerFiled: false,
    defaultMotionDate: daysAgo(120),
    defaultJudgmentDate: daysAgo(100),
    decreeDate: daysAgo(85),
    praecipeDate: daysAgo(70),
    appraisalDate: daysAgo(45),
    appraisedValue: 175000,
    advertisingStartDate: daysAgo(21),
    scheduledSaleDate: daysFromNow(7), // Sale in 7 days!
    estimatedValue: 175000,
  },

  // CLEVELAND HEIGHTS
  {
    caseNumber: "CV-24-901234",
    address: "2890 MAYFIELD RD",
    city: "CLEVELAND HEIGHTS",
    zipCode: "44118",
    defendant: "GARCIA, MARIA E",
    plaintiff: "QUICKEN LOANS",
    currentStage: "lis_pendens",
    lisPendensDate: daysAgo(7),
    estimatedValue: 145000,
  },
  {
    caseNumber: "CV-24-890123",
    address: "3456 LEE RD",
    city: "CLEVELAND HEIGHTS",
    zipCode: "44118",
    defendant: "THOMPSON, DAVID W",
    plaintiff: "FREEDOM MORTGAGE",
    currentStage: "default_judgment",
    lisPendensDate: daysAgo(100),
    complaintFiledDate: daysAgo(97),
    summonsServedDate: daysAgo(85),
    answerDeadline: daysAgo(57),
    answerFiled: true, // Owner responded but still lost
    defaultMotionDate: daysAgo(45),
    defaultJudgmentDate: daysAgo(20),
    estimatedValue: 165000,
  },

  // PARMA
  {
    caseNumber: "CV-24-878901",
    address: "5678 RIDGE RD",
    city: "PARMA",
    zipCode: "44129",
    defendant: "MARTINEZ, CARLOS J",
    plaintiff: "LOANCARE LLC",
    currentStage: "summons_served",
    lisPendensDate: daysAgo(35),
    complaintFiledDate: daysAgo(32),
    summonsServedDate: daysAgo(21),
    answerDeadline: daysFromNow(7), // Deadline coming up
    estimatedValue: 135000,
  },
  {
    caseNumber: "CV-24-867890",
    address: "7890 PEARL RD",
    city: "PARMA",
    zipCode: "44130",
    defendant: "WILSON, SARAH K",
    plaintiff: "CITIMORTGAGE INC",
    currentStage: "praecipe_filed",
    lisPendensDate: daysAgo(150),
    complaintFiledDate: daysAgo(147),
    summonsServedDate: daysAgo(135),
    answerDeadline: daysAgo(107),
    answerFiled: false,
    defaultMotionDate: daysAgo(90),
    defaultJudgmentDate: daysAgo(70),
    decreeDate: daysAgo(55),
    praecipeDate: daysAgo(30),
    estimatedValue: 155000,
  },

  // EUCLID
  {
    caseNumber: "CV-24-856789",
    address: "22345 LAKE SHORE BLVD",
    city: "EUCLID",
    zipCode: "44123",
    defendant: "ANDERSON, MARK R",
    plaintiff: "PNC BANK NA",
    currentStage: "advertising",
    lisPendensDate: daysAgo(175),
    complaintFiledDate: daysAgo(172),
    summonsServedDate: daysAgo(160),
    answerDeadline: daysAgo(132),
    answerFiled: false,
    defaultMotionDate: daysAgo(115),
    defaultJudgmentDate: daysAgo(95),
    decreeDate: daysAgo(80),
    praecipeDate: daysAgo(65),
    appraisalDate: daysAgo(40),
    appraisedValue: 125000,
    advertisingStartDate: daysAgo(14),
    scheduledSaleDate: daysFromNow(14),
    estimatedValue: 125000,
  },

  // CLEVELAND
  {
    caseNumber: "CV-24-845678",
    address: "3456 W 130TH ST",
    city: "CLEVELAND",
    zipCode: "44111",
    defendant: "TAYLOR, KEVIN D",
    plaintiff: "FIFTH THIRD BANK",
    currentStage: "lis_pendens",
    lisPendensDate: daysAgo(5),
    estimatedValue: 95000,
  },
  {
    caseNumber: "CV-24-834567",
    address: "4567 CLARK AVE",
    city: "CLEVELAND",
    zipCode: "44109",
    defendant: "JACKSON, ANGELA M",
    plaintiff: "HUNTINGTON BANK",
    currentStage: "default_motion",
    lisPendensDate: daysAgo(85),
    complaintFiledDate: daysAgo(82),
    summonsServedDate: daysAgo(70),
    answerDeadline: daysAgo(42),
    answerFiled: false,
    defaultMotionDate: daysAgo(25),
    estimatedValue: 78000,
  },
  {
    caseNumber: "CV-24-823456",
    address: "5678 BROADWAY AVE",
    city: "CLEVELAND",
    zipCode: "44105",
    defendant: "MOORE, TIFFANY L",
    plaintiff: "OCWEN LOAN SERVICING",
    currentStage: "scheduled",
    lisPendensDate: daysAgo(195),
    complaintFiledDate: daysAgo(192),
    summonsServedDate: daysAgo(180),
    answerDeadline: daysAgo(152),
    answerFiled: false,
    defaultMotionDate: daysAgo(135),
    defaultJudgmentDate: daysAgo(115),
    decreeDate: daysAgo(100),
    praecipeDate: daysAgo(85),
    appraisalDate: daysAgo(60),
    appraisedValue: 65000,
    advertisingStartDate: daysAgo(21),
    scheduledSaleDate: daysFromNow(3), // Sale in 3 days - urgent!
    estimatedValue: 65000,
  },

  // SHAKER HEIGHTS
  {
    caseNumber: "CV-24-812345",
    address: "3456 VAN AKEN BLVD",
    city: "SHAKER HEIGHTS",
    zipCode: "44120",
    defendant: "WHITE, JENNIFER A",
    plaintiff: "KEY BANK NA",
    currentStage: "complaint_filed",
    lisPendensDate: daysAgo(21),
    complaintFiledDate: daysAgo(18),
    estimatedValue: 285000,
  },

  // SOUTH EUCLID
  {
    caseNumber: "CV-24-801234",
    address: "4567 MAYFIELD RD",
    city: "SOUTH EUCLID",
    zipCode: "44121",
    defendant: "HARRIS, WILLIAM J",
    plaintiff: "MR COOPER",
    currentStage: "appraisal",
    lisPendensDate: daysAgo(160),
    complaintFiledDate: daysAgo(157),
    summonsServedDate: daysAgo(145),
    answerDeadline: daysAgo(117),
    answerFiled: false,
    defaultMotionDate: daysAgo(100),
    defaultJudgmentDate: daysAgo(80),
    decreeDate: daysAgo(65),
    praecipeDate: daysAgo(50),
    appraisalDate: daysAgo(25),
    appraisedValue: 145000,
    estimatedValue: 145000,
  },

  // GARFIELD HEIGHTS
  {
    caseNumber: "CV-24-790123",
    address: "5678 TURNEY RD",
    city: "GARFIELD HEIGHTS",
    zipCode: "44125",
    defendant: "CLARK, DONNA M",
    plaintiff: "CARRINGTON MORTGAGE",
    currentStage: "answer_deadline",
    lisPendensDate: daysAgo(50),
    complaintFiledDate: daysAgo(47),
    summonsServedDate: daysAgo(35),
    answerDeadline: daysAgo(7),
    answerFiled: false, // Missed deadline!
    estimatedValue: 85000,
  },

  // MAPLE HEIGHTS
  {
    caseNumber: "CV-24-778901",
    address: "6789 BROADWAY AVE",
    city: "MAPLE HEIGHTS",
    zipCode: "44137",
    defendant: "LEWIS, ANTHONY R",
    plaintiff: "SHELLPOINT MORTGAGE",
    currentStage: "decree_issued",
    lisPendensDate: daysAgo(130),
    complaintFiledDate: daysAgo(127),
    summonsServedDate: daysAgo(115),
    answerDeadline: daysAgo(87),
    answerFiled: false,
    defaultMotionDate: daysAgo(70),
    defaultJudgmentDate: daysAgo(50),
    decreeDate: daysAgo(35),
    estimatedValue: 72000,
  },
];

async function seedData() {
  console.log("=".repeat(60));
  console.log("Seeding Pre-Foreclosure Data");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Convex URL: ${CONVEX_URL.substring(0, 30)}...`);
  console.log("=".repeat(60));

  let inserted = 0;
  let errors = 0;

  for (const data of SAMPLE_DATA) {
    try {
      await convex.mutation(api.preForeclosure.upsertPreForeclosure, data as any);
      console.log(`  ✓ ${data.caseNumber} - ${data.address}, ${data.city} (${data.currentStage})`);
      inserted++;
    } catch (error: any) {
      console.error(`  ✗ ${data.caseNumber}: ${error.message}`);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Seeding Complete");
  console.log("=".repeat(60));
  console.log(`Inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  console.log("\nYou can now ask:");
  console.log('  "Find me pre-foreclosure houses in Lakewood"');
  console.log('  "Show me early stage foreclosures"');
  console.log('  "Get foreclosure stats for Cleveland"');
}

seedData().catch(console.error);
