# WhatsApp Business Integration (Without Meta)

This guide covers alternative methods to connect your WhatsApp Business number without using Meta's Business Manager setup.

## Available Options

### Option 1: WhatsApp Cloud API (Simplified Meta API)
**Best for**: Direct API access without Business Manager complexity  
**Provider**: Meta (but simpler setup)  
**Cost**: Free tier available, then pay-per-message

**Setup Steps:**
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app → Select "Business" type
3. Add "WhatsApp" product to your app
4. Get your:
   - **Phone Number ID** (from WhatsApp → API Setup)
   - **Temporary Access Token** (from WhatsApp → API Setup)
   - **App ID** and **App Secret** (from App Settings)

**Environment Variables:**
```env
# WhatsApp Cloud API (Direct)
WHATSAPP_CLOUD_API_PHONE_NUMBER_ID="your_phone_number_id"
WHATSAPP_CLOUD_API_ACCESS_TOKEN="your_temporary_token"
WHATSAPP_CLOUD_API_APP_ID="your_app_id"
WHATSAPP_CLOUD_API_APP_SECRET="your_app_secret"
WHATSAPP_BUSINESS_PHONE_NUMBER="+27 76 147 8369"
```

---

### Option 2: Twilio WhatsApp API
**Best for**: Enterprise-grade reliability, global reach  
**Provider**: Twilio  
**Cost**: Pay-per-message pricing

