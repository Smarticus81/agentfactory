import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/lib/gmail-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get recent emails from Gmail API - this will handle its own authentication
    const emails = await gmailService.getRecentEmails(userId, limit);

    return NextResponse.json({
      success: true,
      emails,
    });

  } catch (error) {
    console.error('Gmail fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
