import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/lib/gmail-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, query, limit = 20 } = body;

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, query' },
        { status: 400 }
      );
    }

    // Check if Gmail is authenticated
    const isAuthenticated = await gmailService.isAuthenticated(userId);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Gmail not authenticated. Please connect your Gmail account first.', setupRequired: true },
        { status: 401 }
      );
    }

    // Search emails via Gmail API
    const emails = await gmailService.searchEmails(userId, query, limit);

    return NextResponse.json({
      success: true,
      emails,
      query,
      count: emails.length
    });

  } catch (error) {
    console.error('Gmail search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search emails' },
      { status: 500 }
    );
  }
}
