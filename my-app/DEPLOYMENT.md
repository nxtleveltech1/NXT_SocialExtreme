# MobileMate Deployment Guide

## Prerequisites

- Vercel account (for hosting)
- Neon account (for PostgreSQL)
- Clerk account (for authentication)
- Meta Developer account (for Facebook/Instagram)
- TikTok Developer account (for TikTok)

## Environment Variables

Copy `env.example` to `.env.local` and fill in all required values:

### Core
- `DATABASE_URL` - Neon PostgreSQL connection string
- `TOKEN_ENCRYPTION_KEY` - 32-byte key (base64 or hex) for encrypting OAuth tokens
- `JOB_RUNNER_SECRET` - Secret token for securing the job runner cron endpoint

### Clerk Authentication
- `CLERK_SECRET_KEY` - From Clerk dashboard
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard

### Meta (Facebook/Instagram)
- `META_APP_ID` - From Meta App Dashboard
- `META_APP_SECRET` - From Meta App Dashboard
- `META_REDIRECT_URI` - `https://yourdomain.com/api/oauth/meta/callback`
- `META_WEBHOOK_VERIFY_TOKEN` - Random secret for webhook verification

### TikTok
- `TIKTOK_CLIENT_KEY` - From TikTok Developer Portal
- `TIKTOK_CLIENT_SECRET` - From TikTok Developer Portal
- `TIKTOK_REDIRECT_URI` - `https://yourdomain.com/api/oauth/tiktok/callback`

## Vercel Deployment

1. **Connect Repository**
   ```bash
   vercel link
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all variables from `.env.local`

3. **Deploy**
   ```bash
   vercel --prod
   ```

## Database Setup

1. **Run Migrations**
   ```bash
   bun run db:push
   ```

2. **Seed Database (Optional)**
   ```bash
   bun run db:seed
   ```

## Cron Jobs

The job runner is configured to run every 5 minutes via Vercel Cron:
- Path: `/api/jobs/run`
- Schedule: `*/5 * * * *`
- Secret: Protected by `JOB_RUNNER_SECRET` header

## Webhook Configuration

### Meta Webhooks

1. Go to Meta App Dashboard → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/meta`
3. Set verify token to match `META_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to events:
   - `feed` (for posts)
   - `comments` (for comments)
   - `messages` (for messages, if approved)

### TikTok Webhooks (if available)

Configure in TikTok Developer Portal → Webhooks section.

## Monitoring

- **Vercel Logs**: View in Vercel Dashboard → Project → Logs
- **Database**: Monitor in Neon Dashboard
- **Errors**: Check Vercel Function logs for API errors

## Security Checklist

- [ ] All environment variables set in Vercel
- [ ] `TOKEN_ENCRYPTION_KEY` is 32 bytes (base64 or hex)
- [ ] `JOB_RUNNER_SECRET` is set and random
- [ ] Webhook verify tokens match provider settings
- [ ] OAuth redirect URIs match provider app settings
- [ ] Database connection uses SSL (Neon default)

## Troubleshooting

### Job Runner Not Running
- Check Vercel Cron configuration
- Verify `JOB_RUNNER_SECRET` header matches
- Check function logs for errors

### OAuth Callbacks Failing
- Verify redirect URIs match exactly (including https)
- Check OAuth app settings in provider dashboards
- Review callback route logs

### Webhooks Not Receiving Events
- Verify webhook URL is publicly accessible
- Check webhook verification token matches
- Review webhook route logs for signature errors



