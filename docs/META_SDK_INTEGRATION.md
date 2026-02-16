# Meta Business SDK Integration

This document explains how the Meta Business SDK has been integrated into MobileMate.

## Overview

The [Meta Business SDK](https://developers.facebook.com/docs/business-sdk/getting-started) provides official, type-safe SDKs for interacting with Meta's APIs. We've integrated the Node.js SDK (`facebook-nodejs-business-sdk`) to provide better:

- **Type Safety**: Full TypeScript support with proper types
- **Error Handling**: Built-in error handling and retry logic
- **Rate Limiting**: Automatic rate limit handling
- **Pagination**: Built-in pagination support
- **Batch Requests**: Support for batch API calls
- **Better API**: More intuitive API methods

## Installation

The SDK has been installed via:

```bash
bun add facebook-nodejs-business-sdk
```

## Architecture

### SDK Wrapper (`meta-sdk.ts`)

The `MetaBusinessSDK` class provides a clean wrapper around the official SDK:

```typescript
import { MetaBusinessSDK } from "@/lib/integrations/meta-sdk";

const sdk = new MetaBusinessSDK({
  accessToken: "your_token",
  appId: "your_app_id", // Optional
  appSecret: "your_app_secret", // Optional
});
```

### Integration Functions (`meta-sdk-integration.ts`)

High-level functions that use the SDK and integrate with the database:

- `syncCampaignsSDK()` - Sync campaigns using SDK
- `createCampaignSDK()` - Create campaign using SDK
- `syncAdSetsSDK()` - Sync ad sets using SDK
- `syncAdInsightsSDK()` - Sync ad insights using SDK
- `syncCatalogsSDK()` - Sync product catalogs using SDK
- `syncProductsSDK()` - Sync products using SDK

## Usage

### Campaigns

```typescript
import { syncCampaignsSDK, createCampaignSDK } from "@/lib/integrations/meta-sdk-integration";

// Sync campaigns
const result = await syncCampaignsSDK(channelId, "act_123456789");
console.log(`Synced ${result.campaignsCount} campaigns`);

// Create campaign
const campaign = await createCampaignSDK(channelId, "act_123456789", {
  name: "Summer Sale Campaign",
  objective: "CONVERSIONS",
  dailyBudget: 5000, // $50.00 in cents
  status: "PAUSED",
});
```

### Ad Sets

```typescript
import { syncAdSetsSDK } from "@/lib/integrations/meta-sdk-integration";

const result = await syncAdSetsSDK(channelId, "act_123456789", campaignId);
```

### Insights

```typescript
import { syncAdInsightsSDK } from "@/lib/integrations/meta-sdk-integration";

const result = await syncAdInsightsSDK(
  channelId,
  "act_123456789",
  "ad", // level: account | campaign | adset | ad
  {
    since: "2024-01-01",
    until: "2024-01-31",
  }
);
```

### Commerce

```typescript
import { syncCatalogsSDK, syncProductsSDK } from "@/lib/integrations/meta-sdk-integration";

// Sync catalogs
const catalogs = await syncCatalogsSDK(channelId, "business_id");

// Sync products
const products = await syncProductsSDK(catalogId);
```

## API Routes

The API routes have been updated to use the SDK by default:

### GET /api/meta/ads/campaigns

```bash
# Use SDK (default)
GET /api/meta/ads/campaigns?channelId=1&adAccountId=act_123456789

# Use manual API client (fallback)
GET /api/meta/ads/campaigns?channelId=1&adAccountId=act_123456789&useSDK=false
```

### POST /api/meta/ads/campaigns

```json
{
  "channelId": 1,
  "adAccountId": "act_123456789",
  "name": "Campaign Name",
  "objective": "CONVERSIONS",
  "dailyBudget": 5000,
  "useSDK": true  // Optional, defaults to true
}
```

## Benefits Over Manual API Client

1. **Type Safety**: Full TypeScript support prevents runtime errors
2. **Better Error Messages**: More descriptive error messages
3. **Automatic Retries**: Built-in retry logic for transient failures
4. **Rate Limiting**: Automatic rate limit handling
5. **Pagination**: Built-in pagination support
6. **Batch Operations**: Support for batch API calls
7. **Official Support**: Maintained by Meta, always up-to-date

## Migration from Manual API Client

The manual API client (`meta-client.ts`) is still available for:
- Features not yet supported by SDK
- Custom API calls
- Fallback when SDK fails

To use the manual client, set `useSDK=false` in API requests or import directly:

```typescript
import { MetaApiClient } from "@/lib/integrations/meta-client";
```

## SDK Features

### Supported Operations

- ✅ Ad Account management
- ✅ Campaign CRUD operations
- ✅ Ad Set CRUD operations
- ✅ Ad CRUD operations
- ✅ Insights/analytics
- ✅ Page operations
- ✅ Instagram operations
- ✅ Product Catalog operations
- ✅ Product operations

### Debug Mode

Enable debug mode to see API calls:

```typescript
const sdk = new MetaBusinessSDK({ accessToken });
sdk.enableDebug();
```

### API Version

Set API version:

```typescript
sdk.setApiVersion("v19.0");
```

## Best Practices

1. **Always use SDK for new code**: Prefer SDK over manual API client
2. **Handle errors gracefully**: SDK throws typed errors
3. **Use pagination**: SDK handles pagination automatically
4. **Batch operations**: Use batch API for multiple operations
5. **Rate limiting**: SDK handles rate limits automatically

## Troubleshooting

### "SDK not initialized" error

Make sure you're providing a valid access token:

```typescript
const sdk = new MetaBusinessSDK({
  accessToken: decryptSecret(channel.accessToken),
});
```

### "Invalid ad account ID" error

Ensure ad account ID format is correct: `act_123456789`

### "Permission denied" error

Check that your access token has the required permissions:
- `ads_management`
- `ads_read`
- `business_management`

## Resources

- [Meta Business SDK Documentation](https://developers.facebook.com/docs/business-sdk/getting-started)
- [Node.js SDK GitHub](https://github.com/facebook/facebook-nodejs-business-sdk)
- [SDK Reference](https://developers.facebook.com/docs/business-sdk/reference)

---

*Last Updated: After Meta Business SDK Integration*



