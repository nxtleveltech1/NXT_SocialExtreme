# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MobileMate** is a production-grade Social Media Marketing Management Platform with two main applications:

### 1. **Main Application** (`my-app/`)
- **Type**: Full-stack social media management platform
- **Framework**: Next.js 16.1.0 with React 19.2.3
- **Database**: PostgreSQL with Neon Serverless cloud database
- **Authentication**: Stack Auth (modern OAuth framework)
- **Purpose**: Manage Facebook, Instagram, TikTok, and WhatsApp channels with analytics, CRM, and e-commerce capabilities

### 2. **WhatsApp Sales App** (`whats-app-sales-app/`)
- **Type**: E-commerce sales platform
- **Framework**: Next.js 15.2.6
- **Purpose**: WhatsApp-based sales platform for electronics

## Key Technologies & Stack

### Frontend
- **React 19.2.3** with **Next.js 16.1.0**
- **Tailwind CSS** for styling with **Tailwind Merge**
- **Radix UI** for accessible components
- **Lucide React** for icons
- **React Hook Form** for form management
- **React Router DOM** for client-side routing

### Backend & Database
- **PostgreSQL** with **Neon Serverless** (cloud database)
- **Drizzle ORM** for database schema and queries
- **Drizzle Kit** for migrations
- **Bun** runtime for development

### Authentication & Security
- **Stack Auth** (modern authentication framework)
- **Token encryption** using custom crypto utilities
- **Environment variable validation** with strict typing

### API Integration
- **Meta/Facebook API** for Facebook/Instagram integration
- **WhatsApp Business API** (multiple providers: Twilio, MessageBird, direct Meta API)
- **TikTok API** for content management
- **Facebook Node.js Business SDK**

## Project Structure

```
my-app/
├── app/                    # Next.js App Router pages
│   ├── analytics/         # Analytics dashboard
│   ├── api/               # API routes (auth, channels, messages, sales, etc.)
│   ├── audience/          # CRM and audience management
│   ├── channels/          # Social media channel management
│   ├── create/            # Content creation interface
│   ├── handler/           # OAuth callback handlers
│   ├── inbox/             # Messaging interface
│   ├── meta/              # Meta-specific integrations
│   ├── oauth/             # OAuth flows
│   ├── sales/             # E-commerce functionality
│   └── settings/          # User and platform settings
├── components/            # Reusable React components
├── db/                    # Database schema and operations
│   ├── schema.ts         # Comprehensive database schema
│   └── seed.ts           # Data seeding for development
├── lib/                   # Utility functions and configurations
│   ├── env.ts            # Environment variable management
│   ├── crypto.ts         # Encryption utilities
│   └── integrations/     # Third-party API integrations
├── middleware.ts          # Next.js middleware for auth
└── stack.ts              # Stack authentication configuration
```

## Database Schema Features

The database schema is production-grade with comprehensive tables for:

**Core Tables:**
- `channels` - Social media platform connections (Facebook, Instagram, TikTok, WhatsApp)
- `posts` - Content management with scheduling and AI generation
- `conversations` - Unified messaging across platforms
- `messages` - Detailed message storage with rich media support
- `followers` - Audience management with segmentation
- `sales_products` - E-commerce product catalog
- `orders` - Complete order management system
- `shopping_carts` - Cart functionality
- `media_assets` - Media file management
- `publish_jobs` - Scheduling and publishing queue
- `webhook_events` - Event logging and processing

**Advanced Features:**
- Time-series metrics tracking
- Multi-platform unified messaging
- Ad campaign and commerce integration
- Token encryption and security
- Comprehensive audit trails

## Development Commands

### Essential Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Database operations
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio GUI
npm run db:seed      # Seed database with sample data

