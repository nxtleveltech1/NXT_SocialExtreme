# Unified Cross-Platform Messaging System

## Overview

The Unified Messaging System allows you to manage and respond to messages from all platforms (Facebook, Instagram, WhatsApp, TikTok) from a single inbox interface. All messages are collected, stored, and can be replied to from one central location.

## Features

✅ **Unified Inbox** - All messages from all platforms in one place  
✅ **Cross-Platform Replies** - Send replies to any platform from the same interface  
✅ **Real-Time Updates** - Messages sync automatically every 30 seconds  
✅ **Conversation Threading** - Messages grouped by conversation  
✅ **Platform Indicators** - Visual badges show which platform each message is from  
✅ **Read/Unread Status** - Track which messages have been read  
✅ **Media Support** - Send and receive images, videos, and files  
✅ **Search** - Search across all conversations  

## Architecture

### Database Schema

#### `conversations` Table
- Stores conversation metadata from all platforms
- Links to channels (connected accounts)
- Tracks unread status, priority, assignment, etc.

#### `messages` Table
- Unified storage for all messages from all platforms
- Supports text, media, attachments, quick replies
- Tracks message status (sent, delivered, read, failed)
- Links messages to conversations

### API Endpoints

#### `GET /api/messages`
- Get all conversations or messages for a specific conversation
- Query params:
  - `conversationId` - Get messages for a conversation
  - `platform` - Filter by platform
  - `limit` - Limit number of results

#### `POST /api/messages`
- Send a message to a conversation
- Body:
  ```json
  {
    "conversationId": 1,
    "platform": "WhatsApp",
    "content": "Hello!",
    "messageType": "text",
    "channelId": 1
  }
  ```

#### `POST /api/messages/sync`
- Sync messages from all connected platforms
- Fetches new messages and stores them in the database

#### `POST /api/messages/[conversationId]/read`
- Mark a conversation and its messages as read

### Components

#### `UnifiedInbox`
- Main inbox component showing all conversations
- Conversation list sidebar
- Chat view with message history
- Message composer

#### `ResponseCommandCenter`
- Dashboard showing response metrics
- Sync button to manually sync messages

## How It Works

### 1. Platform Connection

When you connect a platform (Facebook, Instagram, WhatsApp, TikTok):
- The channel is stored with its access token
- The channel is marked as `isConnected: true`

### 2. Message Syncing

Messages are synced in two ways:

**Automatic (Polling):**
- Every 30 seconds, the inbox checks for new messages
- New messages are fetched and stored in the database

**Manual:**
- Click "Sync Messages" button in ResponseCommandCenter
- Triggers immediate sync from all connected platforms

### 3. Sending Messages

When you send a message:
1. Message is created in the database with status "pending"
2. Platform-specific API is called to send the message
3. Message status is updated to "sent" on success, "failed" on error
4. Conversation's last message and timestamp are updated

### 4. Platform-Specific Implementation

Each platform has its own sync and send functions:

- **Facebook/Instagram**: Meta Graph API
- **WhatsApp**: Twilio API or Meta WhatsApp Business API
- **TikTok**: TikTok API

## Usage

### Viewing Messages

1. Navigate to `/inbox`
2. All conversations from all platforms appear in the sidebar
3. Click a conversation to view messages
4. Messages are sorted by timestamp (oldest first)

### Sending Replies

1. Select a conversation
2. Type your message in the input at the bottom
3. Press Enter or click Send
4. Message is sent via the platform's API
5. Message appears in the chat immediately

### Syncing Messages

- **Automatic**: Messages sync every 30 seconds
- **Manual**: Click "Sync Messages" in the ResponseCommandCenter

## Platform Authentication

### Current Status

The system uses OAuth tokens stored in the `channels` table:
- `accessToken` - Platform access token
- `refreshToken` - Token refresh token (if applicable)
- `tokenExpiresAt` - Token expiration time

### Future Enhancement

To support username/password login:
1. Store credentials securely (encrypted)
2. Implement platform-specific login flows
3. Convert to OAuth tokens automatically
4. Use tokens for API calls

## Database Migration

After adding the new schema, run:

```bash
bun run db:push
```

This will create the new `messages` table and update the `conversations` table.

## Platform-Specific Notes

### Facebook/Instagram
- Uses Meta Graph API
- Requires `pages_messaging` permission
- Messages come from Facebook Pages or Instagram Business accounts

### WhatsApp
- Supports Twilio WhatsApp API (recommended)
- Also supports Meta WhatsApp Business API
- Requires phone number verification

### TikTok
- Uses TikTok Messaging API
- Requires TikTok Business account

## Troubleshooting

### Messages Not Syncing
- Check that channels are connected (`isConnected: true`)
- Verify access tokens are valid
- Check browser console for errors
- Try manual sync

### Messages Not Sending
- Verify channel is connected
- Check access token hasn't expired
- Review platform-specific API requirements
- Check message status in database

### Missing Conversations
- Ensure channels are connected
- Run manual sync
- Check platform API permissions

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Push notifications for new messages
- [ ] Message templates and quick replies
- [ ] AI-powered response suggestions
- [ ] Message search and filtering
- [ ] Bulk actions (mark all as read, archive, etc.)
- [ ] Message forwarding between platforms
- [ ] Rich media composer (images, videos, files)
- [ ] Voice messages support
- [ ] Message reactions and emojis

