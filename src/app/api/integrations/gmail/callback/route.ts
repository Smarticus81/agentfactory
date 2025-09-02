import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@clerk/nextjs';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/gmail/callback`
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/integrations?error=oauth_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/integrations?error=invalid_request`);
    }

    // Verify user is authenticated
    const { userId } = auth();
    if (!userId || userId !== state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/integrations?error=unauthorized`);
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Get user's email address for identification
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    // Store tokens in database via our API
    const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/connections/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        service: 'gmail',
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date
        },
        userEmail: userInfo.data.email,
        userName: userInfo.data.name
      })
    });

    if (!saveResponse.ok) {
      console.error('Failed to save connection');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/integrations?error=save_failed&message=Failed to save Gmail connection`);
    }
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/integrations?success=gmail_connected&email=${encodeURIComponent(userInfo.data.email || 'unknown')}`);
  } catch (error) {
    console.error('Gmail callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/integrations?error=callback_failed&message=Failed to complete Gmail connection`);
  }
}
