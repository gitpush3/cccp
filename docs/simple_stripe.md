# Simple Stripe Integration - LatitudeGo

**Approach:** Ad-hoc pricing (no pre-created Stripe products)  
**Source of Truth:** Fluent Forms  
**Backend:** Convex (TypeScript)

---

## Overview

This is the simplified approach where:
- **Fluent Forms controls everything** - package names, prices, deposits, dates
- **Stripe has zero pre-created products** - we use `price_data` for every charge
- **Card on file** - captured during deposit, auto-charged for installments

```
Fluent Forms → Convex → Stripe (ad-hoc charges)
     ↓
  [package_name, amount, deposit, frequency, dates]
```

---

## How It Works

### 1. Customer Fills Fluent Form

Form captures:
- `package_name`: "Caribbean Escape - Gold Package"
- `total_amount`: 4000
- `deposit_amount`: 500
- `occupants`: 2
- `travel_date`: "2026-06-01"
- `cutoff_date`: "2026-04-02" (or calculated as travel - 60 days)
- `payment_frequency`: "monthly" | "bi-weekly" | "weekly" | "lump-sum"
- Customer info (email, name, phone, address)

### 2. Webhook Hits Convex

Fluent Forms POSTs to `https://xxx.convex.site/webhooks/fluent-forms`

### 3. Convex Creates Stripe Customer + Checkout

```typescript
// Create customer (or find existing)
const customer = await stripe.customers.create({
  email: formData.customer_email,
  name: formData.customer_name,
});

// Create checkout for DEPOSIT only (ad-hoc pricing)
const session = await stripe.checkout.sessions.create({
  customer: customer.id,
  mode: 'payment',
  line_items: [{
    price_data: {
      currency: 'usd',
      unit_amount: formData.deposit_amount * 100, // cents
      product_data: {
        name: `Deposit - ${formData.package_name}`,
        description: `${formData.occupants} occupant(s) | Travel: ${formData.travel_date}`,
      },
    },
    quantity: 1,
  }],
  payment_intent_data: {
    setup_future_usage: 'off_session', // SAVES CARD FOR LATER
  },
  success_url: 'https://latitudego.com/booking-success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://latitudego.com/booking-cancelled',
});
```

### 4. Customer Pays Deposit

- Card is saved automatically (`setup_future_usage: 'off_session'`)
- Stripe webhook confirms payment
- Convex stores booking + calculates installment schedule

### 5. Auto-Charge Installments

Convex cron job runs daily, charges due installments:

```typescript
// No products needed - just charge the amount
const paymentIntent = await stripe.paymentIntents.create({
  amount: installment.amount * 100, // cents
  currency: 'usd',
  customer: booking.stripeCustomerId,
  payment_method: booking.stripePaymentMethodId,
  off_session: true,
  confirm: true,
  description: `Installment ${installment.number} - ${booking.packageName}`,
  metadata: {
    booking_id: booking.id,
    installment_id: installment.id,
  },
});
```

---

## Installment Calculation

Based on `payment_frequency` from Fluent Forms:

| Frequency | Logic |
|-----------|-------|
| `weekly` | Charge every 7 days until cutoff |
| `bi-weekly` | Charge every 14 days until cutoff |
| `monthly` | Charge same day each month until cutoff |
| `lump-sum` | Single charge for full balance at cutoff |

### Example: Monthly

- **Booking Date:** Jan 15
- **Cutoff Date:** April 2
- **Total:** $4,000 | **Deposit:** $500 | **Balance:** $3,500
- **Installments:** 
  - Feb 15: $1,166.67
  - Mar 15: $1,166.67
  - Apr 2: $1,166.66 (final, adjusted to cutoff)

### Example: Late Booking

- **Booking Date:** March 20
- **Cutoff Date:** April 2
- **Balance:** $3,500
- **Frequency:** Weekly → Only 2 weeks available
- **Installments:**
  - Mar 27: $1,750
  - Apr 2: $1,750

---

## Retry Logic

When auto-charge fails:

| Attempt | Timing |
|---------|--------|
| 1 | Immediately (initial) |
| 2 | +1 minute |
| 3 | +1 day |
| 4 | +2 days |
| 5 | +3 days |
| After 5 | Mark FAILED → Manual intervention |

---

## What Stripe Sees

With this approach, your Stripe dashboard shows:
- **Customers** - one per booking
- **Payments** - deposit + installments (no product links)
- **Payment descriptions** - "Deposit - Caribbean Escape Gold Package"

You do NOT see:
- Product catalog
- Price lists
- SKUs

**This is fine.** Your reporting/analytics comes from Convex, not Stripe.

---

## Fluent Forms Webhook Payload

```json
{
  "form_id": "charter_booking",
  "submission_id": "12345",
  
  "customer_email": "john@example.com",
  "customer_first_name": "John",
  "customer_last_name": "Doe",
  "customer_phone": "+1234567890",
  "customer_address_line1": "123 Main St",
  "customer_city": "Miami",
  "customer_state": "FL",
  "customer_zip": "33101",
  "customer_country": "US",
  
  "trip_name": "Caribbean Escape 2026",
  "package_name": "Gold Package",
  "occupants": 2,
  
  "total_amount": 4000,
  "deposit_amount": 500,
  "travel_date": "2026-06-01",
  "cutoff_date": "2026-04-02",
  "payment_frequency": "monthly"
}
```

---

