# Meta Platform Connections - Quick Reference

## Currently Implemented ✅

1. **Facebook Pages API**
   - Post publishing
   - Post reading
   - Basic conversation fetching
   - Comments reading

2. **Instagram Graph API**
   - Media publishing (photos/videos/Reels)
   - Media reading
   - Comments reading

3. **Basic OAuth Flow**
   - Facebook/Instagram account connection
   - Token storage (encrypted)

4. **Basic Webhooks**
   - Meta webhook handler (needs expansion)

---

## High Priority - Recommended Next Steps 🚀

### 1. WhatsApp Business Platform API
**Why**: High customer engagement potential  
**Effort**: Medium  
**Files to Create**:
- `src/lib/integrations/whatsapp.ts`
- `src/lib/publishing/providers/whatsapp.ts`
- `src/app/api/webhooks/whatsapp/route.ts`

**Env Vars Needed** (already in env.example):
- `WHATSAPP_BUSINESS_PHONE_NUMBER`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_ACCESS_TOKEN`

### 2. Enhanced Messenger Platform API
**Why**: Rich messaging features, better customer support  
**Effort**: Medium  
**Features to Add**:
- Message templates
- Rich media messages
- Quick replies
- Persistent menu
- Typing indicators

### 3. Conversions API (Server-Side)
**Why**: Better tracking, privacy-compliant, reduces ad costs  
**Effort**: Low-Medium  
**Files to Create**:
- `src/lib/analytics/conversions-api.ts`
- `src/app/api/analytics/conversions/route.ts`

### 4. Meta Pixel (Client-Side)
**Why**: Standard conversion tracking  
**Effort**: Low  
**Implementation**: Add to `src/app/layout.tsx` or create component

### 5. Insights API
**Why**: Analytics for Pages and Instagram  
**Effort**: Medium  
**Files to Create**:
- `src/lib/analytics/insights.ts`
- `src/app/api/analytics/insights/route.ts`

---

## Medium Priority 📊

### 6. Marketing API
**Why**: Programmatic ad management  
**Effort**: High  
**Use Cases**: Create/manage campaigns, optimize ads

### 7. Commerce API
**Why**: E-commerce integration  
**Effort**: High  
**Use Cases**: Product catalogs, Facebook Shop, Instagram Shopping

### 8. Threads API
**Why**: New platform integration  
**Effort**: Medium  
**Status**: May need to wait for API stability

### 9. Events API
**Why**: Event management  
**Effort**: Low-Medium  
**Use Cases**: Create/manage Facebook Events

---

## Lower Priority / Future 🔮

- **Wit.ai** - Natural language processing
- **Meta Spark AR** - AR filters
- **Workplace API** - Enterprise collaboration
- **Jobs API** - Job postings
- **Gaming Services** - Game integration

---

## API Endpoints Quick Reference

### Facebook Pages
```
GET  /{page-id}/posts
POST /{page-id}/feed
GET  /{page-id}/conversations
GET  /{page-id}/comments
GET  /{page-id}/insights
```

### Instagram Business
```
GET  /{ig-user-id}/media
POST /{ig-user-id}/media
POST /{ig-user-id}/media_publish
GET  /{media-id}/comments
GET  /{ig-user-id}/insights
```

### Messenger
```
POST /me/messages
GET  /me/conversations
POST /me/messenger_profile
```

### WhatsApp Business
```
POST /{phone-number-id}/messages
GET  /{phone-number-id}/messages
POST /{phone-number-id}/messages (templates)
```

### Conversions API
```
POST /{pixel-id}/events
```

### Marketing API
```
GET  /act_{ad-account-id}/campaigns
POST /act_{ad-account-id}/campaigns
GET  /act_{ad-account-id}/ads
POST /act_{ad-account-id}/ads
```

---

## Required Permissions Quick Reference

### Basic Social Publishing
- `pages_read_engagement`
- `pages_manage_posts`
- `instagram_basic`
- `instagram_content_publish`

### Full Messaging
- `pages_messaging`
- `pages_manage_metadata`

### Analytics
- `read_insights`
- `instagram_manage_insights`

### Ad Management
- `ads_management`
- `ads_read`
- `business_management`

---

## Webhook Subscriptions

### Pages
- `messages`
- `messaging_postbacks`
- `feed`
- `comments`

### Instagram
- `messages`
- `story_mentions`

### WhatsApp
- `messages`
- `message_status`

---

## Rate Limits

- **Graph API**: 200 calls/hour/user (default)
- **Marketing API**: Varies by ad account
- **WhatsApp**: 1000 conversations/24h (free tier)

---

## Implementation Checklist

When adding a new Meta integration:

- [ ] Add OAuth flow (if needed)
- [ ] Create integration file (`src/lib/integrations/`)
- [ ] Create publisher file (`src/lib/publishing/providers/`)
- [ ] Add webhook handler (`src/app/api/webhooks/`)
- [ ] Update database schema (if needed)
- [ ] Add environment variables
- [ ] Update UI components
- [ ] Add error handling
- [ ] Implement rate limiting
- [ ] Add tests
- [ ] Update documentation

---

*See `META_PLATFORM_CONNECTIONS.md` for detailed documentation*



