# Meta App Quick Setup (5 Minutes)

**You DON'T need to be a developer!** Anyone with a Facebook account can create a Meta App. It's free and takes 5 minutes.

## Why You Need This

Meta (Facebook/Instagram) requires apps to be registered before you can connect accounts. This is their security requirement - there's no way around it. But it's **FREE** and **EASY**.

## Step-by-Step Setup

### 1. Go to Meta for Developers
Visit: https://developers.facebook.com/

### 2. Create an App (2 minutes)
- Click **"My Apps"** → **"Create App"**
- Select **"Business"** as the app type
- Enter any app name (e.g., "MobileMate" or "My Social Media Manager")
- Enter your email (can be any email)
- Click **"Create App"**

### 3. Add Instagram Product (1 minute)
- In your app dashboard, find **"Add Product"** or the **"Products"** menu
- Click **"Add Product"** next to **"Instagram"**
- Click **"Set Up"** on Instagram Basic Display or Instagram Graph API

### 4. Add Facebook Login Product (1 minute)
- Still in Products, click **"Add Product"** next to **"Facebook Login"**
- Click **"Set Up"**

### 5. Get Your App Credentials (1 minute)
- Go to **Settings** → **Basic** in the left sidebar
- Copy these values:
  - **App ID** → This is your `META_APP_ID`
  - **App Secret** → Click "Show" and copy → This is your `META_APP_SECRET`

### 6. Set Up Redirect URI
- Still in **Settings** → **Basic**
- Scroll to **"App Domains"** and add your domain (e.g., `localhost` for local dev)
- Click **"Add Platform"** → Select **"Website"**
- In **"Site URL"**, enter: `http://localhost:3000` (or your production URL)
- Go to **Products** → **Facebook Login** → **Settings**
- Add to **"Valid OAuth Redirect URIs"**:
  - `http://localhost:3000/api/oauth/meta/callback` (for local dev)
  - `https://yourdomain.com/api/oauth/meta/callback` (for production)

### 7. Add Environment Variables
Add these to your `.env.local` file:

```env
META_APP_ID="your_app_id_here"
META_APP_SECRET="your_app_secret_here"
META_REDIRECT_URI="http://localhost:3000/api/oauth/meta/callback"
```

### 8. Test Mode vs Live Mode
- **Test Mode** (default): Only you and test users can use the app. Perfect for development!
- **Live Mode**: Requires app review for public use. You can stay in Test Mode forever for personal use.

## That's It!

Now when you click "Login with Instagram" or "Login with Facebook" in MobileMate:
1. You'll be redirected to Facebook's login page
2. Enter your **normal Facebook/Instagram username and password**
3. Authorize the app
4. Done!

## Troubleshooting

**"Invalid App ID"**
- Make sure you copied the App ID correctly (no extra spaces)
- Make sure the app is in "Development" or "Live" mode

**"Redirect URI mismatch"**
- Make sure the redirect URI in `.env.local` matches exactly what you added in Meta's settings
- Check for `http://` vs `https://` differences
- Make sure there are no trailing slashes

**"App not available"**
- Make sure you added the Instagram and Facebook Login products
- Make sure you're logged into Facebook with the account that created the app

## Important Notes

- ✅ Creating a Meta App is **FREE**
- ✅ You can stay in **Test Mode** forever (no review needed for personal use)
- ✅ You use your **normal Facebook/Instagram login** - no special accounts needed
- ✅ The app is just a "permission request" - it doesn't change your Facebook/Instagram account
- ❌ You CANNOT bypass this - Meta requires it for security

## Need Help?

If you get stuck, check:
- Meta Developer Docs: https://developers.facebook.com/docs/
- Make sure all environment variables are set correctly
- Check browser console for errors



