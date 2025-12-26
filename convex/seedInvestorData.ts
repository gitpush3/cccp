import { mutation } from "./_generated/server";

// Sample Sheriff Sales data for demonstration
const SAMPLE_SHERIFF_SALES = [
  {
    caseNumber: "CV-24-123456",
    parcelId: "10321081",
    address: "2193 E 33 ST",
    city: "CLEVELAND",
    zipCode: "44115",
    saleDate: "2025-02-15",
    saleTime: "10:00 AM",
    openingBid: 45000,
    appraisedValue: 88800,
    plaintiff: "NATIONSTAR MORTGAGE LLC",
    defendant: "SMITH, JOHN",
    status: "scheduled" as const,
    propertyType: "Residential",
    caseType: "Foreclosure",
    sourceUrl: "https://cuyahoga.sheriffsaleauction.ohio.gov/",
  },
  {
    caseNumber: "CV-24-234567",
    parcelId: "11928137",
    address: "2193 E 80 ST",
    city: "CLEVELAND",
    zipCode: "44103",
    saleDate: "2025-02-22",
    saleTime: "10:00 AM",
    openingBid: 35000,
    appraisedValue: 76900,
    plaintiff: "WELLS FARGO BANK NA",
    defendant: "JONES, MARY",
    status: "scheduled" as const,
    propertyType: "Residential",
    caseType: "Foreclosure",
    sourceUrl: "https://cuyahoga.sheriffsaleauction.ohio.gov/",
  },
  {
    caseNumber: "CV-24-345678",
    address: "1234 MAIN ST",
    city: "PARMA",
    zipCode: "44134",
    saleDate: "2025-03-01",
    saleTime: "10:00 AM",
    openingBid: 85000,
    appraisedValue: 145000,
    plaintiff: "BANK OF AMERICA NA",
    defendant: "WILLIAMS, ROBERT",
    status: "scheduled" as const,
    propertyType: "Residential",
    caseType: "Foreclosure",
    sourceUrl: "https://cuyahoga.sheriffsaleauction.ohio.gov/",
  },
  {
    caseNumber: "CV-23-987654",
    address: "5678 LAKE AVE",
    city: "LAKEWOOD",
    zipCode: "44107",
    saleDate: "2024-12-15",
    openingBid: 120000,
    appraisedValue: 185000,
    plaintiff: "CHASE HOME FINANCE",
    defendant: "BROWN, DAVID",
    status: "sold" as const,
    propertyType: "Residential",
    caseType: "Foreclosure",
  },
];

// Sample Tax Delinquent data
const SAMPLE_TAX_DELINQUENT = [
  {
    parcelId: "10321082",
    address: "2195 E 33 ST",
    city: "CLEVELAND",
    zipCode: "44115",
    ownerName: "JOHNSON, MICHAEL",
    totalAmountOwed: 12500,
    yearsDelinquent: 3,
    oldestDelinquentYear: 2022,
    paymentPlanStatus: "none" as const,
    certifiedForSale: false,
  },
  {
    parcelId: "11928138",
    address: "2195 E 80 ST",
    city: "CLEVELAND",
    zipCode: "44103",
    ownerName: "DAVIS, SARAH",
    totalAmountOwed: 8750,
    yearsDelinquent: 2,
    oldestDelinquentYear: 2023,
    paymentPlanStatus: "active" as const,
    certifiedForSale: false,
  },
  {
    parcelId: "12345678",
    address: "4567 BROADWAY AVE",
    city: "CLEVELAND",
    zipCode: "44105",
    ownerName: "WILSON, JAMES",
    totalAmountOwed: 25000,
    yearsDelinquent: 5,
    oldestDelinquentYear: 2020,
    paymentPlanStatus: "defaulted" as const,
    certifiedForSale: true,
  },
  {
    parcelId: "23456789",
    address: "789 PEARL RD",
    city: "PARMA",
    zipCode: "44134",
    ownerName: "MARTINEZ, CARLOS",
    totalAmountOwed: 6200,
    yearsDelinquent: 2,
    oldestDelinquentYear: 2023,
    paymentPlanStatus: "none" as const,
    certifiedForSale: false,
  },
];

// Sample School data
const SAMPLE_SCHOOLS = [
  {
    schoolId: "OH-001",
    name: "Lincoln Elementary",
    schoolType: "elementary" as const,
    address: "1234 Lincoln Ave",
    city: "CLEVELAND",
    zipCode: "44115",
    district: "Cleveland Metropolitan School District",
    rating: 5,
    testScoreRating: 4,
    studentTeacherRatio: 18,
    totalStudents: 450,
    gradeRange: "K-5",
  },
  {
    schoolId: "OH-002",
    name: "Lakewood High School",
    schoolType: "high" as const,
    address: "14100 Franklin Blvd",
    city: "LAKEWOOD",
    zipCode: "44107",
    district: "Lakewood City Schools",
    rating: 8,
    testScoreRating: 7,
    studentTeacherRatio: 16,
    totalStudents: 1200,
    gradeRange: "9-12",
    website: "https://www.lakewoodcityschools.org/lhs",
  },
  {
    schoolId: "OH-003",
    name: "Parma Senior High",
    schoolType: "high" as const,
    address: "6285 W 54th St",
    city: "PARMA",
    zipCode: "44129",
    district: "Parma City School District",
    rating: 6,
    testScoreRating: 6,
    studentTeacherRatio: 17,
    totalStudents: 1500,
    gradeRange: "9-12",
  },
  {
    schoolId: "OH-004",
    name: "Shaker Heights High School",
    schoolType: "high" as const,
    address: "15911 Aldersyde Dr",
    city: "SHAKER HEIGHTS",
    zipCode: "44120",
    district: "Shaker Heights City School District",
    rating: 9,
    testScoreRating: 9,
    studentTeacherRatio: 14,
    totalStudents: 1800,
    gradeRange: "9-12",
    website: "https://www.shaker.org/shhs",
  },
];

