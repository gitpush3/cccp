# County Full Setup Guide

This guide provides step-by-step instructions for setting up a new county in the Cuyahoga County Building Regulations system. Use this as a template when expanding to additional Ohio counties.

## Overview

A complete county setup includes:
1. **Parcel Data** (~100k-500k records per county)
2. **Code Content** (~360-700 entries covering all municipalities)
3. **Regulation URLs** (links to municipal codes)
4. **Land Use Codes** (property classification reference)
5. **Building Department Contacts** (phone, address, website for each municipality)
6. **Service Providers** (lenders, title companies, contractors, inspectors)

---

## Prerequisites

### Required Data Sources

1. **Parcel Data CSV** - Obtain from county auditor/GIS department
   - Cuyahoga source: https://gis-cuyahoga.opendata.arcgis.com/
   - Required fields: parcel ID, address, owner, sales data, tax assessments, building characteristics

2. **Regulations JSON** - Compile municipal code URLs
   - 12 regulation types per municipality
   - State code references for baseline

3. **Municipality List** - All cities/villages in the county

### Environment Setup

```bash
# Ensure Convex is configured
cd /path/to/project
cat .env.local  # Should contain CONVEX_URL

# Verify Convex connection
npx convex dev --once
```

---

## Step 1: Prepare Parcel Data

### 1.1 Obtain CSV Files

Download parcel data from county GIS/auditor portal. Split into manageable files if needed:
- `Combined_Parcels_-_Cleveland_Only.csv` (~163k records)
- `Combined_Parcels_-_Non-Cleveland_Only.csv` (~357k records)

### 1.2 Analyze CSV Structure

Review the CSV headers to map fields to schema:

```bash
head -1 "cuyahoga parcels/Combined_Parcels_-_Cleveland_Only.csv"
```

Expected fields (Cuyahoga example):
- `parcelpin` → parcelId
- `par_addr_all` → fullAddress
- `deeded_owner` → currentOwner
- `transfer_date` → lastSaleDate
- `sales_amount` → lastSalePrice
- `tax_luc` → taxLuc (land use code)
- `total_square_ft` → totalSquareFeet
- `total_res_living_area` → totalResLivingArea
- `cert_tot_value` → certifiedTaxTotal

### 1.3 Update Import Script

Edit `scripts/importParcels.mjs` for your county:

```javascript
// Update file paths
const clevelandPath = path.join(__dirname, "../YOUR_COUNTY_parcels/City_Only.csv");
const nonClevelandPath = path.join(__dirname, "../YOUR_COUNTY_parcels/Non_City_Only.csv");

// Update field mappings in parseParcelRow()
function parseParcelRow(row, source) {
  return {
    parcelId: row.parcelpin || row.PARCEL_ID,  // Adjust field names
    fullAddress: row.par_addr_all || row.ADDRESS,
    // ... map all fields
  };
}
```

### 1.4 Run Parcel Import

```bash
# Import parcels (may take 30-60 minutes for large counties)
node scripts/importParcels.mjs

# Verify import
npx convex run parcels:getZipCodeStats '{"zipCode": "44107"}'
```

**Pro Tip**: For Convex Pro tier, use batch size of 100. For free tier, use batch size of 10-25 with delays.

---

## Step 2: Prepare Regulations Data

### 2.1 Create Regulations JSON

Create `data/regulations_llm_optimized.json` with this structure:

```json
{
  "metadata": {
    "database_name": "YOUR_COUNTY Building Regulations",
    "total_jurisdictions": 61,
    "last_updated": "2025-12-25",
    "coverage": {
      "state": 1,
      "county": 1,
      "municipalities": 59
    },
    "regulation_types": [
      "Building Code",
      "Residential Code",
      "Fire Code",
      "Mechanical Code",
      "Plumbing Code",
      "Electrical Code",
      "Energy Code",
      "Zoning Code",
      "Permitting Information",
      "Property Maintenance Code",
      "Flood Plain Regulations",
      "Demolition Regulations"
    ]
  },
  "jurisdictions": [
    {
      "name": "Ohio State",
      "type": "state",
      "regulations": {
        "building_code": {
          "status": "local_code",
          "url": "https://codes.iccsafe.org/content/OHBC2024P1",
          "display_value": "https://codes.iccsafe.org/content/OHBC2024P1"
        }
        // ... all 12 regulation types
      }
    },
    {
      "name": "Municipality Name",
      "type": "municipality",
      "regulations": {
        "building_code": {
          "status": "adopts_state",  // or "local_code" with URL
          "url": null,
          "display_value": "Adopts Ohio State Code"
        }
        // ... all 12 regulation types
      }
    }
  ]
}
```

### 2.2 Status Values

