# Meta OAuth Setup Guide

Complete these steps in the **Meta App Dashboard** to enable OAuth for MobileMate.

---

## Prerequisites

Your `.env.local` should have:
```env
META_APP_ID="1390254832540780"
META_APP_SECRET="d88b410ea769d58a07ab2c8e9ec207dc"
META_REDIRECT_URI="http://localhost:3000/api/oauth/meta/callback"
META_WEBHOOK_VERIFY_TOKEN="nxt_webhook_d0f09ef331e4491b"
```

---

## Step 1: Configure App Settings

1. Go to: https://developers.facebook.com/apps/1390254832540780/settings/basic/

2. **App Domains**: Add `localhost`

3. **Privacy Policy URL**: Add any valid URL (e.g., `https://nxtleveltech.co.za/privacy`)

4. **Terms of Service URL**: Add any valid URL (optional)

5. **Site URL**: Click "Add Platform" → Select "Website" → Enter `http://localhost:3000`

6. Click **Save Changes**

---

## Step 2: Configure Facebook Login

1. Go to: https://developers.facebook.com/apps/1390254832540780/products/

2. If "Facebook Login" is not added:
   - Click **Add Product**
   - Find **Facebook Login** → Click **Set Up**

3. Go to: **Facebook Login** → **Settings**

4. **Valid OAuth Redirect URIs**: Add exactly:
   ```
   http://localhost:3000/api/oauth/meta/callback
   ```

5. **Deauthorize Callback URL** (optional): 
   ```
   http://localhost:3000/api/webhooks/meta
   ```

6. Click **Save Changes**

---

## Step 3: Configure Instagram (for IG Business Accounts)

1. Go to Products and add **Instagram Graph API** if not present

2. The Instagram permissions are requested via the same OAuth flow when you connect an Instagram channel

---

## Step 4: App Mode

### For Development (Testing)
- Keep app in **Development Mode**
- Only admins/developers/testers can use OAuth
- Add your Facebook account as a tester in **App Roles** → **Roles**

### For Production
- Switch to **Live Mode** after testing
- Submit for App Review for public use

---

## Step 5: Verify Setup

### Test OAuth Flow:
1. Start dev server: `bun dev`
2. Go to: http://localhost:3000/channels
3. Click **Connect New SA Channel**
4. Select **Facebook** or **Instagram**
5. Enter a name and handle
6. Click **Create Channel**
7. Click **Finish Setup** on the new channel
8. Complete Facebook login
9. Select your Page/Account
10. Channel should show as "Connected"

### Common Errors:

| Error | Solution |
|-------|----------|
| "Invalid App ID" | Check META_APP_ID matches dashboard |
| "Redirect URI mismatch" | Add exact URI to Facebook Login settings |
| "App not set up" | Add Facebook Login product |
| "User not authorized" | Add yourself as tester in App Roles |
| "Missing permissions" | Request permissions in App Review |

---

## Webhooks (Optional - For Real-time Updates)

### For Local Development:
Use ngrok to expose localhost:
```bash
ngrok http 3000
```

Then configure in Meta App Dashboard:
- **Callback URL**: `https://your-ngrok-url.ngrok.io/api/webhooks/meta`
- **Verify Token**: `nxt_webhook_d0f09ef331e4491b`

### Subscribe to Events:
- **WhatsApp Business Account**: messages, messaging_postbacks
- **Instagram**: mentions, comments
- **Facebook Page**: feed, messages

---

## Permission Scopes Requested

The OAuth flow requests these scopes:
- `pages_show_list` - List user's Pages
- `pages_read_engagement` - Read Page engagement data
- `pages_manage_posts` - Create/edit Page posts
- `pages_manage_engagement` - Manage comments/likes
- `pages_manage_metadata` - Manage Page settings
- `instagram_basic` - Basic Instagram access
- `instagram_content_publish` - Publish to Instagram
- `instagram_manage_comments` - Manage Instagram comments
- `instagram_manage_insights` - Read Instagram insights

---

## Quick Links

- [Meta App Dashboard](https://developers.facebook.com/apps/1390254832540780)
- [Facebook Login Settings](https://developers.facebook.com/apps/1390254832540780/fb-login/settings/)
- [App Roles](https://developers.facebook.com/apps/1390254832540780/roles/roles/)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

