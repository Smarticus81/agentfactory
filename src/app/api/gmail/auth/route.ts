import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables first
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials');
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.',
        setupRequired: true
      }, { status: 500 });
    }

    // Log credential status (without exposing secrets)
    console.log('✅ Google OAuth credentials found:', {
      clientIdPrefix: clientId.substring(0, 20) + '...',
      clientSecretLength: clientSecret.length,
      clientSecretPrefix: clientSecret.substring(0, 10) + '...'
    });

    // Dynamically determine the origin from the request headers
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/gmail/callback`;

    console.log(`Using dynamic redirect URI: ${redirectUri}`);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('Generating Gmail auth URL for userId:', userId);

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent'
    });

    console.log('Generated auth URL:', authUrl);
    return NextResponse.json({
      authUrl,
      redirectUri,
    });
  } catch (error) {
    console.error('Gmail auth error:', error);
    return NextResponse.json({
      error: 'Failed to generate auth URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
