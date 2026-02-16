# MobileMate - World-Class Social Media Management Platform

A comprehensive social media management platform for Facebook, Instagram, and TikTok.

## Features

- **Multi-Platform Management**: Connect and manage Facebook Pages, Instagram Business accounts, and TikTok accounts
- **Content Scheduling**: Create, schedule, and publish posts across all platforms
- **Unified Inbox**: Manage comments and messages from all platforms in one place
- **Analytics Dashboard**: Real-time insights and performance metrics
- **OAuth Integration**: Secure, platform-compliant authentication
- **Webhook Support**: Real-time updates from social platforms

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Authentication**: Clerk
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (Neon recommended)
- Clerk account
- Meta Developer account
- TikTok Developer account

### Installation

1. **Clone and Install**
   ```bash
   cd my-app
   bun install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp env.example .env.local
   ```
   
   **Generate Encryption Key:**
   ```bash
   bun run generate:key
   ```
   Copy the generated `TOKEN_ENCRYPTION_KEY` to your `.env.local` file.
   
   **Fill in other required variables:**
   - `DATABASE_URL` - Your Neon PostgreSQL connection string (REQUIRED - app won't work without this)
   - `CLERK_SECRET_KEY` - From Clerk dashboard (REQUIRED)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard (REQUIRED)
   - Other OAuth credentials (can be added later)

3. **Set Up Database (CRITICAL - Must be done before running the app)**
   ```bash
   bun run db:push
   ```
   This creates all required tables. Without this, pages will show empty data.
   
   **Optional - Seed with sample data:**
   ```bash
   bun run db:seed
   ```

4. **Run Development Server**
   ```bash
   bun dev
   ```

5. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
my-app/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/         # API routes
│   │   └── [pages]/     # Page components
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui primitives
│   │   └── [features]/  # Feature components
│   ├── db/              # Database schema & migrations
│   ├── lib/             # Utilities & integrations
│   │   ├── integrations/  # Platform integrations
│   │   ├── oauth/       # OAuth utilities
│   │   └── publishing/  # Publishing engine
│   └── scripts/         # Utility scripts
├── public/              # Static assets
└── [config files]       # Next.js, TypeScript, etc.
```

## Key Features

### Channels Management
- Connect accounts via OAuth
- View connection health and sync status
- Manual sync and disconnect

### Content Creation
- Multi-platform composer
- Media library (Vercel Blob)
- AI-powered content suggestions
- Live preview

### Scheduler
- Calendar view
- Queue management
- Scheduled publishing
- Job runner with retries

### Inbox
- Unified conversation view
- Assignment and SLA tracking
- Reply actions
- Status management

### Analytics
- Real-time KPIs
- Platform breakdown
- Top performing posts
- Engagement metrics

## API Routes

- `/api/channels/*` - Channel management
- `/api/oauth/*` - OAuth flows
- `/api/webhooks/*` - Webhook ingestion
- `/api/posts/*` - Post management
- `/api/jobs/run` - Job runner (cron)
- `/api/inbox/*` - Inbox operations
- `/api/analytics` - Analytics data

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Security

- OAuth tokens encrypted at rest
- Webhook signature verification
- Protected API routes with Clerk
- Environment variable validation

## License

Private - All rights reserved