# Security operations
npm run tokens:encrypt    # Encrypt channel tokens
npm run generate:key      # Generate encryption key
```

### Environment Setup
1. **Copy environment file**: `cp .env.local .env` (if needed)
2. **Set required environment variables**:
   - `DATABASE_URL` - PostgreSQL connection string
   - `TOKEN_ENCRYPTION_KEY` - 32-byte base64 encryption key
   - `STACK_SECRET_SERVER_KEY` - Stack Auth server key
   - `NEXT_PUBLIC_STACK_PROJECT_ID` - Stack Auth project ID
   - `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` - Stack Auth client key

### Build Tools
- **TypeScript** with strict configuration
- **ESLint** for code quality
- **Bun** as runtime with custom scripts
- **Environment validation** with required variables

## Testing Framework

**Current Status**: No dedicated testing framework configured in this project.

**Recommendation**: If testing is needed, consider adding:
- Jest for unit testing
- Testing Library for React component testing
- Supertest for API endpoint testing
- Playwright for E2E testing

## CI/CD Configuration

**Current Status**: No GitHub Actions or CI/CD workflows configured in the repository.

**Deployment**: The project is configured for Vercel deployment with:
- Next.js middleware for production routing
- Database URL configuration for cloud deployment
- Environment variable management for different environments

## Key Components & Architecture

### Authentication Flow
- Uses Stack Auth for modern OAuth
- Custom middleware for route protection
- Token encryption for security

### Database Operations
- Drizzle ORM for type-safe database operations
- Comprehensive schema with relationships
- Migration system for versioning

### API Integration
- Meta/Facebook API integration for social media
- Multiple WhatsApp API providers supported
- TikTok API for content management

### Real-time Features
- Unified messaging across platforms
- Live analytics and metrics
- Real-time notifications

## Important Files & Directories

### Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `.env` - Environment variables

### Core Implementation
- `src/app/layout.tsx` - Main application layout
- `src/lib/env.ts` - Environment variable management
- `src/db/schema.ts` - Database schema definitions
- `src/db/seed.ts` - Database seeding
- `src/middleware.ts` - Next.js middleware

### API Routes
- `src/app/api/` - All API endpoints
- `src/app/handler/` - OAuth callback handlers

## Development Guidelines

### Code Style
- Use TypeScript strictly
- Follow React best practices
- Use Radix UI components for accessibility
- Follow Tailwind CSS naming conventions

### Database Changes
1. Modify `src/db/schema.ts`
2. Run `npm run db:push` to apply changes
3. Update seed data if needed
4. Test thoroughly with real data

### API Development
- Use Next.js App Router for API routes
- Implement proper error handling
- Use environment variables for configuration
- Add appropriate middleware for authentication

### Security
- Never commit sensitive data to repository
- Use environment variables for secrets
- Implement proper input validation
- Use HTTPS in production

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure `DATABASE_URL` is correctly set
2. **Token Encryption**: Verify `TOKEN_ENCRYPTION_KEY` is properly formatted
3. **Authentication**: Check Stack Auth configuration
4. **API Integration**: Verify platform-specific credentials

### Debug Commands
```bash
# Check environment variables
echo $DATABASE_URL

# Test database connection
npm run db:studio

# Check build errors
npm run build

# Lint code
npm run lint
```

## Project Documentation

### Architecture Documents
- `.trae/documents/World Class Platform Re-Architecture Plan.md` - Database and architecture plans
- `.trae/documents/World-Class Platform Expansion Roadmap.md` - Feature development roadmap

### API Documentation
- API routes are documented in their respective files
- Use OpenAPI/Swagger if comprehensive API docs are needed

## External Dependencies

### Required Services
- **Neon PostgreSQL** - Cloud database
- **Stack Auth** - Authentication service
- **Meta/Facebook Developer Account** - Social media integration
- **TikTok Developer Account** - TikTok integration
- **WhatsApp Business API** - Messaging integration

### Optional Services
- **Vercel Blob** - Media storage
- **Multiple WhatsApp providers** - Twilio, MessageBird, direct Meta API

## Performance Considerations

### Database Optimization
- Use indexes on frequently queried fields
- Implement pagination for large datasets
- Use connection pooling

### Frontend Optimization
- Implement lazy loading for heavy components
- Use memoization for expensive calculations
- Optimize images and media

### API Performance
- Implement caching for frequently accessed data
- Use efficient database queries
- Consider rate limiting for external APIs

## Security Best Practices

### Authentication
- Use Stack Auth for secure authentication
- Implement proper session management
- Use HTTPS in production

### Data Protection
- Encrypt sensitive data at rest and in transit
- Use parameterized queries to prevent SQL injection
- Implement proper input validation

### API Security
- Use environment variables for API keys
- Implement rate limiting
- Add proper CORS configuration

## Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Configure database connection
4. Deploy and monitor

### Environment Variables for Production
- Set all required environment variables
- Use secure values for production
- Configure database connection strings
- Set up proper authentication credentials

## Contributing

### Development Workflow
1. Create feature branch from main
2. Make changes with proper testing
3. Update documentation if needed
4. Submit pull request
5. Review and merge

### Code Review Checklist
- [ ] Code follows project conventions
- [ ] No sensitive data committed
- [ ] Database changes are properly tested
- [ ] API endpoints have proper error handling
- [ ] TypeScript types are comprehensive
- [ ] Documentation is updated

## Support

For issues or questions:
1. Check existing documentation
2. Review error messages and logs
3. Test with minimal reproduction
4. Consult project architecture documents

---

**Last Updated**: December 2025
**Version**: 1.0
**Platform**: Windows 11