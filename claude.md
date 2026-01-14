# CLAUDE.md - Cuyahoga Code, Permit & Parcel Chat

## Project Overview

This is a real estate intelligence LLM chat application for Cuyahoga County, Ohio (Cleveland metro area). It provides AI-powered property research, building code lookup, and investment analysis across 59 municipalities with 520K+ parcel records.

**Repository**: github.com/gitpush3/cccp
**Deployment**: Vercel (frontend) + Convex (backend)

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 6.2** - Build tool
- **React Router DOM 6.30** - Routing
- **Tailwind CSS** - Styling with custom theme
- **Lucide React** - Icons
- **Sonner** - Toast notifications

### Backend
- **Convex 1.31** - Real-time serverless backend
- **OpenAI GPT-4** - LLM chat integration
- **Clerk** - Authentication (primary)
- **Stripe** - Payments & Connect for referrals

## Project Structure

```
/
├── convex/              # Backend functions & schema
│   ├── schema.ts        # Database schema
│   ├── actions.ts       # OpenAI chat integration
│   ├── users.ts         # User management
│   ├── chats.ts         # Chat sessions
│   ├── messages.ts      # Message storage
│   ├── parcels.ts       # Property data queries
│   ├── stripe.ts        # Payment integration
│   ├── analytics.ts     # Chat analytics tracking
│   ├── feedback.ts      # User feedback collection
│   ├── codeContent.ts   # Building code search
│   └── router.ts        # HTTP routes (webhooks)
│
├── src/
│   ├── components/      # React components
│   │   ├── Chat.tsx     # Main chat interface (authenticated)
│   │   ├── AnonymousChat.tsx # Chat for anonymous users
│   │   ├── Dashboard.tsx
│   │   ├── FeedbackModal.tsx # Survey after 8 messages
│   │   ├── PromoModal.tsx    # 3bids.io promo after 10 messages
│   │   ├── Paywall.tsx
│   │   └── ReferralPage.tsx
│   ├── pages/           # Full page components
│   │   └── admin/       # Admin analytics dashboard
│   ├── App.tsx          # Main router
│   └── main.tsx         # Entry point
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json
```

## Key Commands

```bash
npm run dev           # Start frontend + backend (parallel)
npm run dev:frontend  # Vite dev server only
npm run dev:backend   # Convex dev only
npm run build         # Production build
npm run lint          # Type check + build validation
npx convex dev        # Convex dashboard & hot reload
```

## Database Schema (Convex)

### Core Tables
- **users** - Clerk auth, subscriptions, referrals, Stripe Connect
- **chats** - Chat sessions by user/city
- **messages** - Chat messages with image support
- **parcels** - 520K+ property records with search indexes

### Property Data
- **landUseCodes** - Tax classification reference
- **municipalities** - 59 cities/villages/townships
- **codeContent** - 741 searchable building code entries
- **regulationUrls** - Links to municipal codes
- **contacts** - Building department contacts

### Distressed Properties
- **sheriffSales** - Foreclosure listings
- **taxDelinquent** - Tax delinquency data
- **taxLienCertificates** - Lien information

### Neighborhood Data
- **crimeIncidents**, **schools**, **walkScores**, **demographics**, **floodZones**

### Booking System
- **trips** - Trip details with templates
- **packages** - Pricing tiers
- **bookings** - Reservations with status tracking
- **installments** - Payment schedules
- **referralCommissions** - Affiliate earnings

## Authentication Flow

1. **Clerk** handles sign-in/sign-up UI
2. JWT passed to Convex via `ConvexProviderWithClerk`
3. Backend validates via `ctx.auth.getUserIdentity()`
4. User auto-created on first login via `getOrCreateUser()`
5. Anonymous users tracked by sessionId (email + consent required for access)

## Monetization Tiers

| Tier | Access | Requirement |
|------|--------|-------------|
| Anonymous | Full chat | Email + consent |
| Pro subscription | Full access | $19/month |
| Referral | 1% commission | Via Stripe Connect |

## LLM Integration (actions.ts)

The chat uses OpenAI GPT-4 with 30+ tool functions:
- `searchParcelByAddress`, `getParcelById`, `searchByOwner`
- `getComparables`, `getInvestmentAnalysis`
- `searchCodeContent`, `getRegulationsByMunicipality`
- `getBuildingDeptContact`, `getServiceProviders`
- `getTaxDelinquentByCity`, `getSheriffSales`
- `getSchoolsByZipCode`, `getCrimeStats`, `getWalkScore`

## Environment Variables

```env
# Convex
VITE_CONVEX_URL=

# Clerk Auth
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRODUCT_ID=
STRIPE_PRICE_ID=

# App
SITE_URL=
```

## Styling Conventions

- Tailwind-first with dark mode (`dark:` prefix)
- Custom colors in tailwind.config.js:
  - Primary: #002D4D (deep blue)
  - Accent: #B85042 (terracotta)
  - Secondary: #757575
- Rounded containers (lg, xl, 2xl)
- Responsive breakpoints: `md:` for desktop

## Common Development Tasks

### Adding a new Convex function
1. Define in appropriate file (e.g., `convex/parcels.ts`)
2. Export as `query`, `mutation`, or `action`
3. Access in React via `useQuery`/`useMutation` from `convex/react`

### Adding a new chat tool
1. Add function to `convex/actions.ts` tools array
2. Define input schema and handler
3. Update system prompt if needed

### Modifying the schema
1. Edit `convex/schema.ts`
2. Run `npx convex dev` to push changes
3. Add indexes for frequently queried fields

### Adding a new route
1. Add route in `src/App.tsx`
2. Create component in `src/pages/` or `src/components/`

## API Endpoints (HTTP routes)

- `POST /stripe/webhook` - Stripe payment webhooks
- Other webhooks handled via `convex/http.ts`

## Important Files

| File | Purpose |
|------|---------|
| `convex/schema.ts` | All database table definitions |
| `convex/actions.ts` | OpenAI integration & all chat tools |
| `convex/users.ts` | User CRUD, referrals, access control |
| `convex/stripe.ts` | Payment processing, Connect, webhooks |
| `src/components/Chat.tsx` | Main chat UI component |
| `src/App.tsx` | Routing & layout |

## Gotchas & Notes

- Parcel data uses `parcelPin` as primary identifier (not `parcelId`)
- Chat sessions are city-scoped for jurisdiction-specific code lookup
- Anonymous users tracked by `sessionId` from localStorage (email + consent required)
- Stripe Connect required for referral payouts
- Form submissions bypass payment (manual access grant alternative)
- Image uploads stored in Convex storage with `imageStorageId`

## Testing

No formal test suite currently. Validate via:
- `npm run lint` - TypeScript type checking
- `npm run build` - Production build validation
- Manual testing in development

## Deployment

**Frontend**: Vercel auto-deploys from main branch
**Backend**: Convex auto-deploys on `npx convex deploy`

Ensure environment variables are set in both:
- Vercel Dashboard → Settings → Environment Variables
- Convex Dashboard → Settings → Environment Variables
