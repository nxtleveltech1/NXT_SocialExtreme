# Twilio WhatsApp Business - Complete Setup & Management Guide

This comprehensive guide covers everything you need to know about setting up and managing WhatsApp Business through Twilio, including APIs, SDKs, TwiML, webhooks, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Account Setup](#account-setup)
3. [WhatsApp Sender Registration](#whatsapp-sender-registration)
4. [SDK Installation & Setup](#sdk-installation--setup)
5. [TwiML for Messaging](#twiml-for-messaging)
6. [Sending Messages](#sending-messages)
7. [Receiving Messages & Webhooks](#receiving-messages--webhooks)
8. [Message Templates](#message-templates)
9. [Media Messages](#media-messages)
10. [Status Callbacks](#status-callbacks)
11. [Sandbox vs Production](#sandbox-vs-production)
12. [Best Practices](#best-practices)
13. [API Reference](#api-reference)
14. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Twilio WhatsApp Business API?

Twilio's WhatsApp Business API enables businesses to:
- Send and receive WhatsApp messages programmatically
- Build customer support automation
- Send transactional notifications
- Create marketing campaigns
- Handle two-way conversations at scale

### Key Features

- ✅ **Enterprise-grade reliability** - Global infrastructure
- ✅ **No Meta Business Manager required** - Direct integration
- ✅ **Webhook support** - Real-time message handling
- ✅ **Message templates** - Pre-approved business messages
- ✅ **Media support** - Images, videos, documents, audio
- ✅ **Status tracking** - Delivery and read receipts
- ✅ **Conversations API** - Multi-channel messaging
- ✅ **TwiML** - Flexible message handling

### Pricing

- **Pay-per-message** pricing model
- Costs vary by country/region
- Check [Twilio Pricing](https://www.twilio.com/whatsapp/pricing) for current rates

---

## Account Setup

### Step 1: Create Twilio Account

1. Go to [https://www.twilio.com/](https://www.twilio.com/)
2. Click "Sign Up" and create an account
3. Verify your email address
4. Complete phone number verification

### Step 2: Get Your Credentials

From the [Twilio Console Dashboard](https://www.twilio.com/console):

1. **Account SID**: Found in the dashboard (starts with `AC`)
2. **Auth Token**: Click to reveal (keep this secret!)
3. **Phone Number**: Twilio provides WhatsApp-enabled numbers

### Step 3: Enable WhatsApp

**Option A: Sandbox (Testing)**
- Navigate to: Messaging → Try it out → Send a WhatsApp message
- Twilio provides a sandbox number (e.g., `whatsapp:+14155238886`)
- Join the sandbox by sending a code to the provided number

**Option B: Production**
- Request WhatsApp access through Twilio Console
- Complete WhatsApp sender registration (see next section)
- Get approved WhatsApp-enabled phone number

### Step 4: Environment Variables

Add to your `.env.local`:

```env
# Twilio WhatsApp API
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"  # Sandbox or production number
WHATSAPP_BUSINESS_PHONE_NUMBER="+27 76 147 8369"  # Your business number
```

---

## WhatsApp Sender Registration

### Self-Signup Process

For direct customers (not ISVs), use WhatsApp Self-Signup:

1. **Navigate to**: Twilio Console → Messaging → Senders → WhatsApp Senders
2. **Click**: "Register WhatsApp Sender"
3. **Provide Business Information**:
   - Company name
   - Website URL
   - Business description
   - Headquarters country
   - Business type/industry

4. **Select Phone Number**:
   - Use existing Twilio number, OR
   - Purchase new Twilio number, OR
   - Use your own number (must not be registered with WhatsApp)

5. **Set Display Name**:
   - Must comply with [Meta's Display Name Guidelines](https://developers.facebook.com/docs/whatsapp/guides/display-name)
   - 3-25 characters
   - Only letters, numbers, spaces, and some special characters
   - Cannot be generic (e.g., "Business", "Company")

6. **Submit for Review**:
   - Twilio reviews your submission
   - Approval typically takes 1-3 business days
   - You'll receive email notifications about status

### Meta Business Manager Linking

For production use, you may need to link your Twilio account to Meta Business Manager:

1. Create/access Meta Business Manager account
2. In Twilio Console, link your WhatsApp sender to Meta Business Manager
3. Complete business verification with Meta (if required)

---

## SDK Installation & Setup

### Node.js SDK Installation

```bash
npm install twilio
# or
bun add twilio
```

### Initialize Twilio Client

```typescript
// src/lib/integrations/whatsapp-twilio.ts
import twilio from 'twilio';
import { env } from '@/lib/env';

if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
  throw new Error('Twilio credentials not configured');
}

export const twilioClient = twilio(
  env.TWILIO_ACCOUNT_SID,
  env.TWILIO_AUTH_TOKEN
);

export const TWILIO_WHATSAPP_FROM = env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
```

### SDK Methods Overview

The Twilio Node.js SDK provides these key methods:

- `twilioClient.messages.create()` - Send messages
- `twilioClient.messages.list()` - List messages
- `twilioClient.messages(messageSid).fetch()` - Get message details
- `twilioClient.messages(messageSid).update()` - Update message
- `twilioClient.messages(messageSid).delete()` - Delete message

---

## TwiML for Messaging

### What is TwiML?

**TwiML** (Twilio Markup Language) is an XML-based language that instructs Twilio how to handle incoming messages and calls.

### Basic TwiML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <!-- TwiML verbs go here -->
</Response>
```

### TwiML Messaging Verbs

#### `<Message>` - Send a Message

**Basic Text Message:**
```xml
<Response>
    <Message>Hello World!</Message>
</Response>
```

**With Body Tag:**
```xml
<Response>
    <Message>
        <Body>Hello World!</Body>
    </Message>
</Response>
```

**Multiple Messages:**
```xml
<Response>
    <Message>This is message 1 of 2.</Message>
    <Message>This is message 2 of 2.</Message>
</Response>
```

**With Media:**
```xml
<Response>
    <Message>
        <Body>Check out this image!</Body>
        <Media>https://example.com/image.jpg</Media>
    </Message>
</Response>
```

**Message Attributes:**
- `to` - Recipient number (optional, defaults to sender)
- `from` - Sender number (optional)
- `action` - URL to call after message is sent
- `method` - HTTP method for action URL (GET/POST)
- `statusCallback` - URL for status updates

#### `<Redirect>` - Redirect Control Flow

```xml
<Response>
    <Message>Hello!</Message>
    <Redirect>https://example.com/next-step</Redirect>
</Response>
```

### Generating TwiML with SDK

```typescript
import { MessagingResponse } from 'twilio';

const response = new MessagingResponse();
response.message('Hello World!');
response.redirect('https://example.com/next-step');

console.log(response.toString());
// Outputs: <?xml version="1.0" encoding="UTF-8"?>...
```

### TwiML Response Requirements

- **Content-Type**: `text/xml`, `application/xml`, or `text/html`
- **Status Code**: `200 OK`
- **Root Element**: Must be `<Response>`
- **Case Sensitive**: Use `<Message>` not `<message>`

---

## Sending Messages

### Send Text Message

```typescript
// src/lib/integrations/whatsapp-twilio.ts
import twilio from 'twilio';
import { env } from '@/lib/env';

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export async function sendWhatsAppMessage(
  to: string,
  body: string
) {
  try {
    const message = await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM, // e.g., 'whatsapp:+14155238886'
      to: `whatsapp:${to}`, // e.g., 'whatsapp:+1234567890'
      body: body,
    });

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    console.error('Twilio WhatsApp send error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Send Media Message

```typescript
export async function sendWhatsAppMedia(
  to: string,
  mediaUrl: string,
  body?: string
) {
  try {
    const message = await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: body || '',
      mediaUrl: [mediaUrl], // Array of URLs
    });

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Send Message Template

```typescript
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  templateParams: string[]
) {
  try {
    const message = await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      contentSid: templateName, // Template SID from Twilio
      contentVariables: JSON.stringify({
        // Template variables
        '1': templateParams[0],
        '2': templateParams[1],
      }),
    });

    return {
      success: true,
      messageSid: message.sid,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### API Route Example

```typescript
// src/app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/integrations/whatsapp-twilio';

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'to and message required' },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage(to, message);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Receiving Messages & Webhooks

### Webhook Setup

1. **In Twilio Console**:
   - Navigate to: Phone Numbers → Manage → Active Numbers
   - Select your WhatsApp-enabled number
   - Under "Messaging Configuration":
     - **Webhook URL**: `https://yourdomain.com/api/webhooks/whatsapp/twilio`
     - **HTTP Method**: POST
     - **Status Callback URL**: `https://yourdomain.com/api/webhooks/whatsapp/twilio/status`

2. **For Sandbox**:
   - Navigate to: Messaging → Try it out → Send a WhatsApp message
   - Configure webhook URL in sandbox settings

### Webhook Request Format

Twilio sends POST requests with form-encoded data:

```
POST /api/webhooks/whatsapp/twilio
Content-Type: application/x-www-form-urlencoded

MessageSid=SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AccountSid=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MessagingServiceSid=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
From=whatsapp:+14155238886
To=whatsapp:+1234567890
Body=Hello from WhatsApp
NumMedia=0
```

### Webhook Handler Implementation

```typescript
// src/app/api/webhooks/whatsapp/twilio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MessagingResponse } from 'twilio';
import { db } from '@/db/db';
import { conversations, messages } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const messageSid = formData.get('MessageSid') as string;
    const from = formData.get('From') as string; // whatsapp:+1234567890
    const to = formData.get('To') as string; // whatsapp:+14155238886
    const body = formData.get('Body') as string;
    const numMedia = parseInt(formData.get('NumMedia') as string || '0');

    // Extract phone number (remove 'whatsapp:' prefix)
    const fromNumber = from.replace('whatsapp:', '');
    const toNumber = to.replace('whatsapp:', '');

    // Handle media if present
    const mediaUrls: string[] = [];
    if (numMedia > 0) {
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = formData.get(`MediaUrl${i}`) as string;
        if (mediaUrl) mediaUrls.push(mediaUrl);
      }
    }

    // Find or create conversation
    let conversation = await db.query.conversations.findFirst({
      where: eq(conversations.channelId, channelId), // You'll need channelId
      // Add more conditions to match the conversation
    });

    if (!conversation) {
      // Create new conversation
      [conversation] = await db.insert(conversations).values({
        channelId: channelId,
        participantId: fromNumber,
        // ... other fields
      }).returning();
    }

    // Save incoming message
    await db.insert(messages).values({
      conversationId: conversation.id,
      content: body,
      senderId: fromNumber,
      direction: 'inbound',
      providerMessageId: messageSid,
      metadata: {
        mediaUrls,
        numMedia,
      },
    });

    // Generate TwiML response
    const response = new MessagingResponse();
    
    // Auto-reply example
    if (body.toLowerCase().includes('hello')) {
      response.message('Hello! How can I help you?');
    } else {
      response.message('Thank you for your message. We\'ll get back to you soon!');
    }

    return new Response(response.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error: any) {
    console.error('Twilio webhook error:', error);
    
    // Return empty TwiML response on error
    const response = new MessagingResponse();
    return new Response(response.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

// Webhook verification (GET) - Twilio may call this
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok' });
}
```

### Webhook Security

**Verify Twilio Signatures** (Recommended):

```typescript
import crypto from 'crypto';

function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  // Create signature string
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      return acc + key + params[key];
    }, url);

  // Create HMAC
  const computedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

// In your webhook handler:
export async function POST(req: NextRequest) {
  const signature = req.headers.get('X-Twilio-Signature');
  const url = req.url;
  
  // Parse form data to object
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value as string;
  });

  if (!verifyTwilioSignature(url, params, signature || '', env.TWILIO_AUTH_TOKEN)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Process webhook...
}
```

---

## Message Templates

### What are Message Templates?

WhatsApp requires **pre-approved message templates** for business-initiated messages (messages sent outside the 24-hour customer service window).

### Template Types

1. **Text Templates** - Plain text messages
2. **Media Templates** - Messages with images/videos
3. **Interactive Templates** - Buttons, lists, quick replies

### Creating Templates

**Via Twilio Console:**
1. Navigate to: Messaging → Content → Content Templates
2. Click "Create New Template"
3. Select "WhatsApp" as channel
4. Fill in template details:
   - Name
   - Category (MARKETING, UTILITY, AUTHENTICATION)
   - Language
   - Content
   - Variables (if needed)

**Via API:**
```typescript
// Note: Template creation is typically done via Twilio Console
// But you can fetch and use templates via API
```

### Using Templates

```typescript
export async function sendTemplateMessage(
  to: string,
  templateSid: string,
  variables: Record<string, string>
) {
  const message = await client.messages.create({
    from: env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    contentSid: templateSid,
    contentVariables: JSON.stringify(variables),
  });

  return message;
}
```

### Template Approval Process

1. Submit template in Twilio Console
2. Twilio reviews template
3. Template sent to Meta/WhatsApp for approval
4. Approval typically takes 24-48 hours
5. You'll receive email notification when approved

### Template Best Practices

- ✅ Use clear, concise language
- ✅ Include only necessary variables
- ✅ Follow WhatsApp's template guidelines
- ✅ Avoid promotional language in UTILITY templates
- ✅ Test templates before submitting

---

## Media Messages

### Supported Media Types

- **Images**: JPEG, PNG, GIF (max 5MB)
- **Videos**: MP4, 3GP (max 16MB)
- **Audio**: OGG, AMR, MP3, AAC (max 16MB)
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX (max 100MB)

### Send Image

```typescript
export async function sendImage(
  to: string,
  imageUrl: string,
  caption?: string
) {
  const message = await client.messages.create({
    from: env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    body: caption || '',
    mediaUrl: [imageUrl],
  });

  return message;
}
```

### Send Video

```typescript
export async function sendVideo(
  to: string,
  videoUrl: string,
  caption?: string
) {
  const message = await client.messages.create({
    from: env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    body: caption || '',
    mediaUrl: [videoUrl],
  });

  return message;
}
```

### Send Document

```typescript
export async function sendDocument(
  to: string,
  documentUrl: string,
  filename?: string
) {
  const message = await client.messages.create({
    from: env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    body: filename || 'Document',
    mediaUrl: [documentUrl],
  });

  return message;
}
```

### Receive Media in Webhook

```typescript
// In webhook handler
const numMedia = parseInt(formData.get('NumMedia') as string || '0');
const mediaUrls: string[] = [];

if (numMedia > 0) {
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = formData.get(`MediaUrl${i}`) as string;
    const mediaContentType = formData.get(`MediaContentType${i}`) as string;
    
    mediaUrls.push({
      url: mediaUrl,
      contentType: mediaContentType,
    });
  }
}
```

### Media URL Requirements

- URLs must be publicly accessible (HTTPS)
- Media must be served with correct Content-Type headers
- Consider using Twilio's Media API or cloud storage (S3, etc.)

---

## Status Callbacks

### What are Status Callbacks?

Status callbacks notify your application when message status changes:
- `queued` - Message queued for delivery
- `sent` - Message sent to WhatsApp
- `delivered` - Message delivered to recipient
- `read` - Message read by recipient
- `failed` - Message failed to send
- `undelivered` - Message could not be delivered

### Setting Up Status Callbacks

**Option 1: Per Message**
```typescript
const message = await client.messages.create({
  from: env.TWILIO_WHATSAPP_FROM,
  to: `whatsapp:${to}`,
  body: 'Hello',
  statusCallback: 'https://yourdomain.com/api/webhooks/whatsapp/twilio/status',
  statusCallbackMethod: 'POST',
});
```

**Option 2: Global (Messaging Service)**
- Configure in Twilio Console → Messaging → Services
- Set Status Callback URL for all messages

### Status Callback Handler

```typescript
// src/app/api/webhooks/whatsapp/twilio/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { messages } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string;
    const errorMessage = formData.get('ErrorMessage') as string;

    // Update message status in database
    await db.update(messages)
      .set({
        status: messageStatus,
        errorCode: errorCode || null,
        errorMessage: errorMessage || null,
        updatedAt: new Date(),
      })
      .where(eq(messages.providerMessageId, messageSid));

    // Return 200 OK (required by Twilio)
    return new Response('', { status: 200 });
  } catch (error) {
    console.error('Status callback error:', error);
    return new Response('', { status: 200 }); // Always return 200
  }
}
```

### Status Callback Parameters

- `MessageSid` - Unique message identifier
- `MessageStatus` - Current status
- `ErrorCode` - Error code if failed
- `ErrorMessage` - Error description if failed
- `AccountSid` - Your Twilio account SID
- `From` - Sender number
- `To` - Recipient number

---

## Sandbox vs Production

### Twilio WhatsApp Sandbox

**Purpose**: Testing and development

**Features**:
- No approval needed
- Pre-configured number
- Limited functionality
- Free testing

**Limitations**:
- Only works with joined numbers
- Cannot send to arbitrary numbers
- Not suitable for production

**Joining Sandbox**:
1. Send WhatsApp message to sandbox number
2. Send code provided by Twilio
3. You're now joined to sandbox

### Production Setup

**Requirements**:
1. Complete WhatsApp sender registration
2. Get approved WhatsApp-enabled number
3. Set up webhooks
4. Create and approve message templates
5. Complete business verification (if required)

**Migration Steps**:
1. Register WhatsApp sender (see earlier section)
2. Get production phone number
3. Update `TWILIO_WHATSAPP_FROM` environment variable
4. Update webhook URLs if needed
5. Test with production number
6. Gradually migrate users

---

## Best Practices

### Message Sending

1. **24-Hour Window**:
   - After customer messages you, you have 24 hours to respond
   - Use templates for messages outside 24-hour window
   - Always respond promptly to keep window open

2. **Opt-In Requirements**:
   - Get explicit user consent before sending messages
   - Provide clear opt-out instructions
   - Honor opt-out requests immediately

3. **Rate Limiting**:
   - Don't send too many messages too quickly
   - Implement rate limiting in your code
   - Respect WhatsApp's rate limits

4. **Error Handling**:
   - Always handle API errors gracefully
   - Log errors for debugging
   - Retry failed messages (with backoff)

### Webhook Handling

1. **Always Return TwiML**:
   - Even on errors, return valid TwiML
   - Empty `<Response/>` is acceptable

2. **Process Asynchronously**:
   - Don't do heavy processing in webhook handler
   - Queue tasks for background processing
   - Return response quickly (< 3 seconds)

3. **Verify Signatures**:
   - Always verify Twilio signatures
   - Prevent unauthorized requests

4. **Idempotency**:
   - Handle duplicate webhook deliveries
   - Check if message already processed

### Security

1. **Protect Credentials**:
   - Never commit credentials to git
   - Use environment variables
   - Rotate tokens regularly

2. **HTTPS Only**:
   - Always use HTTPS for webhooks
   - Twilio requires HTTPS in production

3. **Validate Input**:
   - Validate all webhook data
   - Sanitize user input
   - Prevent injection attacks

### Performance

1. **Database Optimization**:
   - Index frequently queried fields
   - Use connection pooling
   - Batch database operations

2. **Caching**:
   - Cache template data
   - Cache conversation data
   - Use Redis for session data

3. **Monitoring**:
   - Monitor message delivery rates
   - Track error rates
   - Set up alerts for failures

---

## API Reference

### Messages API

**Send Message**:
```typescript
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json

Body:
- From: whatsapp:+14155238886
- To: whatsapp:+1234567890
- Body: Message text
```

**List Messages**:
```typescript
GET https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
```

**Get Message**:
```typescript
GET https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages/{MessageSid}.json
```

### SDK Methods

```typescript
// Send message
const message = await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+1234567890',
  body: 'Hello!',
});

// List messages
const messages = await client.messages.list({
  to: 'whatsapp:+1234567890',
  limit: 20,
});

// Get message
const message = await client.messages(messageSid).fetch();

// Update message (limited - mainly for redaction)
await client.messages(messageSid).update({
  body: 'Updated message',
});

// Delete message
await client.messages(messageSid).remove();
```

---

## Troubleshooting

### Common Issues

**1. Message Not Sending**

- Check credentials are correct
- Verify phone number format (`whatsapp:+1234567890`)
- Check if number is in sandbox (if using sandbox)
- Verify account has sufficient balance
- Check message template approval status

**2. Webhook Not Receiving Messages**

- Verify webhook URL is accessible (HTTPS)
- Check webhook URL in Twilio Console
- Verify webhook returns valid TwiML
- Check server logs for errors
- Test webhook endpoint manually

**3. Template Not Approved**

- Review template against WhatsApp guidelines
- Check template category (MARKETING vs UTILITY)
- Wait for approval (24-48 hours)
- Contact Twilio support if delayed

**4. Media Not Sending**

- Verify media URL is publicly accessible
- Check file size limits
- Verify Content-Type headers
- Ensure HTTPS URL

**5. Status Callbacks Not Working**

- Verify status callback URL
- Check URL returns 200 OK
- Verify signature validation (if implemented)
- Check Twilio Console logs

### Debugging Tips

1. **Enable Debug Logging**:
```typescript
import twilio from 'twilio';

const client = twilio(accountSid, authToken, {
  logLevel: 'debug', // Enable debug logging
});
```

2. **Check Twilio Console**:
   - View message logs
   - Check error codes
   - Review webhook delivery logs

3. **Test Webhooks Locally**:
   - Use ngrok for local testing
   - Set up ngrok tunnel
   - Update webhook URL in Twilio

4. **Monitor API Responses**:
   - Log all API responses
   - Check error codes
   - Review error messages

---

## Additional Resources

### Official Documentation

- [Twilio WhatsApp Documentation](https://www.twilio.com/docs/whatsapp)
- [Twilio WhatsApp Quickstart](https://www.twilio.com/docs/whatsapp/quickstart)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [TwiML for Messaging](https://www.twilio.com/docs/messaging/twiml)
- [Twilio API Reference](https://www.twilio.com/docs/usage/api)

### Video Tutorials

- [Getting Started with Twilio WhatsApp API](https://www.youtube.com/live/UVez2UyjpFk)

### Community

- [Twilio Community](https://www.twilio.com/community)
- [Stack Overflow - Twilio Tag](https://stackoverflow.com/questions/tagged/twilio)
- [Twilio Support](https://support.twilio.com/)

### Code Examples

- [Twilio Code Samples](https://www.twilio.com/docs/samples)
- [GitHub - Twilio Node.js Examples](https://github.com/twilio/twilio-node)

---

## Implementation Checklist

- [ ] Create Twilio account
- [ ] Get Account SID and Auth Token
- [ ] Enable WhatsApp (sandbox or production)
- [ ] Install Twilio SDK (`npm install twilio`)
- [ ] Set up environment variables
- [ ] Create Twilio client initialization
- [ ] Implement send message function
- [ ] Set up webhook endpoint
- [ ] Implement webhook handler
- [ ] Add webhook signature verification
- [ ] Set up status callback endpoint
- [ ] Implement status callback handler
- [ ] Create message templates (if needed)
- [ ] Test sending messages
- [ ] Test receiving messages
- [ ] Test media messages
- [ ] Set up error handling
- [ ] Add logging and monitoring
- [ ] Migrate to production (if using sandbox)

---

## Next Steps

After completing this guide:

1. **Integrate with Your App**:
   - Create integration module (`src/lib/integrations/whatsapp-twilio.ts`)
   - Create API routes for sending messages
   - Set up webhook handlers

2. **Database Integration**:
   - Store conversations
   - Store messages
   - Track message status

3. **UI Components**:
   - Create WhatsApp channel connection UI
   - Build message composer
   - Display conversation history

4. **Advanced Features**:
   - Message templates management
   - Automated responses
   - Conversation routing
   - Analytics dashboard

---

**Last Updated**: 2025-01-27  
**Twilio API Version**: 2010-04-01  
**SDK Version**: Latest