// Sample Demographics data
const SAMPLE_DEMOGRAPHICS = [
  {
    zipCode: "44115",
    city: "CLEVELAND",
    population: 12500,
    medianHouseholdIncome: 28000,
    medianAge: 35,
    ownerOccupiedPercent: 35,
    renterOccupiedPercent: 55,
    vacancyRate: 10,
    medianHomeValue: 65000,
    medianRent: 750,
    povertyRate: 32,
    unemploymentRate: 12,
    collegeEducatedPercent: 15,
    dataYear: 2023,
  },
  {
    zipCode: "44107",
    city: "LAKEWOOD",
    population: 52000,
    medianHouseholdIncome: 52000,
    medianAge: 34,
    ownerOccupiedPercent: 48,
    renterOccupiedPercent: 48,
    vacancyRate: 4,
    medianHomeValue: 165000,
    medianRent: 950,
    povertyRate: 12,
    unemploymentRate: 5,
    collegeEducatedPercent: 45,
    dataYear: 2023,
  },
  {
    zipCode: "44134",
    city: "PARMA",
    population: 35000,
    medianHouseholdIncome: 48000,
    medianAge: 42,
    ownerOccupiedPercent: 68,
    renterOccupiedPercent: 28,
    vacancyRate: 4,
    medianHomeValue: 135000,
    medianRent: 850,
    povertyRate: 10,
    unemploymentRate: 6,
    collegeEducatedPercent: 25,
    dataYear: 2023,
  },
  {
    zipCode: "44120",
    city: "SHAKER HEIGHTS",
    population: 28000,
    medianHouseholdIncome: 85000,
    medianAge: 40,
    ownerOccupiedPercent: 72,
    renterOccupiedPercent: 25,
    vacancyRate: 3,
    medianHomeValue: 285000,
    medianRent: 1200,
    povertyRate: 8,
    unemploymentRate: 4,
    collegeEducatedPercent: 65,
    dataYear: 2023,
  },
];

// Sample Walk Scores
const SAMPLE_WALK_SCORES = [
  {
    zipCode: "44115",
    city: "CLEVELAND",
    walkScore: 72,
    transitScore: 55,
    bikeScore: 65,
    walkDescription: "Very Walkable",
  },
  {
    zipCode: "44107",
    city: "LAKEWOOD",
    walkScore: 78,
    transitScore: 48,
    bikeScore: 72,
    walkDescription: "Very Walkable",
  },
  {
    zipCode: "44134",
    city: "PARMA",
    walkScore: 45,
    transitScore: 32,
    bikeScore: 38,
    walkDescription: "Car-Dependent",
  },
  {
    zipCode: "44120",
    city: "SHAKER HEIGHTS",
    walkScore: 55,
    transitScore: 45,
    bikeScore: 52,
    walkDescription: "Somewhat Walkable",
  },
];

// Seed all investor data
export const seedAllInvestorData = mutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      sheriffSales: 0,
      taxDelinquent: 0,
      schools: 0,
      demographics: 0,
      walkScores: 0,
    };

    // Seed Sheriff Sales
    for (const sale of SAMPLE_SHERIFF_SALES) {
      const existing = await ctx.db
        .query("sheriffSales")
        .filter((q) => q.eq(q.field("caseNumber"), sale.caseNumber))
        .first();
      
      if (!existing) {
        await ctx.db.insert("sheriffSales", { ...sale, lastUpdated: Date.now() });
        results.sheriffSales++;
      }
    }

    // Seed Tax Delinquent
    for (const delinquent of SAMPLE_TAX_DELINQUENT) {
      const existing = await ctx.db
        .query("taxDelinquent")
        .filter((q) => q.eq(q.field("parcelId"), delinquent.parcelId))
        .first();
      
      if (!existing) {
        await ctx.db.insert("taxDelinquent", { ...delinquent, lastUpdated: Date.now() });
        results.taxDelinquent++;
      }
    }

    // Seed Schools
    for (const school of SAMPLE_SCHOOLS) {
      const existing = await ctx.db
        .query("schools")
        .filter((q) => q.eq(q.field("schoolId"), school.schoolId))
        .first();
      
      if (!existing) {
        await ctx.db.insert("schools", { ...school, lastUpdated: Date.now() });
        results.schools++;
      }
    }

    // Seed Demographics
    for (const demo of SAMPLE_DEMOGRAPHICS) {
      const existing = await ctx.db
        .query("demographics")
        .filter((q) => q.eq(q.field("zipCode"), demo.zipCode))
        .first();
      
      if (!existing) {
        await ctx.db.insert("demographics", { ...demo, lastUpdated: Date.now() });
        results.demographics++;
      }
    }

    // Seed Walk Scores
    for (const score of SAMPLE_WALK_SCORES) {
      const existing = await ctx.db
        .query("walkScores")
        .filter((q) => q.eq(q.field("zipCode"), score.zipCode))
        .first();
      
      if (!existing) {
        await ctx.db.insert("walkScores", { ...score, lastUpdated: Date.now() });
        results.walkScores++;
      }
    }

    return results;
  },
});