For each regulation type, use one of these statuses:

| Status | Description | URL Required |
|--------|-------------|--------------|
| `local_code` | Municipality has own code | Yes |
| `adopts_state` | Uses Ohio State code | No |
| `not_applicable` | N/A for this jurisdiction | No |
| `not_found` | Could not locate online | No |

### 2.3 Research Municipal Codes

Common sources for municipal codes:
- **Municode**: `https://library.municode.com/oh/CITY_NAME`
- **American Legal**: `https://codelibrary.amlegal.com/codes/CITY_NAME`
- **City websites**: Building department pages
- **County Planning**: `https://www.countyplanning.us/`

---

## Step 3: Import Code Content

### 3.1 Run Code Content Import

```bash
# Clear existing code content (if re-importing)
npx convex run codeContent:clearAll

# Import all regulations from JSON
node scripts/importCodeContent.mjs

# Verify count (should be ~728 for 61 jurisdictions x 12 types)
npx convex run codeContent:getCount
```

### 3.2 Add Detailed City Codes

For the largest city (e.g., Cleveland), add detailed code content in `convex/seedData.ts`:

```typescript
const CODE_CONTENT = [
  {
    municipality: "Cleveland",
    codeType: "zoning",
    section: "329.01",
    title: "Residential District Classifications",
    content: `Cleveland Residential Zoning Districts:
- R1-A: Single-Family Residential (minimum 20,000 sq ft lot)
- R1-B: Single-Family Residential (minimum 12,000 sq ft lot)
// ... detailed content
`,
    summary: "Cleveland residential zoning districts...",
    investorNotes: "R2 and MF zones allow multi-family...",
    sourceUrl: "https://codelibrary.amlegal.com/codes/cleveland/...",
  },
  // Add entries for:
  // - Zoning districts and setbacks
  // - ADU requirements
  // - Permit requirements
  // - Point of Sale inspection
  // - Smoke/CO detector requirements
  // - Rental registration
];
```

Run the seed:
```bash
npx convex run seedData:seedCodeContent
```

### 3.3 Add Investor Guides

Add county-specific investor guides:

```typescript
{
  municipality: "YOUR_COUNTY",
  codeType: "investor-guide",
  section: "Tax Abatement Programs",
  title: "YOUR_COUNTY Tax Abatement Programs",
  content: `Tax abatement details...`,
  investorNotes: "ALWAYS check for CRA eligibility...",
}
```

---

## Step 4: Seed Reference Data

### 4.1 Land Use Codes

Update `convex/seedData.ts` with county-specific land use codes:

```bash
npx convex run seedData:seedLandUseCodes
```

### 4.2 Verify All Data

```bash
# Check parcel count
npx convex run parcels:searchByAddress '{"address": "123 Main St"}'

# Check code content
npx convex run codeContent:getByMunicipality '{"municipality": "Cleveland"}'

# Check investor guides
npx convex run codeContent:getInvestorGuides
```

---

## Step 5: Update LLM Configuration

### 5.1 Update System Prompt

Edit `convex/actions.ts` to include county-specific information:

```typescript
const SYSTEM_PROMPT = `You are an expert assistant for real estate investors in YOUR_COUNTY, Ohio.

YOU HAVE ACCESS TO TWO POWERFUL DATABASES:

1) BUILDING CODES & REGULATIONS DATABASE:
   - Building codes for all XX municipalities
   // ...

2) COMPLETE PARCEL DATABASE (~XXX,XXX properties):
   // ...

LAND USE CODE QUICK REFERENCE:
- 5100: Single-family home
// ... county-specific codes
`;
```

### 5.2 Verify LLM Tools

Ensure all tools are working:
- `searchParcelByAddress`
- `getParcelById`
- `getComparables`
- `getInvestmentAnalysis`
- `getZipCodeStats`
- `searchByOwner`
- `searchCodeContent`
- `getCodeByMunicipality`
- `getInvestorGuides`

---

## Step 6: Testing

### 6.1 Test Parcel Queries

```bash
# Search by address
npx convex run parcels:searchByAddress '{"address": "1234 Main St", "limit": 5}'

# Get zip code stats
npx convex run parcels:getZipCodeStats '{"zipCode": "44107"}'

# Search by owner
npx convex run parcels:searchByOwner '{"ownerName": "LAND BANK", "limit": 10}'
```

### 6.2 Test Code Content

```bash
# Search code content
npx convex run codeContent:searchContent '{"searchText": "point of sale", "limit": 5}'

# Get by municipality
npx convex run codeContent:getByMunicipality '{"municipality": "Lakewood"}'

# Get investor guides
npx convex run codeContent:getInvestorGuides
```

### 6.3 Test LLM Integration

