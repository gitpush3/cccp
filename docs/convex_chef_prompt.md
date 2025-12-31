# Convex Chef Prompt: LatitudeGo Full-Stack Payment System

Please implement the following full-stack system for a private charter flight payment system.

**Tech Stack:**
- **Backend:** Convex (TypeScript)
- **Auth:** Clerk
- **Frontend:** React (Next.js or Vite) with Tailwind CSS, Lucide Icons, and shadcn/ui
- **Deployment:** Vercel

## Branding: LatitudeGo

**Industry:** Private Charter Airline / Luxury Group Travel

**Logo:** Located at `/logo (1).png`
- Geometric mountain/plane icon with gradient (purple to cyan)
- "LATITUDE" in dark charcoal (#333333)
- "GO" in bright cyan (#00D4FF)

**Color Palette:**
| Name | Hex | Usage |
|------|-----|-------|
| Primary Cyan | `#00D4FF` | CTAs, links, progress bars, accents |
| Primary Purple | `#9B59B6` | Gradient start, secondary accents |
| Dark Charcoal | `#2D2D2D` | Headings, primary text |
| Light Gray | `#F5F5F5` | Backgrounds (light mode) |
| Dark Background | `#1A1A2E` | Backgrounds (dark mode) |
| Success Green | `#10B981` | Paid/completed status |
| Warning Amber | `#F59E0B` | Pending status |
| Error Red | `#EF4444` | Failed status |

**Design Direction:**
- Modern, clean, premium feel befitting luxury travel
- Gradient accents (purple → cyan) for visual interest
- Generous whitespace, elegant typography (Inter or similar)
- Cards with subtle shadows and rounded corners
- Dark mode as default (travelers often book at night)

## 1. Database Schema (`convex/schema.ts`)

```typescript
// Users table - linked to Clerk, matched by email from Stripe
users: defineTable({
  clerkId: v.optional(v.string()),      // Set when they sign up on vip.latitudego.com
  email: v.string(),                     // Primary identifier (from Stripe checkout)
  name: v.optional(v.string()),
  phone: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"]),

// Trips table - metadata about each charter trip (populated from script output)
trips: defineTable({
  tripId: v.string(),                    // e.g., "caribbean-2026"
  tripName: v.string(),                  // e.g., "Caribbean Escape 2026"
  travelDate: v.number(),                // Unix timestamp
  stripeProductId: v.string(),
  packages: v.any(),                     // JSON: { bronze: { single: { priceId, amount }, ... } }
  mode: v.union(v.literal("test"), v.literal("live")),
  createdAt: v.number(),
})
  .index("by_trip_id", ["tripId"]),

// Bookings table - one per purchase (can have multiple travelers)
bookings: defineTable({
  // Owner (the person paying)
  userId: v.id("users"),
  stripeCustomerId: v.string(),
  stripePaymentMethodId: v.string(),
  
  // Trip/Package
  tripId: v.string(),
  packageName: v.string(),               // e.g., "gold"
  occupancy: v.string(),                 // e.g., "single", "double", "charter" (for 400 ppl)
  
  // Pricing
  totalAmount: v.number(),               // Full price
  depositAmount: v.number(),             // Initial deposit paid
  amountPaid: v.number(),                // Running total paid
  
  // Dates
  bookingDate: v.number(),
  travelDate: v.number(),
  cutoffDate: v.number(),                // travelDate - 60 days
  
  // Payment Schedule (CHANGEABLE by user on VIP portal)
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
    v.literal("cancelled"),
    v.literal("refunded")
  ),
  
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_trip", ["tripId"])
  .index("by_status", ["status"])
  .index("by_stripe_customer", ["stripeCustomerId"]),

// Travelers table - people on the booking (up to 400 for full charter)
travelers: defineTable({
  bookingId: v.id("bookings"),
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  passportNumber: v.optional(v.string()),
  specialRequests: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_booking", ["bookingId"]),

// Installments table - scheduled payments
installments: defineTable({
  bookingId: v.id("bookings"),
  installmentNumber: v.number(),
  dueDate: v.number(),
  amount: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled")                // If user pays off early
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

// Email log - track all emails sent
emailLog: defineTable({
  bookingId: v.optional(v.id("bookings")),
  userId: v.optional(v.id("users")),
  emailType: v.string(),                 // "welcome", "payment_success", "payment_failed", "reminder", etc.
  recipient: v.string(),
  subject: v.string(),
  sentAt: v.number(),
  sendgridMessageId: v.optional(v.string()),
})
  .index("by_booking", ["bookingId"])
  .index("by_user", ["userId"]),
```

## 2. Authentication (Clerk)
- Set up Clerk integration with Convex.
- Use `ctx.auth.getUserIdentity()` in queries/mutations.
- **Email-based account linking:** When user signs up on `vip.latitudego.com`, match their Clerk email to existing `users` record (created from Stripe checkout). Update `clerkId` field.

## 3. Stripe Client (`convex/lib/stripe.ts`)
Implement a helper to initialize Stripe using environment variables:
- `STRIPE_MODE` (test/live)
- `STRIPE_TEST_SECRET_KEY` / `STRIPE_LIVE_SECRET_KEY`

## 4. SendGrid Client (`convex/lib/sendgrid.ts`)
Implement email sending via SendGrid API:
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL` (e.g., `bookings@latitudego.com`)

**Email Types:**
| Event | Recipient | Template |
|-------|-----------|----------|
| Deposit paid | Customer | Welcome + VIP portal invite link |
| Installment charged | Customer | Payment confirmation |
| Payment failed | Customer + Admin | Alert with retry info |
| Frequency changed | Admin | Notification |
| Pay-off early | Admin | Notification |
| Booking completed | Customer | Final confirmation |

## 5. Installment Logic (`convex/lib/installments.ts`)
- `calculateInstallments(bookingDate, cutoffDate, balance, frequency)` → array of installments
- `recalculateInstallments(bookingId, newFrequency)` → **deletes pending installments, creates new schedule**
  - This is called when user changes frequency on VIP portal
  - Only affects PENDING installments, not completed ones

## 6. HTTP Endpoints (`convex/http.ts`)

**`POST /api/trips/upsert`** (called by create-trip-products.ts script):
- Receives trip data from the script after Stripe products are created
- Upserts into `trips` table (update if tripId exists, create if not)
- No auth required (or use CONVEX_DEPLOY_KEY for security)

**`POST /webhooks/stripe`**:
1. Verify signature
2. Handle `checkout.session.completed`:
   - Create/find `users` record by email
   - Create `bookings` record
   - Calculate and create `installments`
   - Send welcome email via SendGrid with VIP portal link
3. Handle `payment_intent.succeeded` (for installments):
   - Update installment status
   - Update booking `amountPaid`
   - Send confirmation email
4. Handle `payment_intent.payment_failed`:
   - Update installment status + schedule retry
   - Send failure email to customer + admin

## 7. Backend Logic

**`convex/bookings.ts`:**
- `getMyBookings()` - list all bookings for logged-in user
- `getBookingDetails(bookingId)` - full booking with travelers + installments
- `updatePaymentFrequency(bookingId, newFrequency)` - recalculates schedule
- `payOffEarly(bookingId)` - charges remaining balance immediately, cancels pending installments

**`convex/travelers.ts`:**
- `addTraveler(bookingId, travelerData)` - add traveler to booking
- `updateTraveler(travelerId, data)` - edit traveler info
- `removeTraveler(travelerId)` - remove from booking
- `getTravelers(bookingId)` - list all travelers

**`convex/payments.ts`:**
- `processDueInstallments()` - cron: find due, charge, update
- `processRetries()` - cron: retry failed (1 min → 1 day → 2 days → 3 days)
- `chargeInstallment(installmentId)` - manual charge (for admin)

**`convex/crons.ts`:**
- Daily at 6 AM EST: `processDueInstallments`
- Every 1 minute: `processRetries`

## 8. Frontend: VIP Portal (`vip.latitudego.com`)

### Pages:

**Landing/Login:**
- Clerk `SignIn` / `SignUp` (email-based to match Stripe)
- Hero with LatitudeGo branding

**Dashboard (`/`):**
- List of all user's bookings (cards)
- Each card shows: Trip name, travel date, progress bar, next payment date

**Booking Detail (`/booking/[id]`):**
- **Header:** Trip name, package, travel date, status badge
- **Progress Card:** "Paid $2,500 of $8,000" with animated progress bar
- **Payment Frequency Selector:** Dropdown to change (weekly/bi-weekly/monthly/lump-sum)
  - Shows preview of new schedule before confirming
  - "Update Schedule" button recalculates installments
- **Pay Off Early Button:** Shows remaining balance, confirms, charges immediately
- **Installment Timeline:** Visual timeline of all payments (past + future)
  - Green checkmarks for paid
  - Amber clock for pending
  - Red X for failed (with retry info)
- **Travelers Section:** List/add/edit travelers on this booking
- **Payment Method Card:** Last 4 digits, "Update Card" → Stripe Portal
- **60-Day Notice:** Clear callout about payoff deadline

**Traveler Management (`/booking/[id]/travelers`):**
- Add/edit/remove travelers
- Fields: Name, email, phone, DOB, passport (optional), special requests

## 9. Admin Dashboard (LOW PRIORITY)

**URL:** `admin.latitudego.com` (or `/admin` route with role check)

**Features:**
- **Bookings List:** Paginated, searchable by email/name/trip
- **Booking Detail:** Same as VIP but with admin actions:
  - Manual retry payment
  - Issue refund (partial or full)
  - Change status
  - View email log
- **Payments:** List of all installments across all bookings, filterable by status
- **No trip creation** - that stays in WordPress/Fluent Forms

## 10. Stripe Customer Portal Action
`createPortalSession(bookingId)` → returns URL for customer to manage their card

## 11. Environment Variables

```env
# Stripe
STRIPE_MODE=test
STRIPE_TEST_SECRET_KEY=sk_test_xxx
STRIPE_LIVE_SECRET_KEY=sk_live_xxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_xxx
STRIPE_LIVE_WEBHOOK_SECRET=whsec_xxx

# Clerk
CLERK_SECRET_KEY=sk_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx

# SendGrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=bookings@latitudego.com

# Admin
ADMIN_EMAIL=admin@latitudego.com
```

