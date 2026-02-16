# Meta Platform Connections - Complete Reference Guide

This document provides a comprehensive overview of all available Meta (Facebook) platform connections, APIs, and integration types that can be implemented in MobileMate.

## Table of Contents

1. [Authentication & Identity](#authentication--identity)
2. [Social Platforms](#social-platforms)
3. [Messaging Platforms](#messaging-platforms)
4. [Business & Marketing Tools](#business--marketing-tools)
5. [E-Commerce & Commerce](#e-commerce--commerce)
6. [Analytics & Insights](#analytics--insights)
7. [AI & Machine Learning](#ai--machine-learning)
8. [AR/VR Platforms](#arvr-platforms)
9. [Gaming](#gaming)
10. [Open Source Tools](#open-source-tools)

---

## Authentication & Identity

### Facebook Login
**Purpose**: User authentication using Facebook credentials  
**API**: OAuth 2.0 / Facebook Login SDK  
**Use Cases**:
- Reduce signup friction
- Social authentication
- Access user profile data
- Friend connections (with permissions)

**Required Permissions**:
- `email` - User's email address
- `public_profile` - Basic profile information
- `user_friends` - Friend list (requires App Review)

**Implementation Notes**:
- Currently using Stack Auth (Neon Auth) - may want to add Facebook Login as an OAuth provider
- Can be integrated alongside existing authentication

**Documentation**: https://developers.facebook.com/docs/facebook-login/

---

## Social Platforms

### Facebook Pages API
**Purpose**: Manage Facebook Pages programmatically  
**API**: Graph API v19.0+  
**Current Status**: ✅ Partially Implemented  
**Use Cases**:
- Publish posts to Pages
- Read Page posts and engagement
- Manage Page settings
- Respond to comments
- Access Page insights

**Endpoints Used**:
- `GET /{page-id}/posts` - Fetch posts
- `POST /{page-id}/feed` - Publish posts
- `GET /{page-id}/conversations` - Page messages
- `GET /{page-id}/comments` - Post comments

**Required Permissions**:
- `pages_read_engagement` - Read Page content
- `pages_manage_posts` - Publish posts
- `pages_read_user_content` - Read user content on Page
- `pages_manage_metadata` - Manage Page settings

**Implementation**: `src/lib/integrations/meta.ts`, `src/lib/publishing/providers/meta.ts`

---

### Instagram Graph API
**Purpose**: Manage Instagram Business and Creator accounts  
**API**: Graph API v19.0+  
**Current Status**: ✅ Partially Implemented  
**Use Cases**:
- Publish photos/videos/Reels
- Read media and engagement
- Manage comments
- Access insights
- Story management

**Endpoints Used**:
- `GET /{ig-user-id}/media` - Fetch media
- `POST /{ig-user-id}/media` - Create media container
- `POST /{ig-user-id}/media_publish` - Publish media
- `GET /{media-id}/comments` - Fetch comments

**Required Permissions**:
- `instagram_basic` - Basic Instagram access
- `instagram_content_publish` - Publish content
- `instagram_manage_comments` - Manage comments
- `instagram_manage_insights` - Access insights

**Implementation**: `src/lib/integrations/meta.ts`, `src/lib/publishing/providers/meta.ts`

**Note**: Instagram requires media (image/video) for all posts - text-only posts are not supported.

---

### Threads API
**Purpose**: Integrate with Meta's Threads platform  
**API**: Graph API (Threads endpoints)  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Publish Threads posts
- Read Threads content
- Manage engagement

**Required Permissions**:
- `threads_basic` - Basic Threads access
- `threads_content_publish` - Publish Threads

**Documentation**: https://developers.facebook.com/docs/threads/

---

### Sharing to Reels
**Purpose**: Enable users to share content to Instagram/Facebook Reels  
**API**: Sharing API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Cross-platform content sharing
- User-generated content promotion
- Viral content distribution

**Documentation**: https://developers.facebook.com/docs/sharing-to-reels/

---

## Messaging Platforms

### Messenger Platform API
**Purpose**: Build conversational experiences via Messenger  
**API**: Messenger Platform API  
**Current Status**: ⚠️ Partially Implemented (conversations only)  
**Use Cases**:
- Send/receive messages
- Rich message templates (buttons, cards, quick replies)
- Persistent menu
- Webhooks for real-time messaging
- Chat plugins for websites

**Features**:
- Text messages
- Media messages (images, videos, files)
- Templates (generic, list, button, receipt)
- Quick replies
- Persistent menu
- Typing indicators
- Read receipts
- Webhooks for message events

**Required Permissions**:
- `pages_messaging` - Send/receive messages
- `pages_manage_metadata` - Manage Page settings

**Current Implementation**: Basic conversation fetching in `src/lib/integrations/meta.ts`

**Documentation**: https://developers.facebook.com/docs/messenger-platform/

---

### WhatsApp Business Platform API
**Purpose**: Connect with customers via WhatsApp  
**API**: WhatsApp Business API  
**Current Status**: ⚠️ Partially Configured (env vars exist)  
**Use Cases**:
- Send/receive WhatsApp messages
- Business messaging at scale
- Customer support automation
- Marketing campaigns
- Transactional messages

**Features**:
- Text, media, location, contacts
- Message templates (pre-approved)
- Interactive messages (buttons, lists)
- Webhooks for message events
- Two-way conversations
- Message status tracking

**Required Setup**:
- WhatsApp Business Account ID
- Phone number verification
- Business verification
- Message templates approval

**Environment Variables** (already in `env.example`):
- `WHATSAPP_BUSINESS_PHONE_NUMBER`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_ACCESS_TOKEN`

**Documentation**: https://developers.facebook.com/docs/whatsapp/

---

### Messaging Interoperability
**Purpose**: Enable cross-platform messaging (DMA compliance)  
**API**: Messaging Interoperability API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Enable WhatsApp messaging from other platforms
- DMA (Digital Markets Act) compliance
- Cross-platform communication

**Note**: Currently limited to European users per DMA requirements.

**Documentation**: https://developers.facebook.com/docs/messaging-interoperability/

---

## Business & Marketing Tools

### Marketing API
**Purpose**: Programmatic ad management  
**API**: Marketing API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Create and manage ad campaigns
- Manage ad sets and ads
- Target audiences
- Optimize ad performance
- Budget management
- A/B testing

**Key Features**:
- Campaign management
- Audience targeting
- Ad creative management
- Billing and invoicing
- Performance reporting

**Required Permissions**:
- `ads_management` - Manage ads
- `ads_read` - Read ad data
- `business_management` - Manage business assets

**Documentation**: https://developers.facebook.com/docs/marketing-apis/

---

### Meta Pixel
**Purpose**: Client-side conversion tracking  
**API**: JavaScript SDK / Pixel API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Track website conversions
- Retargeting audiences
- Conversion optimization
- Event tracking

**Events Tracked**:
- PageView
- ViewContent
- AddToCart
- Purchase
- Lead
- CompleteRegistration
- Custom events

**Documentation**: https://developers.facebook.com/docs/meta-pixel/

---

### Conversions API (Server-Side)
**Purpose**: Server-side conversion tracking  
**API**: Conversions API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- More accurate conversion tracking
- Privacy-compliant tracking
- Complement Meta Pixel
- Reduce ad costs through better optimization

**Benefits over Pixel**:
- Works with ad blockers
- More reliable data
- Better privacy compliance
- Reduced data loss

**Documentation**: https://developers.facebook.com/docs/marketing-api/conversions-api/

---

### App Events
**Purpose**: Track mobile app events  
**API**: App Events SDK  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Track app installs
- Measure in-app events
- Optimize app install campaigns
- Retarget app users

**Supported Platforms**:
- iOS (Swift/Objective-C)
- Android (Java/Kotlin)
- Unity
- React Native

**Documentation**: https://developers.facebook.com/docs/app-events/

---

### App Ads
**Purpose**: Drive app installs and engagement  
**API**: Marketing API (App Ads)  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- App install campaigns
- App engagement campaigns
- Deep linking
- App retargeting

**Documentation**: https://developers.facebook.com/docs/app-ads/

---

### App Links
**Purpose**: Cross-platform app-to-app linking  
**API**: App Links Protocol  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Deep linking between apps
- Share content between platforms
- Universal links

**Documentation**: https://developers.facebook.com/docs/app-links/

---

### Instant Experience API
**Purpose**: Create full-screen mobile experiences  
**API**: Instant Experience API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Rich mobile ad experiences
- Brand storytelling
- Product showcases
- Lead generation

**Documentation**: https://developers.facebook.com/docs/instant-experiences/

---

## E-Commerce & Commerce

### Commerce API
**Purpose**: Enable e-commerce across Meta platforms  
**API**: Commerce API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Product catalog management
- Facebook Shop integration
- Instagram Shopping
- Checkout on Facebook/Instagram
- Order management

**Features**:
- Product catalogs
- Inventory management
- Order processing
- Payment integration
- Shipping management

**Documentation**: https://developers.facebook.com/docs/commerce/

---

## Analytics & Insights

### Insights for Pages
**Purpose**: Page analytics and insights  
**API**: Insights API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Page performance metrics
- Audience demographics
- Post engagement analytics
- Reach and impressions
- Video analytics

**Available Metrics**:
- Page likes, reach, impressions
- Post engagement (likes, comments, shares)
- Video views and watch time
- Audience demographics
- Best posting times

**Documentation**: https://developers.facebook.com/docs/graph-api/reference/insights/

---

### Instagram Insights API
**Purpose**: Instagram Business account analytics  
**API**: Insights API (Instagram)  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Account performance metrics
- Content performance
- Audience insights
- Engagement analytics

**Documentation**: https://developers.facebook.com/docs/instagram-api/guides/insights/

---

## Events & Jobs

### Official Events API
**Purpose**: Create and manage Facebook Events  
**API**: Events API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Create events programmatically
- Manage event details
- Track RSVPs
- Event promotion

**Documentation**: https://developers.facebook.com/docs/events-api/

---

### Jobs on Facebook
**Purpose**: Post and manage job listings  
**API**: Jobs API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Post job openings
- Manage applications
- Reach diverse candidates
- Track job performance

**Documentation**: https://developers.facebook.com/docs/jobs/

---

## AI & Machine Learning

### Wit.ai
**Purpose**: Natural language understanding  
**API**: Wit.ai API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Convert speech to structured data
- Intent recognition
- Entity extraction
- Chatbot development
- Voice commands

**Documentation**: https://wit.ai/docs

---

### Meta AI Products
**Purpose**: Access Meta's AI innovations  
**API**: Various AI APIs  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- AI-powered features
- Content generation
- Image/video understanding
- Recommendation systems

**Documentation**: https://ai.meta.com/

---

## AR/VR Platforms

### Meta Quest
**Purpose**: VR development  
**API**: Quest SDK  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- VR app development
- VR experiences
- VR social platforms

**Documentation**: https://developer.oculus.com/

---

### Meta Spark (Spark AR)
**Purpose**: AR filter/effect creation  
**API**: Spark AR Studio  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Instagram/Facebook AR filters
- AR effects
- Brand AR experiences

**Documentation**: https://sparkar.facebook.com/

---

### React 360
**Purpose**: 360° content creation  
**API**: React 360  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- 360° videos
- VR content
- Immersive experiences

**Documentation**: https://github.com/facebook/react-360

---

## Gaming

### Gaming Services
**Purpose**: Gaming platform integration  
**API**: Gaming Services API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Game achievements
- Leaderboards
- Social gaming features
- In-game purchases

**Documentation**: https://developers.facebook.com/docs/games/

---

## Business Management

### Facebook Business SDK
**Purpose**: Suite of SDKs for business solutions  
**API**: Business SDK  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Unified business API access
- Business asset management
- Cross-platform business tools

**Documentation**: https://developers.facebook.com/docs/business-sdk/

---

### Facebook Business Extension
**Purpose**: Integrate Facebook business tools  
**API**: Business Extension API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Third-party platform integration
- Business tool extensions
- Custom business workflows

**Documentation**: https://developers.facebook.com/docs/business-extension/

---

### Workplace API
**Purpose**: Enterprise collaboration platform  
**API**: Workplace API  
**Current Status**: ❌ Not Implemented  
**Use Cases**:
- Internal communication
- Team collaboration
- Enterprise social network
- Business productivity tools

**Documentation**: https://developers.facebook.com/docs/workplace/

---

## Open Source Tools

### React / React Native
**Purpose**: UI framework  
**Status**: Can be used in project  
**Use Cases**:
- Web application development
- Mobile app development
- Component libraries

---

### PyTorch
**Purpose**: Machine learning framework  
**Status**: Available for ML features  
**Use Cases**:
- AI/ML model development
- Deep learning
- Research

---

## Implementation Priority Recommendations

### Phase 1: Core Social (Current)
- ✅ Facebook Pages API (partially done)
- ✅ Instagram Graph API (partially done)
- ⚠️ Messenger Platform API (basic conversations only)

### Phase 2: Enhanced Messaging
- WhatsApp Business Platform API
- Enhanced Messenger features (templates, webhooks)
- Messaging webhooks for real-time updates

### Phase 3: Marketing & Analytics
- Conversions API (server-side tracking)
- Meta Pixel (client-side tracking)
- Insights API (Page and Instagram analytics)
- Marketing API (ad management)

### Phase 4: E-Commerce
- Commerce API
- Product catalog management
- Shopping integration

### Phase 5: Advanced Features
- Threads API
- Events API
- Jobs API
- Workplace API

### Phase 6: AI & AR/VR
- Wit.ai integration
- Meta Spark AR filters
- AI-powered content generation

---

## Authentication & Permissions Overview

### OAuth 2.0 Flow
All Meta APIs use OAuth 2.0 for authentication. Current implementation:
- `src/app/api/oauth/meta/start/route.ts` - Initiate OAuth
- `src/app/api/oauth/meta/callback/route.ts` - Handle callback
- `src/app/api/oauth/meta/finalize/route.ts` - Finalize connection

### Required Permissions by Use Case

**Basic Page Management**:
- `pages_read_engagement`
- `pages_manage_posts`
- `pages_read_user_content`

**Full Messaging**:
- `pages_messaging`
- `pages_manage_metadata`

**Instagram Publishing**:
- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_comments`

**Analytics**:
- `pages_read_engagement`
- `instagram_manage_insights`
- `read_insights`

**Ad Management**:
- `ads_management`
- `ads_read`
- `business_management`

**WhatsApp**:
- WhatsApp Business Account setup (separate from OAuth)
- System user access token

---

## Webhooks

### Current Implementation
- `src/app/api/webhooks/meta/route.ts` - Basic webhook handler

### Supported Webhook Subscriptions

**Pages**:
- `messages` - New messages
- `messaging_postbacks` - Postback events
- `messaging_optins` - Opt-in events
- `message_deliveries` - Delivery receipts
- `message_reads` - Read receipts
- `messaging_referrals` - Referral events
- `feed` - Page feed updates
- `comments` - Comment events

**Instagram**:
- `messages` - Direct messages
- `messaging_postbacks` - Postback events
- `story_mentions` - Story mentions
- `story_insights` - Story insights

**WhatsApp**:
- `messages` - Incoming messages
- `message_status` - Message delivery status
- `message_template_status_update` - Template status

---

## Rate Limits & Best Practices

### Rate Limits
- **Graph API**: 200 calls per hour per user (default)
- **Marketing API**: Varies by ad account
- **WhatsApp**: 1000 conversations per 24 hours (free tier)

### Best Practices
1. **Token Management**: Store tokens securely (encrypted)
2. **Error Handling**: Implement retry logic with exponential backoff
3. **Webhooks**: Verify webhook signatures
4. **Rate Limiting**: Implement rate limit handling
5. **Data Privacy**: Follow GDPR/privacy regulations
6. **App Review**: Many permissions require App Review

---

## Resources

- **Main Developer Portal**: https://developers.facebook.com/
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **App Dashboard**: https://developers.facebook.com/apps/
- **Documentation**: https://developers.facebook.com/docs/
- **Community**: https://developers.facebook.com/community/

---

## Notes

- All APIs use Graph API v19.0+ (current implementation uses v19.0)
- Most APIs require App Review for production use
- Some features are region-specific (e.g., Messaging Interoperability)
- WhatsApp requires separate Business Account setup
- Instagram Business accounts must be connected to Facebook Pages

---

*Last Updated: Based on Meta Platform as of 2024*
*Current Project: MobileMate - Social Media Management Platform*



