# Data Update Schedule & Strategy

This document outlines the recommended schedule for updating data in the Cuyahoga County Building Regulations system.

---

## Data Update Frequency Summary

| Data Type | Update Frequency | Source | Priority |
|-----------|------------------|--------|----------|
| Parcel Data | Quarterly | County Auditor/GIS | High |
| Code Content | Annually | Municipal websites | Medium |
| Building Dept Contacts | Semi-annually | Municipal websites | Medium |
| Service Providers | Quarterly | Manual verification | Low |
| Regulation URLs | Annually | Municipal websites | Medium |

---

## 1. Parcel Data (Quarterly)

### Why Quarterly?
- Property sales occur continuously (~2,000-3,000/month in Cuyahoga)
- Tax assessments update annually (January)
- Ownership changes need to be reflected for accurate investor research

### Update Schedule
- **Q1 (January)**: Full refresh after tax assessment updates
- **Q2 (April)**: Incremental update for Q1 sales
- **Q3 (July)**: Incremental update for Q2 sales
- **Q4 (October)**: Incremental update for Q3 sales

### Data Source
- Cuyahoga County GIS: https://gis-cuyahoga.opendata.arcgis.com/
- Download: "Combined Parcels" dataset
- Alternative: County Auditor API (if available)

### Update Process
```bash
# 1. Download new CSV files from county GIS
# 2. Clear existing parcels (optional - or do incremental)
npx convex run parcels:clearAllParcels

# 3. Import new data
node scripts/importParcels.mjs

# 4. Verify counts
npx convex run parcels:getZipCodeStats '{"zipCode": "44107"}'
```

### Key Fields to Monitor
- `lastSaleDate` / `lastSalePrice` - Recent transactions
- `certifiedTaxTotal` - Tax assessments (update in January)
- `currentOwner` - Ownership changes
- `taxLuc` - Land use code changes

---

## 2. Code Content (Annually)

### Why Annually?
- Building codes update on 3-year ICC cycle
- Ohio adopts new codes every 3 years
- Municipal amendments are infrequent

### Update Schedule
- **January**: Check for Ohio state code updates
- **July**: Review municipal code amendments

### Update Process
```bash
# 1. Update regulations_llm_optimized.json with new URLs
# 2. Clear and re-import code content
npx convex run codeContent:clearAll
node scripts/importCodeContent.mjs

# 3. Re-seed detailed Cleveland codes
npx convex run seedData:seedCodeContent

# 4. Verify
npx convex run codeContent:getCount
```

### What to Check
- Ohio Building Code version (currently 2024)
- Ohio Residential Code version (currently 2019 with amendments)
- Municipal Point of Sale fee changes
- New rental registration requirements

---

## 3. Building Department Contacts (Semi-annually)

### Why Semi-annually?
- Staff changes occur periodically
- Phone numbers and addresses rarely change
- Website URLs may update

### Update Schedule
- **March**: Pre-spring building season verification
- **September**: Mid-year verification

### Update Process
```bash
# 1. Verify contacts manually or via web scraping
# 2. Update seedContacts.ts with changes
# 3. Re-run seed
npx convex run seedContacts:seedAll
```

### Verification Checklist
- [ ] Phone numbers still working
- [ ] Website URLs still valid
- [ ] Address/location unchanged
- [ ] POS fees current

---

## 4. Service Providers (Quarterly)

### Why Quarterly?
- Lenders change rates and programs frequently
- New service providers enter market
- Business closures/changes

### Update Schedule
- Review featured providers quarterly
- Add new providers as discovered

### Update Process
```bash
# Update SERVICE_PROVIDERS array in seedContacts.ts
# Re-run seed
npx convex run seedContacts:seedAll
```

### Categories to Monitor
- **Hard Money Lenders**: Rate changes, new programs
- **Title Companies**: New locations, closures
- **Property Managers**: Service area changes
- **3bids.io**: Ensure featured status maintained

---

## 5. Regulation URLs (Annually)

### Why Annually?
- Municipal code platforms rarely change
- URL structures are generally stable
- Municode/American Legal maintain archives

### Update Schedule
- **January**: Annual URL verification

### Update Process
```bash
# 1. Run URL checker script (create if needed)
# 2. Update regulations_llm_optimized.json
# 3. Re-import
node scripts/importCodeContent.mjs
```

---

## Automated Update Scripts

### Create a Monthly Check Script

