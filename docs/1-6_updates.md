# January 6, 2026 - Trip Booking System Build Summary

This document outlines all the files and systems created during this session that need to be replicated in the correct project (LatitudeGo Bookings).

---

## Overview

We built a complete **Trip Booking System** with:
- Advisor/affiliate attribution and commission tracking
- Stripe Checkout for deposits + installment payments
- 3 trip page templates with dynamic content
- User dashboard for managing bookings and payments
- Admin "god mode" dashboard for full visibility
- QR code generation for referral links

---

## Files Created/Modified

### 1. Convex Backend (Database & API)

#### NEW FILES:

| File | Purpose |
|------|---------|
| `convex/bookings.ts` | Queries/mutations for bookings, installments, user lookups by referral code |
| `convex/bookingsActions.ts` | Actions requiring Node.js runtime: `createBookingWithDeposit`, `payInstallment` |
| `convex/trips.ts` | CRUD for trips and packages |
| `convex/admin.ts` | Admin dashboard queries: stats, all bookings, all users, pending payments |
| `convex/webhooks.ts` | Webhook action for external notifications (WP Fusion, etc.) |
| `convex/formSubmissionsActions.ts` | Moved Node.js actions out of formSubmissions.ts |

#### MODIFIED FILES:

| File | Changes |
|------|---------|
| `convex/schema.ts` | Added tables: `trips`, `packages`, `bookings`, `installments` (lines 545-628) |
| `convex/stripe.ts` | Added webhook handling for `trip_deposit` and `trip_installment` payments, commission processing |
| `convex/formSubmissions.ts` | Refactored to remove Node.js runtime dependency |

---

### 2. Schema Additions (convex/schema.ts)

```typescript
// ===== TRIP BOOKING SYSTEM (Source of Truth) =====

trips: defineTable({
  title: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  startDate: v.string(),
  endDate: v.string(),
  cutoffDate: v.string(),
  status: v.union(v.literal("draft"), v.literal("published"), v.literal("completed"), v.literal("cancelled")),
  template: v.union(v.literal("1"), v.literal("2"), v.literal("3")),
  heroImageUrl: v.optional(v.string()),
  heroImageStorageId: v.optional(v.id("_storage")),
  heroTagline: v.optional(v.string()),
  galleryImages: v.optional(v.array(v.string())),
  itinerary: v.optional(v.array(v.object({
    day: v.number(),
    title: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
  }))),
  highlights: v.optional(v.array(v.string())),
  included: v.optional(v.array(v.string())),
  excluded: v.optional(v.array(v.string())),
  destination: v.optional(v.string()),
  meetingPoint: v.optional(v.string()),
  longDescription: v.optional(v.string()),
  videoUrl: v.optional(v.string()),
  metaTitle: v.optional(v.string()),
  metaDescription: v.optional(v.string()),
  wpId: v.optional(v.number()),
}).index("by_slug", ["slug"]),

packages: defineTable({
  tripId: v.id("trips"),
  title: v.string(),
  price: v.number(),
  depositAmount: v.number(),
  description: v.optional(v.string()),
  maxSeats: v.optional(v.number()),
  inventory: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("sold_out"), v.literal("inactive")),
}).index("by_trip", ["tripId"]),

bookings: defineTable({
  userId: v.id("users"),
  tripId: v.id("trips"),
  packageId: v.id("packages"),
  advisorId: v.optional(v.id("users")),
  totalAmount: v.number(),
  depositPaid: v.number(),
  status: v.union(
    v.literal("pending_deposit"),
    v.literal("confirmed"),
    v.literal("fully_paid"),
    v.literal("cancelled"),
    v.literal("refunded")
  ),
  stripeSubscriptionId: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_trip", ["tripId"])
  .index("by_advisor", ["advisorId"])
  .index("by_status", ["status"]),

installments: defineTable({
  bookingId: v.id("bookings"),
  amount: v.number(),
  dueDate: v.number(),
  status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed"), v.literal("void")),
  stripeInvoiceId: v.optional(v.string()),
  paidAt: v.optional(v.number()),
}).index("by_booking", ["bookingId"]),
```

---

### 3. Frontend Pages (React + Tailwind)

#### NEW FILES:

