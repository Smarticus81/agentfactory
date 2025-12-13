import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { gmailService } from '@/lib/gmail-service';

export async function GET(request: NextRequest) {
  // Authenticate user with Clerk
  const { userId: authenticatedUserId } = await auth();

  if (!authenticatedUserId) {
    return NextResponse.json(
      { error: 'Unauthorized - You must be logged in' },
      { status: 401 }
    );
  }

  try {
    // Use authenticated user ID instead of trusting client
    const userId = authenticatedUserId;

    // Check authentication status
    const isAuthenticated = await gmailService.authenticateUser(userId);
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