```javascript
// scripts/monthlyDataCheck.mjs
// Run: node scripts/monthlyDataCheck.mjs

import { ConvexHttpClient } from "convex/browser";

async function checkDataHealth() {
  const client = new ConvexHttpClient(process.env.CONVEX_URL);
  
  // Check parcel count
  const parcelStats = await client.query("parcels:getZipCodeStats", { zipCode: "44107" });
  console.log(`Parcels in 44107: ${parcelStats.totalParcels}`);
  
  // Check code content count
  const codeCount = await client.query("codeContent:getCount", {});
  console.log(`Code content entries: ${codeCount.count}`);
  
  // Check for recent sales (data freshness)
  // Add more health checks as needed
}

checkDataHealth();
```

---

## Data Freshness Indicators

### Add to Dashboard (Future Enhancement)
- Last parcel data update date
- Most recent sale date in database
- Code content last updated
- Contact verification date

### Suggested Schema Addition
```typescript
// Add to schema.ts
dataMetadata: defineTable({
  dataType: v.string(), // "parcels", "codeContent", "contacts"
  lastUpdated: v.number(),
  recordCount: v.number(),
  source: v.string(),
  notes: v.optional(v.string()),
})
```

---

## Additional Public Data Sources to Consider

### High Value (Add Soon)
1. **Sheriff Sales / Foreclosures**
   - Source: Cuyahoga County Sheriff
   - URL: https://fiscalofficer.cuyahogacounty.us/
   - Update: Weekly
   - Value: Investment opportunities

2. **Tax Delinquent Properties**
   - Source: County Treasurer
   - Update: Monthly
   - Value: Distressed property leads

3. **Building Permits Issued**
   - Source: Each municipality
   - Update: Monthly
   - Value: Market activity indicator

4. **Code Violations / Condemnations**
   - Source: Municipal building departments
   - Update: Monthly
   - Value: Risk assessment

### Medium Value (Future)
5. **School District Ratings**
   - Source: Ohio Department of Education
   - Update: Annually
   - Value: Property value factor

6. **Crime Statistics**
   - Source: Local police departments
   - Update: Quarterly
   - Value: Neighborhood assessment

7. **Utility Rates**
   - Source: CEI, Dominion, water districts
   - Update: Annually
   - Value: Operating cost estimates

8. **Rental Market Data**
   - Source: Zillow, Rentometer APIs
   - Update: Monthly
   - Value: Cash flow projections

### Low Value (Nice to Have)
9. **Historic District Boundaries**
10. **Flood Zone Maps**
11. **Environmental Hazards**
12. **Transit Routes**

---

## Notification System (Future)

### Implement Alerts For:
- Parcel data older than 90 days
- Broken regulation URLs
- Contact verification overdue
- New municipal code adoptions

### Suggested Implementation
```typescript
// convex/dataHealth.ts
export const checkDataFreshness = query({
  handler: async (ctx) => {
    const alerts = [];
    
    // Check parcel data age
    const recentSale = await ctx.db
      .query("parcels")
      .order("desc")
      .first();
    
    if (recentSale) {
      const daysSinceUpdate = (Date.now() - recentSale.lastUpdated) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 90) {
        alerts.push({
          type: "warning",
          message: `Parcel data is ${Math.floor(daysSinceUpdate)} days old. Consider updating.`,
        });
      }
    }
    
    return alerts;
  },
});
```

---

## Monthly Maintenance Checklist

### Week 1
- [ ] Check parcel data freshness
- [ ] Review any user-reported data issues
- [ ] Verify 3bids.io link is working

### Week 2
- [ ] Spot-check 5 random building dept contacts
- [ ] Review service provider websites
- [ ] Check for new municipal announcements

### Week 3
- [ ] Run data health check script
- [ ] Review LLM response quality
- [ ] Check for broken regulation URLs

### Week 4
- [ ] Document any data issues found
- [ ] Plan updates for next month
- [ ] Update this schedule if needed

---

## Contact for Data Sources

| Data Type | Contact | Notes |
|-----------|---------|-------|
| Parcel Data | Cuyahoga County GIS | gis@cuyahogacounty.us |
| Building Codes | ICC | codes.iccsafe.org |
| Municipal Codes | Municode | library.municode.com |
| Sheriff Sales | County Sheriff | 216-443-6000 |
| Tax Records | Fiscal Officer | 216-443-7010 |
