import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@clerk/nextjs';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/gmail/callback`
);

// Scopes for Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate OAuth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId, // Pass user ID for verification in callback
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Gmail auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
