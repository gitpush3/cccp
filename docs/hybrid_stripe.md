# Hybrid Stripe Integration - LatitudeGo

**Approach:** Script creates Stripe products/prices per trip → Auto-charge installments over time  
**Source of Truth:** Stripe products (created from Fluent Forms config)  
**Backend:** Convex (TypeScript)

---

## Overview

```
1. You create a new trip in Fluent Forms
2. Run the master script with trip config
3. Script creates ~12 Stripe products/prices (single, double, triple × packages)
4. Script outputs Payment Links
5. Send Payment Link to customer
6. Customer pays deposit → Card saved
7. Convex auto-charges installments until 60 days before travel
```

---

## The Master Script

### What It Creates Per Trip

For a trip like "Caribbean Escape 2026" with 4 packages:

| Package | Single | Double | Triple | Deposit |
|---------|--------|--------|--------|---------|
| Bronze | price_xxx | price_xxx | price_xxx | price_xxx |
| Silver | price_xxx | price_xxx | price_xxx | price_xxx |
| Gold | price_xxx | price_xxx | price_xxx | price_xxx |
| Platinum | price_xxx | price_xxx | price_xxx | price_xxx |

**Total: 16 prices** (4 packages × 3 occupancy types + 4 deposits)

Plus **Payment Links** for each combination that you can send directly to customers.

---

## How To Use

### Step 1: Fill in the Trip Config

Edit `scripts/trip-config.ts`:

```typescript
export const tripConfig = {
  // Basic Info
  tripId: "caribbean-2026",
  tripName: "Caribbean Escape 2026",
  travelDate: "2026-06-01",
  
  // Packages - add/remove as needed
  packages: [
    {
      name: "Bronze",
      single: 2500,
      double: 4000,
      triple: 5500,
      deposit: 300,
    },
    {
      name: "Silver", 
      single: 3000,
      double: 5000,
      triple: 7000,
      deposit: 400,
    },
    {
      name: "Gold",
      single: 3500,
      double: 6000,
      triple: 8500,
      deposit: 500,
    },
    {
      name: "Platinum",
      single: 4500,
      double: 8000,
      triple: 11000,
      deposit: 750,
    },
  ],
};
```

### Step 2: Run the Script

```bash
npx ts-node scripts/create-trip-products.ts
```

### Step 3: Get Your Payment Links

Script outputs:

```
✅ Created products for: Caribbean Escape 2026

Payment Links:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bronze - Single ($2,500):
  https://buy.stripe.com/xxx

Bronze - Double ($4,000):
  https://buy.stripe.com/xxx

Bronze - Triple ($5,500):
  https://buy.stripe.com/xxx

Silver - Single ($3,000):
  https://buy.stripe.com/xxx

... etc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product mapping saved to: output/caribbean-2026-products.json
```

### Step 4: Send Links to Customers

Copy the appropriate Payment Link and send to customer. They:
1. Click link
2. Pay deposit
3. Card is saved
4. Auto-charged on schedule until 60 days before travel

---

## Environment Variables

Add these to your `.env`:

```env
# Stripe Mode: "test" or "live"
STRIPE_MODE=test

# Stripe Test Keys
STRIPE_TEST_SECRET_KEY=sk_test_xxx
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_xxx

# Stripe Live Keys  
STRIPE_LIVE_SECRET_KEY=sk_live_xxx
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_xxx

# Webhook Secrets (for receiving Stripe events)
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_xxx
STRIPE_LIVE_WEBHOOK_SECRET=whsec_live_xxx

# Convex
CONVEX_URL=https://xxx.convex.cloud

# Admin
ADMIN_EMAIL=admin@latitudego.com
```

---

## The Script Code

### `scripts/create-trip-products.ts`

