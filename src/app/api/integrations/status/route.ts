import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get Gmail connection status
    const gmailTokens = await convex.query(api.connections.getGmailTokens, {
      userId: userId
    });

    // Get documents for this agent
    const documents = await convex.query(api.knowledgeItems.getByAgent, {
      agentId: agentId || '',
      userId: userId
    });

    // Calculate document stats
    const totalSize = documents.reduce((sum, doc) => sum + (doc.metadata?.size || 0), 0);
    const readyCount = documents.filter(doc => doc.hasEmbeddings).length;
    const processingCount = documents.filter(doc => !doc.hasEmbeddings && doc.status !== 'error').length;

    const integrationStatus = {
      gmail: {
        connected: !!gmailTokens,
        email: gmailTokens?.email,
        lastSync: gmailTokens ? new Date().toISOString() : undefined, // You might want to track this separately
        error: undefined
      },
      documents: {
        count: documents.length,
        processing: processingCount,
        ready: readyCount,
        totalSize: totalSize
      }
    };

    return NextResponse.json(integrationStatus);
  } catch (error) {
    console.error('Error fetching integration status:', error);
    return NextResponse.json({
      error: 'Failed to fetch integration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
