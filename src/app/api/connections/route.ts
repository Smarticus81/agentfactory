import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, scopes, tokenRef, status, lastSyncAt } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type' },
        { status: 400 }
      );
    }

    // Create or update the connection using Convex mutation
    const result = await convex.mutation(api.connections.createConnection, {
      userId,
      type,
      scopes: scopes || [],
      tokenRef: tokenRef || '',
      status: status || 'active',
      lastSyncAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Connection created/updated successfully',
      connectionId: result.connectionId
    });
  } catch (error) {
    console.error('Connection creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create connection' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get connections using Convex query
    const connections = await convex.query(api.connections.getConnections, {
      userId,
      type: type as any,
    });

    return NextResponse.json({
      success: true,
      connections,
    });
  } catch (error) {
    console.error('Connection retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve connections' },
      { status: 500 }
    );
  }
}
