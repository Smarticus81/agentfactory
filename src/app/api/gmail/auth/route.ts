import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000'}/api/gmail/callback`
);

export async function GET(request: NextRequest) {
  // Handle test endpoint
  if (request.nextUrl.searchParams.get('test') === 'true') {
    return NextResponse.json({
      status: 'Gmail Auth API is working',
      environment: {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GMAIL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_ORIGIN}/api/gmail/callback`,
        appOrigin: process.env.NEXT_PUBLIC_APP_ORIGIN
      },
      oauth2Client: {
        redirectUri: oauth2Client.redirectUri
      }
    });
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user'; // Fallback for now

    console.log('Generating Gmail auth URL for userId:', userId);
    console.log('Redirect URI being used:', oauth2Client.redirectUri);

    // Generate auth URL with necessary scopes for email reading and sending
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass user ID in state for callback
      prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log('Generated auth URL:', authUrl);
    return NextResponse.json({
      authUrl,
      redirectUri: oauth2Client.redirectUri,
      clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...' // Partial for security
    });
  } catch (error) {
    console.error('Gmail auth error:', error);
    return NextResponse.json({
      error: 'Failed to generate auth URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
