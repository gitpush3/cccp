# Email Setup - SendGrid Configuration

This guide explains how to set up email notifications for form submissions using SendGrid.

## Prerequisites

- SendGrid account (already have one ✅)
- SendGrid API key
- Verified sender email address in SendGrid

## Setup Steps

### 1. Get Your SendGrid API Key

1. Log in to your [SendGrid account](https://app.sendgrid.com/)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "Convex Form Submissions")
5. Set permissions to **Full Access** (or at minimum: Mail Send)
6. Copy the API key (you'll only see it once!)

### 2. Verify Your Sender Email

1. In SendGrid, go to **Settings** → **Sender Authentication**
2. Choose **Single Sender Verification** or **Domain Authentication**
3. For Single Sender (easier):
   - Click **Create New Sender**
   - Enter your email address (e.g., `noreply@code.3bids.io`)
   - Complete the verification process
   - **Important**: Use this verified email as your `EMAIL_FROM` value

### 3. Set Environment Variables in Convex

In your Convex dashboard, go to **Settings** → **Environment Variables** and add:

```bash
# Your email address to receive notifications
ADMIN_EMAIL=your-email@example.com

# Your SendGrid API key
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Your verified sender email (must match SendGrid verification)
EMAIL_FROM=noreply@code.3bids.io
# OR use:
SENDGRID_FROM_EMAIL=noreply@code.3bids.io
```

### 4. Test the Setup

1. Submit a test form submission through your app
2. Check your email inbox for the notification
3. Check Convex logs if email doesn't arrive (look for SendGrid error messages)

## Email Content

When a form is submitted, you'll receive an email with:
- User's email address
- Job type/role
- Use case / features needed
- Submission timestamp
- User ID (if logged in)
- Status confirmation

## Troubleshooting

### Email Not Arriving

1. **Check SendGrid Dashboard**:
   - Go to **Activity** → **Email Activity**
   - Look for your email and check delivery status
   - Check for bounce/spam reports

2. **Check Convex Logs**:
   - Look for SendGrid error messages
   - Common issues:
     - Invalid API key
     - Unverified sender email
     - Rate limiting

3. **Verify Environment Variables**:
   - Make sure `SENDGRID_API_KEY` is set correctly
   - Make sure `EMAIL_FROM` matches your verified sender in SendGrid
   - Make sure `ADMIN_EMAIL` is your actual email address

### Common Errors

- **"The from address does not match a verified Sender Identity"**:
  → Verify your sender email in SendGrid and update `EMAIL_FROM`

- **"Unauthorized"**:
  → Check that your `SENDGRID_API_KEY` is correct and has Mail Send permissions

- **"Rate limit exceeded"**:
  → SendGrid free tier has limits. Upgrade plan or wait for rate limit reset.

## Alternative: Console Logging

If SendGrid is not configured, the system will log email content to the Convex console. You can view these logs in your Convex dashboard under **Logs**.

## Package Installed

The `@sendgrid/mail` package is already installed in your project. No additional installation needed.

