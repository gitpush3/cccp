# Complete Guide: Integrating Bulk Parcel Data into Your Convex App

This guide provides a complete, step-by-step walkthrough for downloading, importing, and utilizing the full Cuyahoga County parcel database in your Convex chat application. By following these steps, you will give your LLM-powered assistant complete knowledge of every property in the county.

---

## ✅ Overview: The Bulk Data Advantage

Your insight was spot-on—using the county's bulk data downloads is far superior to relying on real-time API lookups. Here's why this architecture is the right choice:

| Feature | Bulk Import (This Solution) | Real-Time API Calls |
| :--- | :--- | :--- |
| **Cost** | **$0 (Free)** | Can be expensive at scale |
| **Speed** | **Extremely Fast** (sub-second queries) | Slower (network latency) |
| **Data Richness** | **Complete dataset** (73 fields per parcel) | Often limited fields |
| **Offline Access** | Data is always available in your DB | Dependent on external service uptime |
| **Update Frequency** | Monthly (manual or cron job) | Real-time |

For this application, where data is updated monthly, the bulk import strategy provides the best performance and cost-effectiveness.

---

## 🛠️ Step 1: Download the Parcel Data CSVs

First, you need to download the two main parcel data files from the Cuyahoga County GIS Hub. These files contain all ~520,000 parcels.

1.  **Go to the Download Pages:**
    *   **Cleveland Parcels (~163k):** [Combined Parcels - Cleveland Only](https://geospatial.gis.cuyahogacounty.gov/datasets/cuyahoga::combined-parcels-cleveland-only/)
    *   **Non-Cleveland Parcels (~357k):** [Combined Parcels - Non-Cleveland Only](https://geospatial.gis.cuyahogacounty.gov/datasets/cuyahoga::combined-parcels-non-cleveland-only/)

2.  **Download the CSV Files:**
    *   On each page, click the **Download** button.
    *   In the side panel that appears, find the **CSV** option and click its **Download** button.
    *   This will download two files, likely named `Combined_Parcels_-_Cleveland_Only.csv` and `Combined_Parcels_-_Non-Cleveland_Only.csv`.

3.  **Place Files in Your Project:**
    *   In your Convex project, create a directory at the root level named `data`.
    *   Move both downloaded CSV files into this `data/` directory.

---

## 🚀 Step 2: Add the New Backend Files

I have created all the necessary backend files for this new functionality. Add the following files to your `convex/` directory:

1.  **`schema_with_parcels.ts`**: This is the updated schema. **Rename your existing `schema.ts` to `schema_old.ts` and rename this file to `schema.ts`**. It adds the comprehensive `parcels` table and indexes.

2.  **`parcels.ts`**: This new file contains all the queries for interacting with the parcel data, including:
    *   `searchByAddress`: For fuzzy address searching.
    *   `getByParcelId`: For direct lookups.
    *   `getComparables`: To find comparable properties for valuation.
    *   `getInvestmentAnalysis`: To generate key metrics for investors.

3.  **`chat_with_parcels.ts`**: This is the updated chat action. **Rename your existing `chat.ts` and rename this file to `chat.ts`**. It includes the new parcel functions in the system prompt and tool-calling logic.

4.  **`scripts/importParcels.ts`**: This is a new script used to import the data from the CSV files into your Convex database. Create a `scripts/` directory inside `convex/` if it doesn't exist.

---

## ⚙️ Step 3: Run the Import Script

Now, you will populate your Convex `parcels` table using the script you just added. This is a one-time setup process (which you can re-run monthly to refresh the data).

Run the following commands from your project's root directory in your terminal:

```bash
# Import Cleveland parcels (takes ~5-10 minutes)
npx convex run scripts/importParcels:importFromCSV --csvPath="./data/Combined_Parcels_-_Cleveland_Only.csv"

# Import Non-Cleveland parcels (takes ~10-20 minutes)
npx convex run scripts/importParcels:importFromCSV --csvPath="./data/Combined_Parcels_-_Non-Cleveland_Only.csv"
```

The script will log its progress. Once complete, your database will contain the entire Cuyahoga County parcel dataset, ready to be queried.

> **Note:** The import script is idempotent. If you run it again, it will add the data again. For monthly updates, you should first run the `clearAllParcels` mutation to wipe the old data before importing the new files.
> `npx convex run scripts/importParcels:clearAllParcels`

---

## 💬 Step 4: Test the Chat

That's it! Your application is now powered by a complete, local copy of the county's real estate data. You can now ask questions like:

*   "Tell me everything you know about 123 Main St, Lakewood, OH 44107."
*   "What was the last sale price for 456 High Ave, Cleveland?"
*   "Find me some comps for 789 Lake Rd, Rocky River."
*   "Give me an investment analysis for 101 First St, Berea."
*   "What are the property market stats for zip code 44118?"

The LLM will now use the `searchParcelByAddress`, `getComparables`, and other functions to pull live data directly from your database, providing incredibly detailed and accurate answers.
