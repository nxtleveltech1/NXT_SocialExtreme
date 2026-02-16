# Meta App Setup - Step-by-Step Guide

Follow these exact steps to create your Meta App and get the credentials.

## Step 1: Go to Meta for Developers
1. Open your browser
2. Go to: **https://developers.facebook.com/**
3. Click **"Log In"** in the top right
4. Enter your email: `gambew@gmail.com`
5. Enter your password: `P@33w0rd-1`
6. Click **"Log In"**

## Step 2: Create a New App
1. Once logged in, click **"My Apps"** in the top right
2. Click the **"Create App"** button (green button)
3. Select **"Business"** as the app type
4. Click **"Next"**

## Step 3: Fill in App Details
1. **App Name**: Enter `MobileMate` (or any name you want)
2. **App Contact Email**: Enter `gambew@gmail.com`
3. Click **"Create App"**
4. Complete any security check (captcha) if prompted

## Step 4: Add Instagram Product
1. In the app dashboard, look for **"Add Products to Your App"** section
2. Find **"Instagram"** in the list
3. Click **"Set Up"** button next to Instagram
4. You'll see "Instagram Graph API" - that's fine, click through

## Step 5: Add Facebook Login Product
1. Still in the dashboard, find **"Facebook Login"** in the products list
2. Click **"Set Up"** button next to Facebook Login
3. Select **"Web"** as the platform
4. Click **"Next"**

## Step 6: Configure Facebook Login Settings
1. In the left sidebar, click **"Settings"** → **"Basic"**
2. Scroll down to **"App Domains"**
3. Add: `localhost` (for local development)
4. Click **"Add Platform"** → Select **"Website"**
5. In **"Site URL"**, enter: `http://localhost:3000`
6. Click **"Save Changes"**

## Step 7: Set Up Redirect URI
1. In the left sidebar, click **"Products"** → **"Facebook Login"** → **"Settings"**
2. Scroll to **"Valid OAuth Redirect URIs"**
3. Click **"Add URI"**
4. Enter: `http://localhost:3000/api/oauth/meta/callback`
5. Click **"Save Changes"**

## Step 8: Get Your App Credentials
1. Go back to **"Settings"** → **"Basic"** in the left sidebar
2. Find **"App ID"** - copy this value (it's a long number)
3. Find **"App Secret"** - click **"Show"** next to it
4. Copy the App Secret (it's a long string of letters and numbers)

## Step 9: Add to Your .env.local File
1. Open your `.env.local` file in the `my-app` folder
2. Find these lines (or add them if they don't exist):
   ```
   META_APP_ID=""
   META_APP_SECRET=""
   META_REDIRECT_URI="http://localhost:3000/api/oauth/meta/callback"
   ```
3. Replace the empty values:
   - Paste your **App ID** between the quotes for `META_APP_ID`
   - Paste your **App Secret** between the quotes for `META_APP_SECRET`
   - The `META_REDIRECT_URI` should already be correct
4. Save the file

## Step 10: Restart Your Development Server
1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev` or `bun dev`
3. This loads the new environment variables

## Step 11: Test the Connection
1. Go to your app: `http://localhost:3000/channels`
2. Click **"Connect"** on a Facebook or Instagram channel
3. Click **"Login with Facebook"** or **"Login with Instagram"**
4. You should be redirected to Facebook's login page
5. Enter your Facebook/Instagram credentials
6. Authorize the app
7. You'll be redirected back - done!

## Troubleshooting

**"Invalid App ID"**
- Make sure you copied the App ID correctly (no extra spaces)
- Make sure you saved the `.env.local` file
- Restart your dev server after changing `.env.local`

**"Redirect URI mismatch"**
- Make sure the redirect URI in `.env.local` matches exactly what you added in Meta settings
- Check for `http://` vs `https://` differences
- Make sure there are no trailing slashes

**"App not available"**
- Make sure you added both Instagram and Facebook Login products
- Make sure you're logged into Facebook with the account that created the app

**Can't find "Add Products"**
- Look in the left sidebar for "Products" menu
- Or go to Settings → Basic and scroll down

## Your Credentials Location

After completing these steps, your credentials will be in:
- **File**: `my-app/.env.local`
- **Variables**: 
  - `META_APP_ID` = Your App ID
  - `META_APP_SECRET` = Your App Secret
  - `META_REDIRECT_URI` = `http://localhost:3000/api/oauth/meta/callback`

## Security Note

⚠️ **Never commit your `.env.local` file to git!** It contains your App Secret which should be kept private.

## Need Help?

If you get stuck at any step:
1. Take a screenshot of where you are
2. Check the browser console for errors (F12)
3. Make sure all environment variables are saved correctly
4. Restart your dev server after making changes



