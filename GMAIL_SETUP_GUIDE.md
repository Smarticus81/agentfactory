# Gmail Integration Setup Guide

## For Individual Users

### How Users Connect Their Gmail:

1. **Navigate to Integrations**
   - Go to `/dashboard/integrations`
   - Find the Gmail card in the Communication section

2. **Click "Connect"**
   - Click the "Connect" button on the Gmail integration card
   - You'll be redirected to Google's OAuth consent screen

3. **Authorize Access**
   - Google will ask for permission to:
     - Send emails on your behalf
     - Read your emails
     - Manage your email
   - Click "Allow" to grant permissions

4. **Return to Platform**
   - You'll be redirected back to the integrations page
   - Gmail card will show "Connected" status
   - Success message will display your connected email

### Voice Commands Available After Connection:

- **Send Email**: "Send email to john@example.com about the meeting"
- **Read Emails**: "Read my latest emails"
- **Search Emails**: "Search for emails from Sarah last week"
- **Manage Emails**: "Mark all emails from boss as important"

### Security & Privacy:

- **Secure Storage**: Your OAuth tokens are encrypted and stored securely
- **No Password Storage**: We never see or store your Gmail password
- **Revocable Access**: You can disconnect anytime from your Google account settings
- **Scoped Permissions**: We only request the minimum permissions needed

### Troubleshooting:

**"Access Denied" Error:**
- Make sure you clicked "Allow" on Google's consent screen
- Check if your Google account has 2FA enabled (this is supported)

**"Connection Failed" Error:**
- Try refreshing the page and clicking "Connect" again
- Check your internet connection
- Make sure you're signed into the correct Google account

**"Invalid Request" Error:**
- This usually means the OAuth state was corrupted
- Clear your browser cache and try again

### Technical Details:

**OAuth 2.0 Flow:**
1. Platform generates secure authorization URL
2. User redirects to Google's consent screen
3. Google redirects back with authorization code
4. Platform exchanges code for access/refresh tokens
5. Tokens stored encrypted in database linked to user account

**Permissions Requested:**
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.modify` - Manage emails

**Token Management:**
- Access tokens expire after 1 hour
- Refresh tokens used to get new access tokens automatically
- All tokens encrypted at rest
- Associated with user's unique ID

### For Developers:

**Environment Variables Needed:**
```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

**API Endpoints:**
- `GET /api/integrations/gmail/auth` - Start OAuth flow
- `GET /api/integrations/gmail/callback` - Handle OAuth callback
- `POST /api/integrations/gmail/send` - Send email via user's Gmail
- `POST /api/connections/save` - Store OAuth tokens

**Database Schema:**
- `connections` table stores OAuth tokens per user
- `emails` table tracks sent/received emails
- Proper indexing for performance

This flow ensures each user connects their own Gmail account securely without any shared credentials or admin setup required.
