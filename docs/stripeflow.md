# Stripe Flow - Private Charter Flight Payments

**Project:** LatitudeGo Private Charter Payments  
**Backend:** Convex (TypeScript)  
**Frontend:** latitudego.com (WordPress + Fluent Forms)  
**Admin:** admin.latitudego.com (optional dashboard)

This document describes the payment logic for private charter flights, integrating Fluent Forms, Stripe, Uplift Flexpay, and Convex.

---

## Table of Contents

1. [Integration Overview](#integration-overview)
2. [Architecture](#architecture)
3. [Environment Configuration](#environment-configuration)
4. [Stripe Product Strategy](#stripe-product-strategy)
5. [Fluent Forms Integration](#fluent-forms-integration)
6. [Logic Requirements](#logic-requirements)
7. [Data Flow](#data-flow)
8. [Stripe Implementation Strategy](#stripe-implementation-strategy)
9. [Uplift Flexpay Integration](#uplift-flexpay-integration)
10. [Installment Calculation Logic](#installment-calculation-logic)
11. [Auto-Retry Logic](#auto-retry-logic)
12. [Refund Policy](#refund-policy)
13. [Convex Schema](#convex-schema)
14. [API Endpoints](#api-endpoints)
15. [Admin Dashboard](#admin-dashboard)
16. [Edge Cases](#edge-cases)

---

## Integration Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Fluent Forms   │ ───► │     Convex      │ ───► │     Stripe      │
│  (WordPress)    │      │   (Backend)     │      │   (Payments)    │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
                         ┌────────┴────────┐
                         │                 │
                         ▼                 ▼
                ┌─────────────────┐ ┌─────────────────┐
                │  Uplift Flexpay │ │ Admin Dashboard │
                │  (BNPL Option)  │ │ (Optional)      │
                └─────────────────┘ └─────────────────┘
```

### Key Components

1. **Fluent Forms (WordPress):** Entry point - captures ALL booking data including trip, package, pricing, dates, customer info.
2. **Convex (Backend):** Serverless TypeScript backend - handles webhooks, creates Stripe products/customers, schedules payments, manages retry logic.
3. **Stripe:** Payment processing - dynamic products created per trip/package, card-on-file for installments.
4. **Uplift Flexpay:** Alternative BNPL financing option.
5. **Admin Dashboard (Optional):** admin.latitudego.com - view bookings, payment status, manual interventions.

---

## Architecture

### Why Convex?

- **Real-time:** Automatic subscriptions for live updates.
- **TypeScript:** End-to-end type safety.
- **Scheduled Functions:** Built-in cron jobs for payment retries.
- **No Infrastructure:** Serverless, scales automatically.

### Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Convex (TypeScript) |
| Database | Convex (built-in) |
| Payments | Stripe API |
| BNPL | Uplift Flexpay API |
| Forms | Fluent Forms (WordPress) |
| Admin UI | React + Convex (optional) |

---

## Environment Configuration

### Environment Switching (Test/Live)

A single `STRIPE_MODE` environment variable controls which keys are used:

```env
# Mode: "test" or "live"
STRIPE_MODE=test

# Stripe Test Keys
STRIPE_TEST_SECRET_KEY=sk_test_xxx
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_xxx

# Stripe Live Keys
STRIPE_LIVE_SECRET_KEY=sk_live_xxx
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_LIVE_WEBHOOK_SECRET=whsec_live_xxx

# Uplift Flexpay
UPLIFT_API_KEY=xxx
UPLIFT_API_SECRET=xxx
UPLIFT_WEBHOOK_SECRET=xxx

# Fluent Forms
FLUENT_FORMS_WEBHOOK_SECRET=xxx

# App
CONVEX_URL=https://xxx.convex.cloud
ADMIN_EMAIL=admin@latitudego.com
```

### Convex Environment Helper

```typescript
// convex/lib/stripe.ts
import Stripe from 'stripe';

export function getStripeClient(): Stripe {
  const mode = process.env.STRIPE_MODE || 'test';
  const secretKey = mode === 'live' 
    ? process.env.STRIPE_LIVE_SECRET_KEY! 
    : process.env.STRIPE_TEST_SECRET_KEY!;
  
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
}

export function getStripeWebhookSecret(): string {
  const mode = process.env.STRIPE_MODE || 'test';
  return mode === 'live'
    ? process.env.STRIPE_LIVE_WEBHOOK_SECRET!
    : process.env.STRIPE_TEST_WEBHOOK_SECRET!;
}
```

---

## Stripe Product Strategy

### The Challenge

- Dozens of different trips
- Each trip has 4-12 packages
- Each package can have 1 or 2 occupants (different prices)
- Prices, dates, deposits vary per package
- Need flexibility without manual Stripe dashboard work

### Solution: Dynamic Product Creation

**Option A: Create Products On-Demand (Recommended)**

When Fluent Forms submits a booking, we:
1. Check if a Stripe Product exists for that trip/package combo
2. If not, create it dynamically
3. Create a Price for the specific amount
4. Use that Price for the checkout

```typescript
// Stripe Product naming convention
// Product: "Trip: Caribbean Escape 2026"
// Price: "Caribbean Escape - Gold Package - 2 Occupants - $4000"

async function getOrCreateStripeProduct(tripData: TripData): Promise<string> {
  const productName = `Trip: ${tripData.tripName}`;
  
  // Search for existing product
  const products = await stripe.products.search({
    query: `name:'${productName}'`,
  });
  
  if (products.data.length > 0) {
    return products.data[0].id;
  }
  
  // Create new product
  const product = await stripe.products.create({
    name: productName,
    metadata: {
      trip_id: tripData.tripId,
      created_by: 'fluent_forms_webhook',
    },
  });
  
  return product.id;
}

async function createPriceForBooking(
  productId: string, 
  amount: number, 
  packageName: string,
  occupants: number
): Promise<string> {
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amount * 100), // cents
    currency: 'usd',
    nickname: `${packageName} - ${occupants} Occupant(s) - $${amount}`,
    metadata: {
      package_name: packageName,
      occupants: occupants.toString(),
    },
  });
  
  return price.id;
}
```

**Option B: Bulk Product Creation Script**

Run a script to pre-create all products/prices for a trip:

```typescript
// scripts/create-trip-products.ts
async function createTripProducts(trip: TripConfig) {
  const product = await stripe.products.create({
    name: `Trip: ${trip.name}`,
    description: trip.description,
    metadata: { trip_id: trip.id },
  });

  for (const pkg of trip.packages) {
    for (const occupancy of [1, 2]) {
      const price = pkg.prices[occupancy];
      await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(price * 100),
        currency: 'usd',
        nickname: `${pkg.name} - ${occupancy} Occupant(s)`,
        metadata: {
          package_id: pkg.id,
          occupants: occupancy.toString(),
        },
      });
    }
  }
}
```

### Product/Price Metadata Strategy

Store rich metadata on Stripe objects for easy querying:

```typescript
// Product metadata
{
  trip_id: "caribbean-2026",
  trip_name: "Caribbean Escape 2026",
  travel_date: "2026-06-01",
  cutoff_date: "2026-04-02",
  source: "fluent_forms"
}

// Price metadata
{
  package_id: "gold",
  package_name: "Gold Package",
  occupants: "2",
  deposit_amount: "500",
  full_price: "4000"
}
```

---

## Fluent Forms Integration

### Expected Webhook Payload (Comprehensive)

Fluent Forms will send ALL booking data:

```json
{
  "form_id": "charter_booking_form",
  "submission_id": "12345",
  
  "customer_first_name": "John",
  "customer_last_name": "Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "customer_address_line1": "123 Main St",
  "customer_address_line2": "Apt 4B",
  "customer_city": "Miami",
  "customer_state": "FL",
  "customer_zip": "33101",
  "customer_country": "US",
  
  "trip_id": "caribbean-2026",
  "trip_name": "Caribbean Escape 2026",
  "package_id": "gold",
  "package_name": "Gold Package",
  "occupants": 2,
  
  "package_price": 4000,
  "deposit_amount": 500,
  "travel_date": "2026-06-01",
  "cutoff_date": "2026-04-02",
  
  "payment_frequency": "monthly",
  "payment_method": "stripe",
  
  "special_requests": "Window seat preference",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+1987654321"
}
```

### Fluent Forms Field Mapping

| Fluent Form Field | Convex Field | Description |
|-------------------|--------------|-------------|
| `customer_first_name` | `customerFirstName` | Customer first name |
| `customer_last_name` | `customerLastName` | Customer last name |
| `customer_email` | `customerEmail` | Customer email (required) |
| `customer_phone` | `customerPhone` | Customer phone |
| `customer_address_*` | `customerAddress` | Full address object |
| `trip_id` | `tripId` | Unique trip identifier |
| `trip_name` | `tripName` | Human-readable trip name |
| `package_id` | `packageId` | Package identifier |
| `package_name` | `packageName` | Human-readable package name |
| `occupants` | `occupants` | 1 or 2 |
| `package_price` | `totalAmount` | Full package price |
| `deposit_amount` | `depositAmount` | Initial deposit |
| `travel_date` | `travelDate` | Date of travel |
| `cutoff_date` | `cutoffDate` | Payment deadline (travel - 60 days) |
| `payment_frequency` | `paymentFrequency` | weekly/bi-weekly/monthly/lump-sum |
| `payment_method` | `paymentMethod` | stripe/uplift |

---

## Logic Requirements

| Requirement | Description |
|-------------|-------------|
| **Total Package Amount** | From Fluent Forms (`package_price`) |
| **Deposit Amount** | From Fluent Forms (`deposit_amount`) - variable per package |
| **Travel Date** | From Fluent Forms (`travel_date`) |
| **Cutoff Date** | From Fluent Forms (`cutoff_date`) - typically travel - 60 days |
| **Equal Payments** | Remaining balance split into equal installments |
| **Frequency Options** | Weekly, Bi-weekly, Monthly, Lump Sum |
| **Card on File** | Store only `customer_id`; Stripe holds card |
| **Auto-Charge** | Convex scheduled function charges on due dates |
| **Auto-Retry** | 1 min, then daily for 3 days on failure |
| **One Booking Per Transaction** | Single package per checkout |
| **Dynamic Products** | Stripe products created from Fluent Forms data |

---

## Data Flow

### Complete Flow

1. **Customer fills Fluent Form** on latitudego.com
   - Selects trip, package, occupants
   - Enters all personal info
   - Selects payment frequency (weekly/bi-weekly/monthly/lump-sum)
   - Selects payment method (Stripe or Uplift)

2. **Fluent Forms webhook fires** to Convex HTTP endpoint
   - `POST https://xxx.convex.site/webhooks/fluent-forms`

3. **Convex processes webhook:**
   - Validates payload
   - Creates/retrieves Stripe customer
   - Creates/retrieves Stripe product for trip
   - Creates Stripe price for this specific booking
   - Calculates installment schedule
   - Stores booking in Convex DB

4. **Convex returns checkout URL** to Fluent Forms
   - Stripe Checkout Session URL for deposit payment
   - OR Uplift redirect URL if customer chose Uplift

5. **Customer completes deposit payment**
   - Card saved for future use (`setup_future_usage: 'off_session'`)
   - Stripe sends webhook on success

6. **Convex receives Stripe webhook:**
   - Marks deposit as paid
   - Activates booking
   - Schedules first installment charge

7. **Convex scheduled function runs daily:**
   - Checks for installments due today
   - Attempts charge
   - On failure: schedules retry (1 min, then daily x3)

8. **On final payment:**
   - Booking marked as `completed`
   - Confirmation email sent

---

## Stripe Implementation Strategy

### 1. Customer Creation

```typescript
// convex/stripe/customers.ts
export async function getOrCreateCustomer(
  ctx: ActionCtx,
  customerData: CustomerData
): Promise<string> {
  const stripe = getStripeClient();
  
  // Check if customer exists
  const existing = await stripe.customers.list({
    email: customerData.email,
    limit: 1,
  });
  
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email: customerData.email,
    name: `${customerData.firstName} ${customerData.lastName}`,
    phone: customerData.phone,
    address: {
      line1: customerData.address.line1,
      line2: customerData.address.line2,
      city: customerData.address.city,
      state: customerData.address.state,
      postal_code: customerData.address.zip,
      country: customerData.address.country,
    },
    metadata: {
      source: 'fluent_forms',
    },
  });
  
  return customer.id;
}
```

### 2. Checkout Session for Deposit

```typescript
// convex/stripe/checkout.ts
export async function createDepositCheckout(
  ctx: ActionCtx,
  bookingId: Id<"bookings">,
  customerId: string,
  priceId: string,
  depositAmount: number
): Promise<string> {
  const stripe = getStripeClient();
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(depositAmount * 100),
        product_data: {
          name: 'Deposit - Charter Flight Booking',
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      setup_future_usage: 'off_session', // CRITICAL: saves card
      metadata: {
        booking_id: bookingId,
        type: 'deposit',
      },
    },
    success_url: `https://latitudego.com/booking-success?booking_id=${bookingId}`,
    cancel_url: `https://latitudego.com/booking-cancelled?booking_id=${bookingId}`,
    metadata: {
      booking_id: bookingId,
    },
  });
  
  return session.url!;
}
```

### 3. Off-Session Installment Charges

```typescript
// convex/stripe/charges.ts
export async function chargeInstallment(
  ctx: ActionCtx,
  installmentId: Id<"installments">,
  customerId: string,
  paymentMethodId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripeClient();
  
  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        installment_id: installmentId,
        type: 'installment',
      },
    });
    
    return { success: true };
  } catch (error: any) {
    if (error.code === 'authentication_required') {
      return { success: false, error: 'AUTHENTICATION_REQUIRED' };
    }
    if (error.code === 'card_declined') {
      return { success: false, error: 'CARD_DECLINED' };
    }
    return { success: false, error: error.message };
  }
}
```

---

## Uplift Flexpay Integration

### Full Integration Flow

When customer selects "Pay with Uplift":

1. **Create Uplift Order**
```typescript
// convex/uplift/orders.ts
export async function createUpliftOrder(
  ctx: ActionCtx,
  booking: BookingData
): Promise<string> {
  const response = await fetch('https://api.uplift.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.UPLIFT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order_id: booking.id,
      amount: booking.totalAmount * 100, // cents
      currency: 'USD',
      customer: {
        email: booking.customerEmail,
        first_name: booking.customerFirstName,
        last_name: booking.customerLastName,
        phone: booking.customerPhone,
      },
      items: [{
        name: booking.packageName,
        price: booking.totalAmount * 100,
        quantity: 1,
      }],
      redirect_url: `https://latitudego.com/booking-success?booking_id=${booking.id}`,
      webhook_url: `https://xxx.convex.site/webhooks/uplift`,
    }),
  });
  
  const data = await response.json();
  return data.checkout_url;
}
```

2. **Handle Uplift Webhook**
```typescript
// convex/http.ts - Uplift webhook handler
export async function handleUpliftWebhook(ctx: ActionCtx, body: any) {
  if (body.event === 'order.approved') {
    // Uplift approved - they pay you upfront
    // Mark booking as fully paid
    await ctx.runMutation(internal.bookings.markFullyPaid, {
      bookingId: body.order_id,
      paymentMethod: 'uplift',
      upliftOrderId: body.uplift_order_id,
    });
  }
}
```

### Uplift vs Stripe Decision

| Customer Choice | What Happens |
|-----------------|--------------|
| **Stripe Installments** | We manage payments; customer pays us directly over time |
| **Uplift Flexpay** | Uplift pays us upfront; customer pays Uplift over time |

---

## Installment Calculation Logic

### Formula

```
cutoffDate = from Fluent Forms (typically travelDate - 60 days)
balance = totalAmount - depositAmount
numberOfInstallments = calculateBasedOnFrequency(bookingDate, cutoffDate, frequency)
installmentAmount = balance / numberOfInstallments
```

### Convex Implementation

```typescript
// convex/lib/installments.ts
import { addWeeks, addMonths, isBefore, differenceInDays } from 'date-fns';

export type PaymentFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'lump-sum';

export interface InstallmentSchedule {
  dueDate: number; // Unix timestamp
  amount: number;
}

export function calculateInstallments(
  bookingDate: Date,
  cutoffDate: Date,
  balance: number,
  frequency: PaymentFrequency
): InstallmentSchedule[] {
  if (frequency === 'lump-sum' || isBefore(cutoffDate, bookingDate)) {
    return [{
      dueDate: cutoffDate.getTime(),
      amount: balance,
    }];
  }

  const installments: InstallmentSchedule[] = [];
  let nextDate = getNextPaymentDate(bookingDate, frequency);

  while (isBefore(nextDate, cutoffDate) || nextDate.getTime() === cutoffDate.getTime()) {
    installments.push({
      dueDate: nextDate.getTime(),
      amount: 0, // calculated below
    });
    nextDate = getNextPaymentDate(nextDate, frequency);
  }

  if (installments.length === 0) {
    return [{
      dueDate: cutoffDate.getTime(),
      amount: balance,
    }];
  }

  // Equal amounts with remainder on last payment
  const equalAmount = Math.floor((balance / installments.length) * 100) / 100;
  const lastAmount = balance - (equalAmount * (installments.length - 1));

  return installments.map((inst, i) => ({
    ...inst,
    amount: i === installments.length - 1 ? lastAmount : equalAmount,
  }));
}

function getNextPaymentDate(current: Date, frequency: PaymentFrequency): Date {
  switch (frequency) {
    case 'weekly': return addWeeks(current, 1);
    case 'bi-weekly': return addWeeks(current, 2);
    case 'monthly': return addMonths(current, 1);
    default: return current;
  }
}
```

---

## Auto-Retry Logic

### Retry Schedule

| Attempt | Timing | Action |
|---------|--------|--------|
| 1 | Immediately | Initial charge attempt |
| 2 | +1 minute | First retry |
| 3 | +1 day | Second retry |
| 4 | +2 days | Third retry |
| 5 | +3 days | Final retry |
| - | After 4th failure | Mark as FAILED, manual intervention |

### Convex Scheduled Function

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every minute to check for retries
crons.interval(
  "process-payment-retries",
  { minutes: 1 },
  internal.payments.processRetries
);

// Run daily at 6 AM to process due installments
crons.daily(
  "process-due-installments",
  { hourUTC: 11, minuteUTC: 0 }, // 6 AM EST
  internal.payments.processDueInstallments
);

export default crons;
```

```typescript
// convex/payments.ts
export const processRetries = internalAction({
  handler: async (ctx) => {
    const pendingRetries = await ctx.runQuery(internal.installments.getPendingRetries);
    
    for (const installment of pendingRetries) {
      const result = await chargeInstallment(
        ctx,
        installment._id,
        installment.stripeCustomerId,
        installment.paymentMethodId,
        installment.amount
      );
      
      if (result.success) {
        await ctx.runMutation(internal.installments.markPaid, {
          installmentId: installment._id,
        });
      } else {
        await ctx.runMutation(internal.installments.recordFailedAttempt, {
          installmentId: installment._id,
          error: result.error,
        });
      }
    }
  },
});
```

```typescript
// convex/installments.ts
export const recordFailedAttempt = internalMutation({
  args: { installmentId: v.id("installments"), error: v.string() },
  handler: async (ctx, { installmentId, error }) => {
    const installment = await ctx.db.get(installmentId);
    if (!installment) return;
    
    const attempts = installment.attempts + 1;
    const now = Date.now();
    
    let nextRetryAt: number | null = null;
    let status = installment.status;
    
    if (attempts === 1) {
      // Retry in 1 minute
      nextRetryAt = now + 60 * 1000;
    } else if (attempts === 2) {
      // Retry in 1 day
      nextRetryAt = now + 24 * 60 * 60 * 1000;
    } else if (attempts === 3) {
      // Retry in 1 day
      nextRetryAt = now + 24 * 60 * 60 * 1000;
    } else if (attempts === 4) {
      // Retry in 1 day
      nextRetryAt = now + 24 * 60 * 60 * 1000;
    } else {
      // Max retries reached - mark as failed
      status = 'failed';
      nextRetryAt = null;
      
      // Notify admin
      await ctx.scheduler.runAfter(0, internal.notifications.notifyAdminPaymentFailed, {
        installmentId,
      });
    }
    
    await ctx.db.patch(installmentId, {
      attempts,
      lastError: error,
      nextRetryAt,
      status,
      updatedAt: now,
    });
  },
});
```

---

## Refund Policy

Based on https://latitudego.com/refund-policy/:

### Key Points

| Scenario | Refund Policy |
|----------|---------------|
| **Cooling-off period (3 business days)** | Full refund if cancelled within 3 business days of account going live |
| **Within 30 days of subscription** | No refund; responsible for initial 30 days; no further payments due |
| **After 30 days** | Must pay remainder of term; no refunds |
| **Technical issues (our fault)** | Eligible for refund if not resolved within 30 days |

### Implementation

```typescript
// convex/refunds.ts
export const processRefundRequest = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.string(),
  },
  handler: async (ctx, { bookingId, reason }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) throw new Error("Booking not found");
    
    const daysSinceBooking = differenceInDays(new Date(), new Date(booking.createdAt));
    
    let refundEligibility: 'full' | 'partial' | 'none';
    let refundAmount = 0;
    
    if (daysSinceBooking <= 3) {
      // Cooling-off period - full refund
      refundEligibility = 'full';
      refundAmount = booking.amountPaid;
    } else if (daysSinceBooking <= 30) {
      // Within 30 days - no refund but no further payments
      refundEligibility = 'none';
      // Cancel future installments
      await ctx.runMutation(internal.installments.cancelFutureInstallments, { bookingId });
    } else {
      // After 30 days - must pay remainder
      refundEligibility = 'none';
    }
    
    await ctx.db.insert("refundRequests", {
      bookingId,
      reason,
      eligibility: refundEligibility,
      refundAmount,
      status: 'pending_review',
      createdAt: Date.now(),
    });
    
    // Notify admin for review
    await ctx.scheduler.runAfter(0, internal.notifications.notifyAdminRefundRequest, {
      bookingId,
    });
  },
});
```

---

## Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookings: defineTable({
    // Customer Info
    stripeCustomerId: v.string(),
    customerEmail: v.string(),
    customerFirstName: v.string(),
    customerLastName: v.string(),
    customerPhone: v.optional(v.string()),
    customerAddress: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      country: v.string(),
    })),
    
    // Trip Info
    tripId: v.string(),
    tripName: v.string(),
    packageId: v.string(),
    packageName: v.string(),
    occupants: v.number(),
    
    // Pricing
    totalAmount: v.number(),
    depositAmount: v.number(),
    amountPaid: v.number(),
    
    // Dates
    travelDate: v.number(), // Unix timestamp
    cutoffDate: v.number(), // Unix timestamp
    
    // Payment Config
    paymentFrequency: v.union(
      v.literal("weekly"),
      v.literal("bi-weekly"),
      v.literal("monthly"),
      v.literal("lump-sum")
    ),
    paymentMethod: v.union(v.literal("stripe"), v.literal("uplift")),
    
    // Stripe References
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripePaymentMethodId: v.optional(v.string()),
    
    // Uplift References
    upliftOrderId: v.optional(v.string()),
    
    // Status
    status: v.union(
      v.literal("pending_deposit"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("refunded")
    ),
    
    // Fluent Forms Reference
    fluentFormSubmissionId: v.string(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer_email", ["customerEmail"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_status", ["status"])
    .index("by_trip", ["tripId"]),

  installments: defineTable({
    bookingId: v.id("bookings"),
    
    dueDate: v.number(), // Unix timestamp
    amount: v.number(),
    
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Retry tracking
    attempts: v.number(),
    lastError: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
    
    // Stripe Reference
    stripePaymentIntentId: v.optional(v.string()),
    
    // Timestamps
    chargedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_booking", ["bookingId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"])
    .index("by_next_retry", ["nextRetryAt"]),

  refundRequests: defineTable({
    bookingId: v.id("bookings"),
    reason: v.string(),
    eligibility: v.union(v.literal("full"), v.literal("partial"), v.literal("none")),
    refundAmount: v.number(),
    status: v.union(
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("processed")
    ),
    adminNotes: v.optional(v.string()),
    stripeRefundId: v.optional(v.string()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_booking", ["bookingId"])
    .index("by_status", ["status"]),

  trips: defineTable({
    tripId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    travelDate: v.number(),
    cutoffDate: v.number(),
    stripeProductId: v.optional(v.string()),
    packages: v.array(v.object({
      packageId: v.string(),
      name: v.string(),
      price1Occupant: v.number(),
      price2Occupants: v.number(),
      depositAmount: v.number(),
    })),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_trip_id", ["tripId"])
    .index("by_active", ["isActive"]),
});
```

---

## API Endpoints

### Convex HTTP Endpoints

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Fluent Forms Webhook
http.route({
  path: "/webhooks/fluent-forms",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    // Validate webhook signature
    // Process booking
    const result = await ctx.runAction(internal.bookings.processFluentFormsWebhook, { body });
    return new Response(JSON.stringify(result), { status: 200 });
  }),
});

// Stripe Webhook
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    await ctx.runAction(internal.stripe.handleWebhook, { body, signature });
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }),
});

// Uplift Webhook
http.route({
  path: "/webhooks/uplift",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    await ctx.runAction(internal.uplift.handleWebhook, { body });
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }),
});

export default http;
```

---

## Admin Dashboard

### Do You Need One?

**You have:** Stripe Dashboard + Convex Dashboard

**What they provide:**
- Stripe: Payment history, customer details, refunds, disputes
- Convex: Database records, function logs, scheduled jobs

**What's missing:**
- Unified view of bookings + payments
- Quick actions (retry payment, cancel booking, issue refund)
- Trip/package management
- Overdue payment alerts

### Recommendation

**Yes, build a simple admin dashboard** at `admin.latitudego.com`:

- Password protected (basic auth or Clerk/Auth0)
- React + Convex (real-time updates)
- Key features:
  - Booking list with filters (by trip, status, date)
  - Booking detail view (customer info, payment schedule, history)
  - Manual actions (retry payment, cancel, refund)
  - Trip management (create/edit trips and packages)
  - Overdue payments alert

### Simple Admin Stack

```
admin.latitudego.com
├── React (Vite)
├── Convex (same backend)
├── TailwindCSS
├── shadcn/ui components
└── Basic Auth (password protected)
```

---

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Booking date after cutoff date | Full balance due immediately (lump sum) |
| Customer changes payment method | Update in Stripe; sync to Convex |
| Duplicate form submission | Check by email + trip + travel date |
| Stripe webhook before redirect | Idempotent; check if already processed |
| Customer disputes charge | Stripe handles; admin notified |
| Travel date changes | Recalculate cutoff and remaining installments |
| Card expires before final payment | Notify customer; manual update required |
| Uplift application denied | Fallback to Stripe installments |
| Partial payment (installment < $1) | Round up; adjust final payment |

---

## Open Questions (Resolved)

- [x] Deposit amount: **Variable from Fluent Forms**
- [x] Auto-retry: **Yes - 1 min, then daily for 3 days**
- [x] Refund policy: **Per latitudego.com/refund-policy**
- [x] Payment reminders: **Stripe sends receipts**
- [x] Admin dashboard: **Yes - admin.latitudego.com**
- [x] Backend: **Convex (TypeScript)**
- [x] Environment switching: **STRIPE_MODE env var (test/live)**

---

## Next Steps

1. [ ] Set up Convex project
2. [ ] Configure environment variables (test keys first)
3. [ ] Implement Convex schema
4. [ ] Build Fluent Forms webhook handler
5. [ ] Implement Stripe product/price creation
6. [ ] Implement installment calculation
7. [ ] Implement auto-retry logic
8. [ ] Build Uplift Flexpay integration
9. [ ] Build admin dashboard (admin.latitudego.com)
10. [ ] Test end-to-end flow
11. [ ] Switch to live keys

