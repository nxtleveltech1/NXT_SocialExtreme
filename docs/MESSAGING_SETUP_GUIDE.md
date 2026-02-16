# Unified Messaging System - Setup Guide

## Quick Start

Your unified cross-platform messaging system is now ready! Here's what's been built:

## What's Included

### ✅ Database Schema
- **`messages` table** - Stores all messages from all platforms
- **Updated `conversations` table** - Links to channels and tracks conversation state

### ✅ API Endpoints
- `GET /api/messages` - Fetch conversations and messages
- `POST /api/messages` - Send messages to any platform
- `POST /api/messages/sync` - Sync messages from all platforms
- `POST /api/messages/[id]/read` - Mark conversations as read

### ✅ UI Components
- **UnifiedInbox** - Complete inbox interface with:
  - Conversation list sidebar
  - Chat view with message history
  - Message composer
  - Platform indicators
  - Real-time updates (30s polling)

### ✅ Services
- **Unified Inbox Service** - Core messaging logic
- **Platform Sync Services** - Fetch messages from each platform
- **Platform Send Services** - Send messages via platform APIs

## Setup Steps

### 1. Run Database Migration

```bash
cd my-app
bun run db:push
```

This creates the `messages` table and updates `conversations`.

### 2. Connect Your Platforms

Go to `/channels` and connect your platforms:
- Facebook
- Instagram  
- WhatsApp
- TikTok

Each platform will use OAuth (or username/password once implemented) to connect.

### 3. Sync Messages

Once platforms are connected:
1. Go to `/inbox`
2. Click "Sync Messages" in the ResponseCommandCenter
3. Messages will be fetched and displayed

### 4. Start Messaging

- Select a conversation from the sidebar
- Type your reply
- Press Enter or click Send
- Message is sent via the platform's API

## How It Works

### Message Flow

1. **Incoming Messages:**
   - Platform receives message → Webhook or sync → Stored in `messages` table
   - Appears in unified inbox automatically

2. **Outgoing Messages:**
   - You type message → Click Send → Stored in `messages` table
   - Sent via platform API → Status updated (sent/delivered/read)

### Platform Integration

Each platform has its own sync and send functions:
- **Meta (FB/IG)**: Uses Graph API with access tokens
- **WhatsApp**: Supports Twilio or Meta WhatsApp API
- **TikTok**: Uses TikTok Messaging API

## Features

### Current Features
- ✅ Unified inbox for all platforms
- ✅ Send replies from one interface
- ✅ Real-time message updates (30s polling)
- ✅ Conversation threading
- ✅ Read/unread status
- ✅ Platform indicators
- ✅ Search conversations
- ✅ Media support (ready for implementation)

### Coming Soon
- WebSocket real-time updates
- Push notifications
- Message templates
- AI response suggestions
- Rich media composer

## Testing

### Test the System

1. **Connect a Platform:**
   ```
   /channels → Click "Connect" → Complete OAuth
   ```

2. **Sync Messages:**
   ```
   /inbox → Click "Sync Messages"
   ```

3. **Send a Test Message:**
   ```
   Select conversation → Type message → Send
   ```

### Verify It Works

- Check database: Messages should appear in `messages` table
- Check UI: Conversations should show in inbox sidebar
- Check API: `/api/messages` should return conversations

## Troubleshooting

### No Messages Appearing

1. **Check Channels:**
   - Go to `/channels`
   - Verify platforms show "Connected"
   - If not, reconnect the platform

2. **Check Sync:**
   - Click "Sync Messages" manually
   - Check browser console for errors
   - Verify access tokens are valid

3. **Check Database:**
   - Verify `messages` table exists
   - Check if messages are being stored
   - Verify `conversations` table has entries

### Messages Not Sending

1. **Check Channel Connection:**
   - Verify channel is connected
   - Check access token hasn't expired

2. **Check Platform API:**
   - Verify API credentials are correct
   - Check platform-specific requirements
   - Review error messages in console

### Platform-Specific Issues

**Facebook/Instagram:**
- Requires `pages_messaging` permission
- Need to connect a Facebook Page
- Instagram requires Business account

**WhatsApp:**
- Twilio: Requires Twilio account and WhatsApp-enabled number
- Meta: Requires WhatsApp Business API setup

**TikTok:**
- Requires TikTok Business account
- Needs messaging API access

## Next Steps

1. **Connect Your Platforms** - Use the OAuth flow to connect accounts
2. **Sync Messages** - Fetch existing conversations
3. **Start Messaging** - Reply to messages from the unified inbox

## Support

For issues or questions:
- Check `/docs/UNIFIED_MESSAGING_SYSTEM.md` for detailed docs
- Review platform-specific setup guides
- Check browser console for errors