```typescript
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// ============================================================
// TRIP CONFIGURATION - EDIT THIS FOR EACH NEW TRIP
// ============================================================

const tripConfig = {
  tripId: "caribbean-2026",
  tripName: "Caribbean Escape 2026", 
  travelDate: "2026-06-01",
  
  packages: [
    { name: "Bronze",   single: 2500, double: 4000, triple: 5500, deposit: 300 },
    { name: "Silver",   single: 3000, double: 5000, triple: 7000, deposit: 400 },
    { name: "Gold",     single: 3500, double: 6000, triple: 8500, deposit: 500 },
    { name: "Platinum", single: 4500, double: 8000, triple: 11000, deposit: 750 },
  ],
};

// ============================================================
// SCRIPT - DO NOT EDIT BELOW
// ============================================================

const mode = process.env.STRIPE_MODE || 'test';
const stripeKey = mode === 'live' 
  ? process.env.STRIPE_LIVE_SECRET_KEY! 
  : process.env.STRIPE_TEST_SECRET_KEY!;

const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

interface PackageConfig {
  name: string;
  single: number;
  double: number;
  triple: number;
  deposit: number;
}

interface CreatedPrice {
  priceId: string;
  paymentLinkId: string;
  paymentLinkUrl: string;
}

interface PackagePrices {
  single: CreatedPrice;
  double: CreatedPrice;
  triple: CreatedPrice;
  deposit: CreatedPrice;
}

interface TripOutput {
  tripId: string;
  tripName: string;
  travelDate: string;
  stripeProductId: string;
  packages: Record<string, PackagePrices>;
  createdAt: string;
  mode: string;
}

async function createTripProducts() {
  console.log(`\n🚀 Creating Stripe products for: ${tripConfig.tripName}`);
  console.log(`   Mode: ${mode.toUpperCase()}\n`);

  // 1. Create the main Product
  const product = await stripe.products.create({
    name: tripConfig.tripName,
    description: `Travel Date: ${tripConfig.travelDate}`,
    metadata: {
      trip_id: tripConfig.tripId,
      travel_date: tripConfig.travelDate,
    },
  });

  console.log(`✅ Created product: ${product.id}\n`);

  const output: TripOutput = {
    tripId: tripConfig.tripId,
    tripName: tripConfig.tripName,
    travelDate: tripConfig.travelDate,
    stripeProductId: product.id,
    packages: {},
    createdAt: new Date().toISOString(),
    mode,
  };

  // 2. Create prices and payment links for each package
  for (const pkg of tripConfig.packages) {
    console.log(`📦 Creating prices for ${pkg.name}...`);
    
    output.packages[pkg.name.toLowerCase()] = {
      single: await createPriceWithLink(product.id, pkg, 'single', 1),
      double: await createPriceWithLink(product.id, pkg, 'double', 2),
      triple: await createPriceWithLink(product.id, pkg, 'triple', 3),
      deposit: await createDepositPriceWithLink(product.id, pkg),
    };
  }

  // 3. Save output
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `${tripConfig.tripId}-products.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // 4. Print summary
  printSummary(output);
  
  console.log(`\n📁 Product mapping saved to: ${outputPath}\n`);
}

async function createPriceWithLink(
  productId: string,
  pkg: PackageConfig,
  occupancy: 'single' | 'double' | 'triple',
  occupantCount: number
): Promise<CreatedPrice> {
  const amount = pkg[occupancy];
  const nickname = `${pkg.name} - ${capitalize(occupancy)} (${occupantCount} occupant${occupantCount > 1 ? 's' : ''})`;

  // Create price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount * 100,
    currency: 'usd',
    nickname,
    metadata: {
      trip_id: tripConfig.tripId,
      package: pkg.name.toLowerCase(),
      occupancy,
      occupant_count: occupantCount.toString(),
      deposit_amount: pkg.deposit.toString(),
      travel_date: tripConfig.travelDate,
    },
  });

  // Create payment link with card saving enabled
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    payment_intent_data: {
      setup_future_usage: 'off_session', // SAVES CARD FOR AUTO-CHARGE
    },
    metadata: {
      trip_id: tripConfig.tripId,
      package: pkg.name.toLowerCase(),
      occupancy,
      price_id: price.id,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `https://latitudego.com/booking-success?trip=${tripConfig.tripId}&package=${pkg.name.toLowerCase()}&occupancy=${occupancy}`,
      },
    },
  });

  return {
    priceId: price.id,
    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.url,
  };
}

