Build a Convex + Next.js payment portal for LatitudeGo private charter flights.

**Stack:** Convex, Clerk auth, Next.js 14 App Router, Tailwind, shadcn/ui, Lucide, SendGrid

**Brand:** Cyan #00D4FF, purple #9B59B6, charcoal #2D2D2D. Dark mode default. Luxury aesthetic, Inter font.

**Schema:**
- users: email (primary), clerkId (set on signup)
- trips: tripId, tripName, travelDate, stripeProductId, packages JSON
- bookings: userId, stripeCustomerId, tripId, package, occupancy, totalAmount, amountPaid, paymentFrequency (weekly/bi-weekly/monthly/lump-sum), status, cutoffDate
- travelers: bookingId, name, email, phone, passport (up to 400/booking)
- installments: bookingId, dueDate, amount, status, attempts, nextRetryAt, stripePaymentIntentId

**HTTP Endpoints:**
- POST /api/trips/upsert - receives trip data from script
- POST /webhooks/stripe - checkout.session.completed, payment_intent.succeeded/failed

**Key Logic:**
- Email-based linking: Stripe creates user by email, Clerk links on signup
- Installments: equal payments to cutoffDate (60 days before travel)
- User can CHANGE frequency → recalculates pending installments
- Pay-off early → charges remaining, cancels pending
- Cron: 6AM EST daily charge, retry failed (1min→1day→2day→3day)
- Stripe off-session charges with saved card

**VIP Portal (vip.latitudego.com):**
- Dashboard: booking cards with progress bars, next payment date
- Booking detail: progress "Paid $X of $Y", frequency selector with preview, pay early, installment timeline, travelers CRUD, Stripe Portal for card updates, 60-day notice

**Emails:** welcome+VIP invite, payment success/fail, admin alerts

See @docs/convex_chef_prompt.md for full schema and details.
