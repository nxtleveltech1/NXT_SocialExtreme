# Twilio WhatsApp Business - Quick Reference

Quick reference guide for common Twilio WhatsApp operations.

## Installation

```bash
npm install twilio
# or
bun add twilio
```

## Initialize Client

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

## Send Text Message

```typescript
const message = await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+1234567890',
  body: 'Hello!',
});
```

## Send Media Message

```typescript
const message = await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+1234567890',
  body: 'Check this out!',
  mediaUrl: ['https://example.com/image.jpg'],
});
```

## Generate TwiML Response

```typescript
import { MessagingResponse } from 'twilio';

const response = new MessagingResponse();
response.message('Hello World!');
console.log(response.toString());
```

## Webhook Handler (Basic)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MessagingResponse } from 'twilio';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = formData.get('From');
  const body = formData.get('Body');

  const response = new MessagingResponse();
  response.message('Thank you for your message!');

  return new Response(response.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
```

## Status Callback Handler

```typescript
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const messageSid = formData.get('MessageSid');
  const status = formData.get('MessageStatus');

  // Update message status in database
  // ...

  return new Response('', { status: 200 });
}
```

## Environment Variables

```env
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

## Common Phone Number Formats

- **WhatsApp**: `whatsapp:+1234567890`
- **E.164 Format**: `+1234567890`
- **Remove prefix**: `number.replace('whatsapp:', '')`

## Message Status Values

- `queued` - Message queued
- `sent` - Message sent
- `delivered` - Message delivered
- `read` - Message read
- `failed` - Message failed
- `undelivered` - Message undelivered

## Error Handling

```typescript
try {
  const message = await client.messages.create({...});
} catch (error: any) {
  if (error.code === 21211) {
    // Invalid 'To' phone number
  } else if (error.code === 21608) {
    // Unsubscribed recipient
  }
  // Handle other errors
}
```

## Webhook Parameters

**Incoming Message:**
- `MessageSid` - Message identifier
- `From` - Sender (whatsapp:+1234567890)
- `To` - Recipient (whatsapp:+14155238886)
- `Body` - Message text
- `NumMedia` - Number of media attachments

**Status Callback:**
- `MessageSid` - Message identifier
- `MessageStatus` - Current status
- `ErrorCode` - Error code (if failed)
- `ErrorMessage` - Error message (if failed)

## Useful Links

- [Complete Guide](./TWILIO_WHATSAPP_BUSINESS_COMPLETE_GUIDE.md)
- [Twilio Docs](https://www.twilio.com/docs/whatsapp)
- [TwiML Reference](https://www.twilio.com/docs/messaging/twiml)



