# Environment Variables for Stripe Integration

## Required Environment Variables

The following environment variables must be set for the Stripe integration to work properly:

### Stripe Configuration
```bash
# Stripe Secret Key (use test key for development, live key for production)
STRIPE_SECRET_KEY=sk_test_...  # Test environment
STRIPE_SECRET_KEY=sk_live_...  # Live environment

# Stripe Webhook Secret (different for test and live)
STRIPE_WEBHOOK_SECRET=whsec_...  # Test webhook secret
STRIPE_WEBHOOK_SECRET=whsec_...  # Live webhook secret

# Site URL for success/cancel redirects
SITE_URL=http://localhost:5173  # Development
SITE_URL=https://yourdomain.com  # Production
```

### Convex Deployment URL
The webhook endpoint will be available at:
```
https://your-convex-deployment-url.com/stripe/webhook
```

### Stripe Dashboard Setup

1. **Test Environment:**
   - Use `STRIPE_SECRET_KEY` starting with `sk_test_`
   - Webhook endpoint: `https://your-convex-deployment-url.com/stripe/webhook`
   - Webhook events: All events in the `allowedEvents` array
   - Use test webhook secret for `STRIPE_WEBHOOK_SECRET`

2. **Live Environment:**
   - Use `STRIPE_SECRET_KEY` starting with `sk_live_`
   - Same webhook endpoint
   - Same webhook events
   - Use live webhook secret for `STRIPE_WEBHOOK_SECRET`

### Perfect Test/Live Alignment

The implementation ensures perfect alignment between test and live environments:

- **Same webhook endpoint URL** for both environments
- **Same event handling logic** - no environment-specific code
- **Same subscription flow** - create customer → checkout → sync data
- **Environment variables only difference** - keys and webhook secrets

This eliminates split-brain issues and ensures consistent behavior across environments.
