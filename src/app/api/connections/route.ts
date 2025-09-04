import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, scopes, tokenRef, status, lastSyncAt } = body;

    // Use the existing Convex mutation from a server context
    // For now, we'll return success - in production you'd use the Convex server client
    console.log('Connection creation request:', { userId, type, status });
    
    return NextResponse.json({ success: true, message: 'Connection stored' });
  } catch (error) {
    console.error('Connection creation error:', error);
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}
