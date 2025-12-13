import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Delete the Gmail connection from Convex
    await convex.mutation(api.connections.deleteConnection, {
      userId,
      service: 'gmail'
    });

    return NextResponse.json({
      success: true,
      message: 'Gmail disconnected successfully'
    });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect Gmail' },
      { status: 500 }
    );
  }
}

