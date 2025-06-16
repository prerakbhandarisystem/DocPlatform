# Google OAuth Setup Guide

Follow these steps to set up Google OAuth for DocPlatform authentication.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown and select "New Project"
3. Enter project name: `DocPlatform` (or your preferred name)
4. Click "Create"

## 2. Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have Google Workspace)
3. Fill in the required fields:
   - **App name**: DocPlatform
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes (optional for testing):
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
5. Add test users (your email address)
6. Save and continue

## 4. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Set the name: `DocPlatform Web Client`
5. Add authorized origins:
   - `http://localhost:3000`
   - `http://localhost:8000`
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
7. Click "Create"

## 5. Copy Your Credentials

After creating the OAuth client, you'll see a dialog with:
- **Client ID**: Copy this value
- **Client Secret**: Copy this value

## 6. Update Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_google_client_id_here
```

## 7. Start the Application

Run the development setup:

```bash
./scripts/dev-setup.sh
```

## 8. Test the Authentication

1. Open your browser to `http://localhost:3000`
2. You should be redirected to the login page
3. Click "Sign in with Google"
4. Complete the Google OAuth flow
5. You should be redirected to the dashboard

## Important Notes

- The same `GOOGLE_CLIENT_ID` is used for both backend verification and frontend display
- Keep your `GOOGLE_CLIENT_SECRET` secure and never expose it in frontend code
- For production, update the authorized origins and redirect URIs to match your domain
- The OAuth consent screen may show a warning for unverified apps during development

## Troubleshooting

**Error: "Authorization error"**
- Check that your client ID and secret are correct
- Verify the redirect URI matches exactly (including http/https)

**Error: "This app isn't verified"**
- This is normal for development
- Click "Advanced" > "Go to DocPlatform (unsafe)"

**Error: "Invalid client"**
- Double-check your Google Client ID in both backend and frontend configs 