## Convex Schema (Simplified)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookings: defineTable({
    // Customer
    stripeCustomerId: v.string(),
    stripePaymentMethodId: v.optional(v.string()),
    customerEmail: v.string(),
    customerName: v.string(),
    
    // Package (from Fluent Forms - NO Stripe product IDs)
    tripName: v.string(),
    packageName: v.string(),
    occupants: v.number(),
    
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
      v.literal("pending_deposit"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    createdAt: v.number(),
  })
    .index("by_email", ["customerEmail"])
    .index("by_status", ["status"]),

  installments: defineTable({
    bookingId: v.id("bookings"),
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
    createdAt: v.number(),
  })
    .index("by_booking", ["bookingId"])
    .index("by_due_date", ["dueDate"])
    .index("by_status", ["status"])
    .index("by_next_retry", ["nextRetryAt"]),
});
```

---

## Environment Variables

```env
# Mode: "test" or "live"
STRIPE_MODE=test

# Stripe Test
STRIPE_TEST_SECRET_KEY=sk_test_xxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_xxx

# Stripe Live
STRIPE_LIVE_SECRET_KEY=sk_live_xxx
STRIPE_LIVE_WEBHOOK_SECRET=whsec_live_xxx

# Admin
ADMIN_EMAIL=admin@latitudego.com
```

---

## Key Code: Stripe Helper

```typescript
// convex/lib/stripe.ts
import Stripe from 'stripe';

export function getStripe(): Stripe {
  const mode = process.env.STRIPE_MODE || 'test';
  const key = mode === 'live' 
    ? process.env.STRIPE_LIVE_SECRET_KEY! 
    : process.env.STRIPE_TEST_SECRET_KEY!;
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
}
```

---

## Key Code: Create Checkout (Deposit)

```typescript
// convex/stripe/checkout.ts
export async function createDepositCheckout(
  customerId: string,
  booking: {
    packageName: string;
    tripName: string;
    occupants: number;
    depositAmount: number;
    travelDate: string;
  }
): Promise<string> {
  const stripe = getStripe();
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(booking.depositAmount * 100),
        product_data: {
          name: `Deposit - ${booking.packageName}`,
          description: `${booking.tripName} | ${booking.occupants} occupant(s) | Travel: ${booking.travelDate}`,
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      setup_future_usage: 'off_session',
    },
    success_url: `https://latitudego.com/booking-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://latitudego.com/booking-cancelled`,
  });
  
  return session.url!;
}
```

---

## Key Code: Charge Installment

```typescript
// convex/stripe/charges.ts
export async function chargeInstallment(
  customerId: string,
  paymentMethodId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  const stripe = getStripe();
  
  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description,
    });
    
    return { success: true, paymentIntentId: intent.id };
  } catch (err: any) {
    return { success: false, error: err.code || err.message };
  }
}
```

---

## Key Code: Calculate Installments

```typescript
// convex/lib/installments.ts
import { addWeeks, addMonths, isBefore } from 'date-fns';

type Frequency = 'weekly' | 'bi-weekly' | 'monthly' | 'lump-sum';

interface Installment {
  dueDate: number;
  amount: number;
}

export function calculateInstallments(
  bookingDate: Date,
  cutoffDate: Date,
  balance: number,
  frequency: Frequency
): Installment[] {
  // Lump sum or past cutoff = single payment
  if (frequency === 'lump-sum' || isBefore(cutoffDate, bookingDate)) {
    return [{ dueDate: cutoffDate.getTime(), amount: balance }];
  }

  const dates: Date[] = [];
  let next = getNextDate(bookingDate, frequency);
  
  while (isBefore(next, cutoffDate) || next.getTime() === cutoffDate.getTime()) {
    dates.push(next);
    next = getNextDate(next, frequency);
  }

  // If no dates fit, lump sum at cutoff
  if (dates.length === 0) {
    return [{ dueDate: cutoffDate.getTime(), amount: balance }];
  }

  // Split evenly, remainder on last
  const base = Math.floor((balance / dates.length) * 100) / 100;
  const last = balance - base * (dates.length - 1);

  return dates.map((d, i) => ({
    dueDate: d.getTime(),
    amount: i === dates.length - 1 ? last : base,
  }));
}

function getNextDate(from: Date, freq: Frequency): Date {
  switch (freq) {
    case 'weekly': return addWeeks(from, 1);
    case 'bi-weekly': return addWeeks(from, 2);
    case 'monthly': return addMonths(from, 1);
    default: return from;
  }
}
```

---

## Cron Job: Process Due Installments

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for due installments every day at 6 AM EST
crons.daily(
  "process-installments",
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

## Summary: Why This Is Simpler

| Before (Complex) | After (Simple) |
|------------------|----------------|
| Create 12 Stripe products per trip | Zero Stripe products |
| Manage product IDs in forms | Forms just send amounts |
| Update Stripe when prices change | Update only Fluent Forms |
| Product ID mapping code | Just use `price_data` |
| Stripe is source of truth | Fluent Forms is source of truth |

**Trade-off:** Your Stripe dashboard won't have a nice product catalog. But you don't need it - Convex has all your booking data.

---

## Next Steps

1. [ ] Set up Convex project (`npx convex dev`)
2. [ ] Add environment variables to Convex
3. [ ] Implement schema
4. [ ] Build webhook handler
5. [ ] Build installment processor
6. [ ] Test with Stripe CLI (`stripe listen --forward-to`)
7. [ ] Connect Fluent Forms webhook
8. [ ] Test end-to-end
