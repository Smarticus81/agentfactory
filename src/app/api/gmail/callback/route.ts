import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_ORIGIN}/api/gmail/callback`
);

// Create Convex client for server-side operations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    console.log('Gmail callback received');
    console.log('Full URL:', request.url);
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should contain the userId
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    console.log('Callback params:', {
      code: !!code,
      state,
      error,
      error_description,
      allParams: Object.fromEntries(searchParams.entries())
    });

    if (error) {
      console.error('OAuth error:', error);
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_ORIGIN}/dashboard/integrations?error=${encodeURIComponent(error)}`;
      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      console.error('Missing authorization code');
      const errorMsg = error || 'access_denied';
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_ORIGIN}/dashboard/integrations?error=${encodeURIComponent(errorMsg)}`;
      return NextResponse.redirect(redirectUrl);
    }

    // Authenticate user with Clerk
    const { userId: authenticatedUserId } = await auth();

    if (!authenticatedUserId) {
      console.error('Unauthorized callback attempt - no authenticated user');
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_ORIGIN}/dashboard/integrations?error=${encodeURIComponent('Unauthorized - Please log in')}`;
      return NextResponse.redirect(redirectUrl);
    }

    // Validate that the state parameter matches the authenticated user
    if (!state || state !== authenticatedUserId) {
      console.error('User ID mismatch:', { state, authenticatedUserId });
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_ORIGIN}/dashboard/integrations?error=${encodeURIComponent('Invalid authentication state')}`;
      return NextResponse.redirect(redirectUrl);
    }

    const userId = authenticatedUserId;
    console.log('Using userId:', userId);

    console.log('Exchanging code for tokens...');
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('Getting user info...');
    // Get user info to verify the email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;

    console.log('User email:', userEmail);

    if (!userEmail) {
      throw new Error('Could not retrieve user email from Google');
    }

    console.log('Storing tokens in Convex...');
    // Store tokens in Convex database
    await convex.mutation(api.connections.saveGmailTokens, {
      userId: userId,
      email: userEmail,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      tokenType: tokens.token_type || 'Bearer',
      expiryDate: tokens.expiry_date || Date.now() + 3600000, // 1 hour default
    });

    console.log('Redirecting to success page...');
    // Redirect to success page
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_ORIGIN}/dashboard/integrations?gmail_connected=true&email=${encodeURIComponent(userEmail)}`;
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Gmail callback error:', error);
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_ORIGIN}/dashboard/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : 'Authentication failed')}`;
    return NextResponse.redirect(redirectUrl);
  }
}
