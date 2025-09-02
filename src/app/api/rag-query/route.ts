import { NextRequest, NextResponse } from 'next/server';
import { convex } from '@/lib/convex';
import { api } from '../../../../convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, agentId, userId } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Query the knowledge base
    const results = await convex.query(api.knowledge.queryKnowledge, {
      userId,
      query,
      sourceTypes: ['document'],
      limit: 5,
    });

    // Format results for frontend
    const formattedResults = results.map((item: any) => ({
      id: item._id,
      title: item.title,
      content: item.content,
      relevanceScore: 1.0, // Placeholder - would be calculated in real implementation
      source: item.uri,
      metadata: item.metadata,
    }));

    return NextResponse.json({
      success: true,
      results: formattedResults,
      totalResults: results.length,
      query,
    });

  } catch (error) {
    console.error('Error processing RAG query:', error);
    return NextResponse.json(
      { error: 'Failed to process RAG query' },
      { status: 500 }
    );
  }
}
