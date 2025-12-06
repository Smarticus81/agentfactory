import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/lib/gmail-service';

// Bypass Clerk auth for this route
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const maxResultsParam = searchParams.get('maxResults');
    const limit = limitParam ? parseInt(limitParam) : (maxResultsParam ? parseInt(maxResultsParam) : 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Fetch recent emails via Gmail service (handles auth/refresh internally)
    const emails = await gmailService.getRecentEmails(userId, limit);

    // If no emails returned, check if it's due to authentication
    if (emails.length === 0) {
      // Check if user has Gmail connection directly via service
      const isAuthenticated = await gmailService.authenticateUser(userId);
      
      if (!isAuthenticated) {
        return NextResponse.json({
          success: false,
          error: 'Gmail not connected. Please connect your Gmail account first.',
          setupRequired: true,
          emails: []
        }, { status: 401 });
      }
    }

    return NextResponse.json({
      success: true,
      emails,
    });

  } catch (error) {
    console.error('Gmail check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check Gmail' },
      { status: 500 }
    );
  }
}