| File | Purpose |
|------|---------|
| `src/pages/trips/index.tsx` | Trip listing page (`/trips`) |
| `src/pages/trips/[slug].tsx` | Individual trip detail page (`/trips/:slug`) |
| `src/pages/trips/TripPage.tsx` | Template router for `/trip-{slug}` URLs |
| `src/pages/trips/BookingForm.tsx` | Multi-step booking form component |
| `src/pages/trips/templates/TripTemplate1.tsx` | Classic layout template |
| `src/pages/trips/templates/TripTemplate2.tsx` | Modern split layout template |
| `src/pages/trips/templates/TripTemplate3.tsx` | Immersive full-width template |
| `src/pages/booking/success.tsx` | Post-payment confirmation page |
| `src/pages/dashboard/MyBookings.tsx` | User's booking dashboard |
| `src/pages/dashboard/EditBooking.tsx` | Edit booking details form |
| `src/pages/admin/AdminDashboard.tsx` | Admin god mode dashboard |
| `src/components/QRCode.tsx` | QR code generator component |
| `src/data/sampleTrips.json` | Sample trip data for 3 templates |

---

### 4. Routes Added (src/App.tsx)

```tsx
<Route path="/trips" element={<TripsListPage />} />
<Route path="/trips/:slug" element={<TripDetailPage />} />
<Route path="/trip-:tripId" element={<TripPage />} />
<Route path="/booking/success" element={<BookingSuccessPage />} />
<Route path="/my-bookings" element={<MyBookings />} />
<Route path="/bookings/:bookingId/edit" element={<EditBooking />} />
<Route path="/admin" element={<AdminDashboard />} />
```

Also added "My Bookings" link to header navigation.

---

### 5. Key Features Implemented

#### Affiliate/Referral Tracking
- Capture `?ref=CODE` from URL → store in localStorage
- Apply referral code to booking during checkout
- Store `advisorId` on booking record
- 1% commission on each payment (deposit + installments)
- Display advisor attribution in admin dashboard

#### Stripe Integration
- `createBookingWithDeposit` action creates Stripe Checkout session
- `payInstallment` action for individual installment payments
- Webhook handling for `trip_deposit` and `trip_installment` types
- Automatic commission creation on successful payments

#### Installment Calculation
- Calculates monthly payments from booking date to trip cutoff
- Spreads remaining balance evenly across months
- Creates installment records with due dates

#### User Dashboard (`/my-bookings`)
- View all bookings with status badges
- Payment progress bar (deposit vs total)
- Upcoming payment alerts with "Pay Now" button
- Expandable details showing traveler info
- Edit booking details link

#### Admin Dashboard (`/admin`)
- **Overview Tab**: Revenue, bookings, users, pending payments stats
- **Bookings Tab**: Searchable table of all bookings
- **Users Tab**: All users with referral codes and earnings
- **Payments Tab**: Pending installments with due dates

---

### 6. Dependencies Added (package.json)

```json
{
  "@types/qrcode": "^1.5.6",
  "qrcode": "^1.5.4"
}
```

---

## File-by-File Copy List

### Must Copy (New Files):
```
convex/admin.ts
convex/bookings.ts
convex/bookingsActions.ts
convex/trips.ts
convex/webhooks.ts
convex/formSubmissionsActions.ts

src/components/QRCode.tsx
src/data/sampleTrips.json

src/pages/admin/AdminDashboard.tsx
src/pages/booking/success.tsx
src/pages/dashboard/EditBooking.tsx
src/pages/dashboard/MyBookings.tsx
src/pages/trips/BookingForm.tsx
src/pages/trips/TripPage.tsx
src/pages/trips/[slug].tsx
src/pages/trips/index.tsx
src/pages/trips/templates/TripTemplate1.tsx
src/pages/trips/templates/TripTemplate2.tsx
src/pages/trips/templates/TripTemplate3.tsx
```

### Must Merge (Modified Files):
```
convex/schema.ts          → Add trips, packages, bookings, installments tables
convex/stripe.ts          → Add trip_deposit and trip_installment webhook handlers
convex/formSubmissions.ts → Refactor to use formSubmissionsActions
src/App.tsx               → Add routes and imports
src/components/ReferralPage.tsx → Updated with QR code
package.json              → Add qrcode dependencies
```

---

## Git Reference

All changes are in commit `6aefae6` (labeled "trial"):
```bash
git show 6aefae6 --stat
```

To extract just the booking system files:
```bash
git diff bc48c88..6aefae6 -- convex/bookings.ts convex/bookingsActions.ts convex/trips.ts convex/admin.ts
```

---

## Environment Variables Required

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=https://your-domain.com
```

---

## Next Steps for Target Project

1. Copy all new files listed above
2. Merge schema changes into existing `convex/schema.ts`
3. Merge Stripe webhook handlers into existing `convex/stripe.ts`
4. Add routes to `src/App.tsx`
5. Install dependencies: `npm install qrcode @types/qrcode`
6. Run `npx convex dev` to sync schema
7. Test the flow end-to-end
