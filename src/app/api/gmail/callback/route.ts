import { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { gmailService } from '@/lib/gmail-service';

export async function GET(request: NextRequest) {
  try {
    console.log('Gmail callback received request:', request.url);
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state');

    if (!code || !userId) {
      console.error('Callback missing code or userId', {
        code: !!code,
        userId: !!userId,
      });
      throw new Error('Missing authorization code or user ID');
    }

    console.log('Callback has code and userId, proceeding...', { userId });

    // Validate credentials before attempting token exchange
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials in callback');
      throw new Error('Server configuration error: OAuth credentials not set');
    }

    // Log credential info for debugging (without exposing secrets)
    console.log('🔑 Using credentials:', {
      clientIdPrefix: clientId.substring(0, 20) + '...',
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
      clientSecretPrefix: clientSecret.substring(0, 10) + '...'
    });

    const redirectUri = `${origin}/api/gmail/callback`;
    console.log('Using redirectUri for token exchange:', redirectUri);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    console.log('Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Tokens received:', { has_refresh_token: !!tokens.refresh_token });

    console.log('Storing tokens for userId:', userId);
    await gmailService.storeTokens(userId, tokens);
    console.log('Tokens stored successfully.');

    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
        </head>
        <body>
          <p>Authentication successful! This window will now close.</p>
          <script>
            try {
              if (window.opener && window.opener !== window) {
                console.log('Sending messages to opener window');
                // Send both string and object formats for compatibility
                window.opener.postMessage('gmail_oauth_success', '*');
                window.opener.postMessage({ type: 'GMAIL_AUTH_SUCCESS' }, '*');
                console.log('Message sent.');
              } else {
                console.log('No opener window found to post message to.');
              }
            } catch (e) {
              console.error('Error sending message to opener:', e);
            } finally {
              console.log('Closing window.');
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    return new Response(successHtml, {
      headers: { 'Content-Type': 'text/html' },
      status: 200,
    });
  } catch (error) {
    console.error('Gmail callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Failed</title>
        </head>
        <body>
          <h1>Authentication Failed</h1>
          <p>An error occurred. Please check the server logs for details.</p>
          <p>Error: ${errorMessage}</p>
          <p>You can close this window.</p>
        </body>
      </html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
