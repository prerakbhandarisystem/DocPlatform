# Salesforce Integration Setup Guide

## 🔧 Quick Setup Steps

### 1. Create Salesforce Connected App

1. **Login to your Salesforce org**:
   ```
   https://toast72-dev-ed.develop.lightning.force.com/
   ```

2. **Navigate to Setup**:
   - Click the gear icon (⚙️) in top right
   - Select **Setup**

3. **Create Connected App**:
   - In Quick Find, search for "App Manager"
   - Click **Apps** → **App Manager**
   - Click **New Connected App**

4. **Fill in Basic Information**:
   ```
   Connected App Name: DocPlatform
   API Name: DocPlatform  
   Contact Email: your-email@example.com
   Description: Document platform with AI integration
   ```

5. **Enable OAuth Settings** ✅:
   ```
   Callback URL: http://localhost:3000/api/auth/salesforce/callback
   
   Selected OAuth Scopes:
   ✅ Access and manage your data (api)
   ✅ Perform requests on your behalf at any time (refresh_token, offline_access)
   ```

6. **Save and Get Credentials**:
   - Click **Save**
   - Wait 2-10 minutes for propagation
   - Click **Manage Consumer Details**
   - Copy the **Consumer Key** (this is your Client ID)

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# backend/.env

# Salesforce Configuration
SALESFORCE_CLIENT_ID=3MVG9_your_consumer_key_here
SALESFORCE_REDIRECT_URI=http://localhost:3000/api/auth/salesforce/callback
SALESFORCE_DOMAIN=test

# Required Backend Settings
SECRET_KEY=your-secret-key-change-in-production
DATABASE_URL=sqlite:///./storage/docplatform.db
```

### 3. Test the Configuration

1. **Restart your backend server**:
   ```bash
   cd backend
   python start_server.py
   ```

2. **Test the status endpoint**:
   ```bash
   curl http://localhost:8000/api/v1/salesforce/status
   ```

   Should return:
   ```json
   {
     "success": true,
     "connected": false,
     "instance_url": null,
     "has_credentials": true,
     "oauth_configured": true
   }
   ```

3. **Test OAuth flow**:
   - Click "Connect Salesforce" in your frontend
   - Should redirect to Salesforce login
   - After login, should redirect back to your app

## 🔍 Troubleshooting

### Common Issues:

1. **"Invalid client_id"**:
   - Check your `SALESFORCE_CLIENT_ID` matches the Consumer Key exactly
   - Ensure the Connected App is published (wait 2-10 minutes)

2. **"redirect_uri_mismatch"**:
   - Verify Callback URL in Connected App matches exactly:
     `http://localhost:3000/api/auth/salesforce/callback`

3. **"invalid_grant"**:
   - The Connected App might not be approved yet
   - Try refreshing/waiting a few minutes

4. **Environment variables not loading**:
   - Ensure `.env` file is in `backend/` directory
   - Restart the backend server after creating `.env`

### URL Patterns:

- **Development**: Use `test` domain → `https://test.salesforce.com`
- **Production**: Use `login` domain → `https://login.salesforce.com`
- **Sandbox**: Use your sandbox domain → `https://yourorg--sandbox.my.salesforce.com`

## 🚀 Next Steps

Once configured, you can:
1. Connect to Salesforce from the navigation menu
2. Browse Salesforce objects and fields
3. Insert merge fields like `{!Account.Name}` into documents
4. Use the merge fields panel while editing documents

## 🔐 Security Notes

- Never commit your `.env` file to version control
- Use different credentials for production
- Consider IP restrictions for production Connected Apps
- Rotate credentials regularly 