async function createDepositPriceWithLink(
  productId: string,
  pkg: PackageConfig
): Promise<CreatedPrice> {
  const nickname = `${pkg.name} - Deposit`;

  // Create deposit price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: pkg.deposit * 100,
    currency: 'usd',
    nickname,
    metadata: {
      trip_id: tripConfig.tripId,
      package: pkg.name.toLowerCase(),
      type: 'deposit',
      travel_date: tripConfig.travelDate,
    },
  });

  // Create payment link for deposit
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    payment_intent_data: {
      setup_future_usage: 'off_session',
    },
    metadata: {
      trip_id: tripConfig.tripId,
      package: pkg.name.toLowerCase(),
      type: 'deposit',
      price_id: price.id,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `https://latitudego.com/booking-success?trip=${tripConfig.tripId}&package=${pkg.name.toLowerCase()}&type=deposit`,
      },
    },
  });

  return {
    priceId: price.id,
    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.url,
  };
}

function printSummary(output: TripOutput) {
  console.log('\n');
  console.log('━'.repeat(70));
  console.log(`Payment Links for: ${output.tripName}`);
  console.log('━'.repeat(70));
  
  for (const [pkgName, prices] of Object.entries(output.packages)) {
    console.log(`\n📦 ${capitalize(pkgName)}`);
    console.log(`   Single:  ${prices.single.paymentLinkUrl}`);
    console.log(`   Double:  ${prices.double.paymentLinkUrl}`);
    console.log(`   Triple:  ${prices.triple.paymentLinkUrl}`);
    console.log(`   Deposit: ${prices.deposit.paymentLinkUrl}`);
  }
  
  console.log('\n' + '━'.repeat(70));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Run
createTripProducts().catch(console.error);
```

---

## Auto-Charge Flow

### When Customer Pays via Payment Link

1. **Stripe webhook fires:** `checkout.session.completed`
2. **Convex receives webhook:**
   - Extracts `customer_id`, `payment_method`, `metadata` (trip_id, package, occupancy)
   - Looks up full price from the product mapping
   - Calculates installment schedule (balance ÷ payments until 60 days before travel)
   - Stores booking + installments in DB

3. **Daily cron job:**
   - Finds installments due today
   - Charges saved card via `stripe.paymentIntents.create({ off_session: true })`
   - Handles retries on failure

### Installment Calculation (60-Day Rule)

```typescript
// Customer books Jan 15, travels June 1
// Cutoff = June 1 - 60 days = April 2

const bookingDate = new Date('2026-01-15');
const travelDate = new Date('2026-06-01');
const cutoffDate = subDays(travelDate, 60); // April 2

// If monthly payments:
// - Feb 15: $X
// - Mar 15: $X  
// - Apr 2: $X (final, adjusted to cutoff)
```

---

## Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Store the product mappings from script output
  trips: defineTable({
    tripId: v.string(),
    tripName: v.string(),
    travelDate: v.number(),
    stripeProductId: v.string(),
    packages: v.any(), // JSON from script output
    mode: v.union(v.literal("test"), v.literal("live")),
    createdAt: v.number(),
  })
    .index("by_trip_id", ["tripId"]),

  bookings: defineTable({
    // Customer
    stripeCustomerId: v.string(),
    stripePaymentMethodId: v.string(),
    customerEmail: v.string(),
    customerName: v.string(),
    
    // Trip/Package
    tripId: v.string(),
    packageName: v.string(),
    occupancy: v.union(v.literal("single"), v.literal("double"), v.literal("triple")),
    
    // Pricing
    totalAmount: v.number(),
    depositAmount: v.number(),
    amountPaid: v.number(),
    
    // Dates
    travelDate: v.number(),
    cutoffDate: v.number(),
    
    // Payment
    paymentFrequency: v.union(
      v.literal("weekly"),
      v.literal("bi-weekly"),
      v.literal("monthly"),
      v.literal("lump-sum")
    ),
    
    // Status
    status: v.union(
      v.literal("deposit_paid"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    createdAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_customer", ["stripeCustomerId"])
    .index("by_status", ["status"]),

  installments: defineTable({
    bookingId: v.id("bookings"),
    installmentNumber: v.number(),
    dueDate: v.number(),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    attempts: v.number(),
    nextRetryAt: v.optional(v.number()),
    stripePaymentIntentId: v.optional(v.string()),
    lastError: v.optional(v.string()),
    paidAt: v.optional(v.number()),
  })
    .index("by_booking", ["bookingId"])
    .index("by_due_date", ["dueDate"])
    .index("by_status", ["status"])
    .index("by_next_retry", ["nextRetryAt"]),
});
```

---

## Webhook Handler

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import Stripe from "stripe";

const http = httpRouter();

http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const stripe = getStripe();
    const body = await request.text();
    const sig = request.headers.get("stripe-signature")!;
    
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extract info from metadata
      const { trip_id, package: pkgName, occupancy } = session.metadata!;
      
      // Get customer and payment method
      const customerId = session.customer as string;
      const setupIntent = await stripe.setupIntents.retrieve(
        session.setup_intent as string
      );
      const paymentMethodId = setupIntent.payment_method as string;

      // Create booking in Convex
      await ctx.runMutation(internal.bookings.createFromCheckout, {
        stripeCustomerId: customerId,
        stripePaymentMethodId: paymentMethodId,
        customerEmail: session.customer_details?.email!,
        customerName: session.customer_details?.name!,
        tripId: trip_id,
        packageName: pkgName,
        occupancy,
        amountPaid: session.amount_total! / 100,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
```

---

## Cron Jobs

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process due installments daily at 6 AM EST (11 UTC)
crons.daily(
  "process-due-installments",
  { hourUTC: 11, minuteUTC: 0 },
  internal.payments.processDueInstallments
);

// Check for retries every minute
crons.interval(
  "process-retries", 
  { minutes: 1 },
  internal.payments.processRetries
);

export default crons;
```

---

## Retry Logic

| Attempt | Timing | Action |
|---------|--------|--------|
| 1 | Initial charge | First try |
| 2 | +1 minute | Immediate retry |
| 3 | +1 day | Daily retry |
| 4 | +2 days | Daily retry |
| 5 | +3 days | Daily retry |
| After 5 | - | Mark FAILED, notify admin |

---

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     ONE-TIME SETUP (per trip)                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Edit scripts/trip-config.ts with trip details               │
│  2. Run: npx ts-node scripts/create-trip-products.ts            │
│  3. Get Payment Links for each package/occupancy                │
│  4. Product mapping saved to output/[trip-id]-products.json     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER BOOKING                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Send Payment Link to customer                               │
│  2. Customer pays (deposit or full price)                       │
│  3. Card saved automatically                                    │
│  4. Webhook → Convex creates booking + installment schedule     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AUTO-CHARGE (ongoing)                        │
├─────────────────────────────────────────────────────────────────┤
│  Daily cron at 6 AM:                                            │
│  - Find installments due today                                  │
│  - Charge saved card                                            │
│  - Mark completed or schedule retry                             │
│  - Continue until 60 days before travel                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
Danny Stripe/
├── .env                          # Stripe keys
├── scripts/
│   └── create-trip-products.ts   # Master script
├── output/
│   └── [trip-id]-products.json   # Generated product mappings
├── convex/
│   ├── schema.ts                 # Database schema
│   ├── http.ts                   # Webhook handlers
│   ├── crons.ts                  # Scheduled jobs
│   ├── bookings.ts               # Booking mutations
│   ├── payments.ts               # Payment processing
│   └── lib/
│       ├── stripe.ts             # Stripe client helper
│       └── installments.ts       # Calculation logic
└── docs/
    ├── stripeflow.md             # Full documentation
    ├── simple_stripe.md          # Ad-hoc approach
    └── hybrid_stripe.md          # This file
```

---

## Next Steps

1. [ ] Add Stripe keys to `.env`
2. [ ] Install dependencies: `npm install stripe dotenv`
3. [ ] Create first trip config
4. [ ] Run script to create products
5. [ ] Set up Convex project
6. [ ] Implement webhook handler
7. [ ] Implement cron jobs
8. [ ] Test with Stripe CLI
9. [ ] Go live
