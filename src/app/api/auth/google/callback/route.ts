import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../../convex/_generated/api';
import { GmailService } from '../../../../../lib/gmail-service';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=${error}`);
    }

    if (!code) {
      return NextResponse.json({ error: 'Authorization code not provided' }, { status: 400 });
    }

    // Parse state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(state || '{}');
      userId = stateData.userId;
    } catch {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID not provided in state' }, { status: 400 });
    }

    // Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Generate a unique token reference
    const tokenRef = `gmail_${userId}_${Date.now()}`;

    // Store tokens using the Gmail service
    GmailService.storeTokens(tokenRef, tokens);

    // Create or update the Gmail connection in Convex
    await convex.mutation(api.connections.createConnection, {
      userId,
      type: 'gmail',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
      tokenRef,
      status: 'active',
      lastSyncAt: new Date().toISOString(),
    });

    // Redirect back to dashboard with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?gmail_connected=true`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=gmail_oauth_failed`);
  }
}