Test the chat interface with questions like:
- "What are the setback requirements in Cleveland?"
- "Tell me about 1234 Main St, Cleveland"
- "Do I need a permit to replace my roof in Lakewood?"
- "What properties does the land bank own in 44107?"

---

## Data Maintenance

### Updating Parcel Data

Parcel data should be refreshed annually or when county releases updates:

```bash
# Clear existing parcels
npx convex run parcels:clearAllParcels

# Re-import
node scripts/importParcels.mjs
```

### Updating Code Content

When municipal codes change:

```bash
# Clear and re-import
npx convex run codeContent:clearAll
node scripts/importCodeContent.mjs
npx convex run seedData:seedCodeContent
```

---

## Troubleshooting

### Memory Limit Errors

If queries fail with memory errors, reduce sample sizes in `convex/parcels.ts`:

```typescript
// Use .take(2000) instead of .collect() for large datasets
const parcels = await ctx.db
  .query("parcels")
  .withIndex("by_zip", (q) => q.eq("zipCode", args.zipCode))
  .take(2000);
```

### Rate Limiting (Free Tier)

For Convex free tier, add delays between batches:

```javascript
const BATCH_SIZE = 10;
await new Promise(r => setTimeout(r, 200)); // 200ms delay
```

### Missing Municipalities

If a municipality is missing from code content:
1. Add to `data/regulations_llm_optimized.json`
2. Re-run `node scripts/importCodeContent.mjs`

---

## Step 7: Seed Contacts and Service Providers

### 7.1 Building Department Contacts

Add building department contacts for each municipality in `convex/seedContacts.ts`:

```typescript
const BUILDING_DEPT_CONTACTS = [
  {
    city: "Cleveland",
    name: "Cleveland Building & Housing",
    phone: "(216) 664-2282",
    address: "601 Lakeside Ave, Room 500, Cleveland, OH 44114",
    website: "https://www.clevelandohio.gov/city-hall/departments/building-housing",
    investorNotes: "Point of Sale required. Schedule 2-5 days ahead. Reinspection $75.",
  },
  // Add all municipalities...
];
```

### 7.2 Service Providers

Add investor-relevant service providers:

```typescript
const SERVICE_PROVIDERS = [
  // Contractor Platform (Featured)
  {
    category: "contractor_platform",
    name: "3bids.io",
    description: "Get competitive bids from licensed contractors...",
    website: "https://app.3bids.io",
    featured: true,
    investorNotes: "RECOMMENDED: Post your rehab project to get competitive bids.",
  },
  // Hard Money Lenders
  {
    category: "hard_money",
    name: "Lima One Capital",
    phone: "(800) 390-4212",
    website: "https://www.limaone.com",
    // ...
  },
  // Title Companies, Property Managers, Inspectors, etc.
];
```

### 7.3 Run Seed

```bash
npx convex run seedContacts:seedAll
```

---

## File Reference

| File | Purpose |
|------|---------|
| `scripts/importParcels.mjs` | Import parcel CSV data |
| `scripts/importCodeContent.mjs` | Import regulation code content |
| `convex/schema.ts` | Database schema (parcels, codeContent, contacts, serviceProviders) |
| `convex/parcels.ts` | Parcel query functions |
| `convex/codeContent.ts` | Code content query functions |
| `convex/seedData.ts` | Detailed codes and investor guides |
| `convex/seedContacts.ts` | Building dept contacts and service providers |
| `convex/actions.ts` | LLM system prompt and tools |
| `data/regulations_llm_optimized.json` | Regulation URLs and metadata |
| `docs/data_update_schedule.md` | Data maintenance schedule |

---

## Checklist

- [ ] Obtain parcel CSV data from county
- [ ] Map CSV fields to schema
- [ ] Import parcels (~30-60 min)
- [ ] Create regulations JSON with all municipalities
- [ ] Research and add municipal code URLs
- [ ] Add building department contacts for each municipality
- [ ] Add service providers (lenders, title, inspectors, 3bids.io)
- [ ] Import code content (~5 min)
- [ ] Add detailed codes for largest city
- [ ] Add investor guides (tax abatement, land bank)
- [ ] Seed land use codes
- [ ] Update LLM system prompt
- [ ] Test parcel queries
- [ ] Test code content search
- [ ] Test LLM chat integration

---

## Expected Final Counts

| Data Type | Expected Count |
|-----------|----------------|
| Parcels | 100,000 - 500,000 |
| Code Content | 360 - 750 entries |
| Municipalities | 20 - 100 |
| Regulation Types | 12 per municipality |

For Cuyahoga County:
- **Parcels**: 520,673
- **Code Content**: 741 entries
- **Municipalities**: 59 + Ohio State + County = 61 jurisdictions
