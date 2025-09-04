import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/lib/gmail-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check authentication status
    const isAuthenticated = await gmailService.isAuthenticated(userId);
    const userEmail = isAuthenticated ? await gmailService.getUserEmail(userId) : null;

    return NextResponse.json({
      authenticated: isAuthenticated,
      email: userEmail,
      setupRequired: !isAuthenticated
    });

  } catch (error) {
    console.error('Gmail status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check Gmail status' },
      { status: 500 }
    );
  }
}
