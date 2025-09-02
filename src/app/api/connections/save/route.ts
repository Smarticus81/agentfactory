import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service, tokens, userEmail, userName } = await request.json();

    if (!service || !tokens) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For now, we'll store this in a simple way
    // In production, you'd integrate with your database
    const connectionData = {
      userId,
      service,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresAt: tokens.expires_at || Date.now() + 3600000,
      userEmail: userEmail || '',
      userName: userName || '',
      connectedAt: Date.now()
    };

    // TODO: Store in Convex database
    console.log('Connection saved:', { userId, service, userEmail });

    return NextResponse.json({ 
      success: true, 
      message: `${service} connected successfully for ${userEmail}` 
    });
  } catch (error) {
    console.error('Connection save error:', error);
    return NextResponse.json({ 
      error: 'Failed to save connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
