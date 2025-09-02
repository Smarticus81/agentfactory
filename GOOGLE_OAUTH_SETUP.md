# Google OAuth Setup Guide

## Step 1: Google Cloud Console Configuration

### Create/Configure OAuth Client

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Gmail API**
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

3. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type (for testing)
   - Fill required fields:
     - App name: "Smarticus Voice Assistant"
     - User support email: your-email@domain.com
     - Developer contact: your-email@domain.com
   - **Add Test Users** (IMPORTANT for development):
     - Add your Gmail address and any other test emails
     - Only test users can use the app during development

4. **Create OAuth Client ID**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Smarticus Gmail Integration"
   - **Authorized redirect URIs**:
     - For development: `http://localhost:3000/api/integrations/gmail/callback`
     - For production: `https://yourdomain.com/api/integrations/gmail/callback`

5. **Download Credentials**
   - Copy the Client ID and Client Secret
   - Add to your .env.local file

## Step 2: Environment Variables

Create/update `.env.local`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-actual-client-id-here"
GOOGLE_CLIENT_SECRET="your-actual-client-secret-here"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# For production:
# NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
```

## Step 3: Development vs Production

### For Development (Testing):
- Use "External" user type with test users
- Add yourself as a test user
- App will work for test users only
- No verification needed for testing

### For Production:
- Submit app for Google verification
- Or use "Internal" if within organization
- Verification takes 1-2 weeks
- Required for public access

## Common Issues:

### "Authorization Error" / "invalid_request":
✅ **Solution**: Add your email as a test user in OAuth consent screen

### "Error 400: redirect_uri_mismatch":
✅ **Solution**: Ensure callback URL matches exactly in Google Console

### "Access blocked":
✅ **Solution**: 
1. Make sure Gmail API is enabled
2. Add test users in OAuth consent screen
3. Use correct client credentials

## Testing Flow:
1. Set up OAuth consent with test users
2. Add your Gmail as test user
3. Test the connection flow
4. Should work immediately for test users
