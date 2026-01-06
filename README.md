# LatitudeGo Booking System

This is a comprehensive trip booking system built with Convex, React, and Stripe.

## Features

- **Trip Page Templates**: 3 distinct layouts for trip details.
- **Booking Flow**: Multi-step booking form with Stripe Checkout integration.
- **Installment Plans**: Automated calculation of monthly payments until trip cutoff date.
- **Referral System**: Unique referral codes and QR codes for advisors/influencers.
- **Stripe Connect**: Automatic payouts for referral commissions.
- **Admin Dashboard**: God mode visibility of all bookings, users, and payments.
- **User Dashboard**: Manage your own bookings and upcoming payments.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Convex
- **Payments**: Stripe (Checkout & Connect)
- **Auth**: Clerk

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables in `.env.local`
4. Run the development server: `npm run dev`

## Environment Variables

- `CONVEX_DEPLOYMENT`: Your Convex deployment URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `CLERK_SECRET_KEY`: Clerk secret key
- `STRIPE_SECRET_KEY`: Stripe API key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `SITE_URL`: Base URL for redirects (e.g., http://localhost:5173)