**Setup Steps:**
1. Sign up for [Twilio Account](https://www.twilio.com/)
2. Get WhatsApp enabled on your account (may require approval)
3. Get your:
   - **Account SID**
   - **Auth Token**
   - **WhatsApp-enabled Phone Number** (Twilio provides this)

**Environment Variables:**
```env
# Twilio WhatsApp API
TWILIO_ACCOUNT_SID="your_account_sid"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"  # Twilio's WhatsApp number
WHATSAPP_BUSINESS_PHONE_NUMBER="+27 76 147 8369"  # Your business number
```

---

### Option 3: MessageBird WhatsApp API
**Best for**: European businesses, easy setup  
**Provider**: MessageBird  
**Cost**: Pay-per-message pricing

**Setup Steps:**
1. Sign up for [MessageBird](https://www.messagebird.com/)
2. Request WhatsApp access
3. Get your:
   - **API Key**
   - **Channel ID**
   - **WhatsApp-enabled Phone Number**

**Environment Variables:**
```env
# MessageBird WhatsApp API
MESSAGEBIRD_API_KEY="your_api_key"
MESSAGEBIRD_CHANNEL_ID="your_channel_id"
WHATSAPP_BUSINESS_PHONE_NUMBER="+27 76 147 8369"
```

---

### Option 4: WhatsApp Business App API (via Third-Party)
**Best for**: Quick setup, no API approval needed  
**Provider**: Services like Unipile, Whatsboost  
**Cost**: Subscription-based

**How it works**: These services connect via WhatsApp Web protocol using QR code authentication.

**Setup Steps:**
1. Sign up with provider (e.g., Unipile, Whatsboost)
2. Scan QR code with your WhatsApp Business App
3. Get API credentials from provider

**Environment Variables:**
```env
# Third-Party WhatsApp Business App API
WHATSAPP_PROVIDER="unipile"  # or "whatsboost", etc.
WHATSAPP_PROVIDER_API_KEY="your_provider_api_key"
WHATSAPP_PROVIDER_API_URL="https://api.provider.com"
WHATSAPP_BUSINESS_PHONE_NUMBER="+27 76 147 8369"
```

---

## Recommended: Twilio WhatsApp API

Twilio is the most popular and reliable option for WhatsApp Business integration without Meta Business Manager.

### Why Twilio?
- ✅ No Meta Business Manager required
- ✅ Enterprise-grade reliability
- ✅ Global infrastructure
- ✅ Excellent documentation
- ✅ Webhook support
- ✅ Message templates support

### 📚 Complete Documentation

**For comprehensive Twilio WhatsApp Business setup, see:**
- **[TWILIO_WHATSAPP_BUSINESS_COMPLETE_GUIDE.md](./TWILIO_WHATSAPP_BUSINESS_COMPLETE_GUIDE.md)** - Complete guide covering:
  - Account setup and verification
  - SDK installation and usage
  - TwiML for messaging
  - Sending/receiving messages
  - Webhook configuration
  - Message templates
  - Media messages
  - Status callbacks
  - Best practices and troubleshooting

### Quick Implementation Steps

1. **Sign up for Twilio**
   - Go to https://www.twilio.com/
   - Create account and verify email
   - Complete account verification

2. **Enable WhatsApp**
   - Navigate to Messaging → Try it out → Send a WhatsApp message
   - Twilio provides a sandbox number for testing
   - For production, request WhatsApp-enabled number

3. **Get Credentials**
   - Account SID: Found in Twilio Console dashboard
   - Auth Token: Found in Twilio Console dashboard (click to reveal)
   - WhatsApp From Number: Provided by Twilio (format: `whatsapp:+14155238886`)

4. **Configure Environment Variables**
   ```env
   TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   TWILIO_AUTH_TOKEN="your_auth_token_here"
   TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
   WHATSAPP_BUSINESS_PHONE_NUMBER="+27 76 147 8369"
   ```

5. **Set Up Webhooks**
   - In Twilio Console → Phone Numbers → Configure
   - Set webhook URL: `https://yourdomain.com/api/webhooks/whatsapp/twilio`
   - For status callbacks: `https://yourdomain.com/api/webhooks/whatsapp/twilio/status`

6. **Install Twilio SDK**
   ```bash
   npm install twilio
   # or
   bun add twilio
   ```

---

## Next Steps

After choosing your provider and setting up credentials:

1. **Update Environment Variables** in `.env.local`
2. **Create Integration Module** - See implementation guide below
3. **Set Up Webhooks** - Configure webhook endpoints
4. **Test Connection** - Send test message
5. **Update Channel Connection** - Modify connection modal to support chosen provider

---

## Implementation Files Needed

Based on your chosen provider, you'll need to create:

### For Twilio:
- `src/lib/integrations/whatsapp-twilio.ts` - Twilio API client
- `src/app/api/webhooks/whatsapp/twilio/route.ts` - Webhook handler
- `src/app/api/whatsapp/send/route.ts` - Send message endpoint

### For WhatsApp Cloud API:
- `src/lib/integrations/whatsapp-cloud-api.ts` - Cloud API client
- `src/app/api/webhooks/whatsapp/cloud-api/route.ts` - Webhook handler
- `src/app/api/whatsapp/send/route.ts` - Send message endpoint

### For MessageBird:
- `src/lib/integrations/whatsapp-messagebird.ts` - MessageBird API client
- `src/app/api/webhooks/whatsapp/messagebird/route.ts` - Webhook handler
- `src/app/api/whatsapp/send/route.ts` - Send message endpoint

---

## Comparison Table

| Provider | Setup Complexity | Cost | Reliability | Best For |
|----------|-----------------|------|-------------|----------|
| **WhatsApp Cloud API** | Medium | Free tier + pay-per-message | High | Direct API access |
| **Twilio** | Low | Pay-per-message | Very High | Enterprise, global |
| **MessageBird** | Low | Pay-per-message | High | European businesses |
| **Third-Party (Unipile)** | Very Low | Subscription | Medium | Quick setup, small scale |

---

## Security Considerations

1. **Never commit credentials** - Use environment variables only
2. **Encrypt tokens** - Store access tokens encrypted in database
3. **Verify webhooks** - Always verify webhook signatures
4. **Rate limiting** - Implement rate limiting for API calls
5. **Error handling** - Handle API failures gracefully

---

## Support & Documentation

### Twilio WhatsApp
- **Complete Setup Guide**: [TWILIO_WHATSAPP_BUSINESS_COMPLETE_GUIDE.md](./TWILIO_WHATSAPP_BUSINESS_COMPLETE_GUIDE.md)
- **Official Docs**: https://www.twilio.com/docs/whatsapp
- **Quickstart**: https://www.twilio.com/docs/whatsapp/quickstart
- **TwiML Reference**: https://www.twilio.com/docs/messaging/twiml
- **Node.js SDK**: https://www.twilio.com/docs/libraries/node

### Other Providers
- **WhatsApp Cloud API**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **MessageBird**: https://developers.messagebird.com/api/whatsapp/

---

## Need Help?

If you need assistance implementing any of these options, specify which provider you'd like to use and we can create the integration code.

