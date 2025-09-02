import { NextRequest, NextResponse } from 'next/server';
import { convex } from '@/lib/convex';
import { api } from '../../../../../convex/_generated/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('query');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const sourceTypes = searchParams.get('sourceTypes')?.split(',');

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'userId and query are required' },
        { status: 400 }
      );
    }

    // Search the knowledge base
    const results = await convex.query(api.knowledge.queryKnowledge, {
      userId,
      query,
      sourceTypes: sourceTypes as any,
      limit,
    });

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });

  } catch (error) {
    console.error('Knowledge search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search knowledge base' },
      { status: 500 }
    );
  }
}
