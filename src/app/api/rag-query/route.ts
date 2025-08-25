import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function POST(request: NextRequest) {
  try {
    const { query, agentId, userId, instructions, agentName } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('RAG Query API - Processing:', { query, agentId, userId, agentName });

    // Create embedding for the query
    let queryEmbedding = null;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      queryEmbedding = embeddingResponse.data[0].embedding;
    } catch (error) {
      console.error('Error creating query embedding:', error);
    }

    // Find relevant documents if we have agent context
    let relevantContext = '';
    let hasContext = false;
    
    if (agentId && userId && queryEmbedding) {
      try {
        // Search documents using Convex
        const relevantDocuments = await convex.query(api.documents.searchDocuments, {
          userId,
          agentId,
          queryEmbedding,
          limit: 3
        });
        
        // Filter for relevant documents with a slightly lower threshold to improve recall
        let topDocuments = relevantDocuments.filter(doc => doc.similarity >= 0.5);
        // If nothing passes the threshold, take the top 1 as a fallback
        if (topDocuments.length === 0 && relevantDocuments.length > 0) {
          topDocuments = [relevantDocuments[0]];
        }
        
        if (topDocuments.length > 0) {
          relevantContext = topDocuments
            .map(doc => `Document: ${doc.originalName}\nContent: ${doc.textContent.substring(0, 1500)}${doc.textContent.length > 1500 ? '...' : ''}`)
            .join('\n\n---\n\n');
          
          hasContext = true;
          
          console.log(`Found ${topDocuments.length} relevant documents with similarities:`, 
            topDocuments.map(d => ({ file: d.originalName, similarity: d.similarity.toFixed(3) })));
        }
      } catch (error) {
        console.error('Error searching documents:', error);
      }
    }

    // Create system message with instructions and context
    let systemMessage = instructions 
      ? `You are ${agentName || 'a helpful assistant'}. ${instructions}`
      : `You are ${agentName || 'a helpful assistant'}. Be helpful, concise, and friendly.`;

    let sources: string[] = [];
    if (relevantContext) {
      // Build a list of sources from the context block
      try {
        const lines = relevantContext.split('\n').filter(l => l.startsWith('Document: '));
        sources = lines.map(l => l.replace('Document: ', '').trim());
      } catch {}
      systemMessage += `\n\nYou have access to the following relevant documents that may help answer the user's question:\n\n${relevantContext}\n\nWhen you use information from these documents, include a short citation and end your answer with a 'Sources:' list of the document names you used.`;
    }

    // Get response from OpenAI with RAG context
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 300, // Slightly longer for RAG responses
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';

    console.log('RAG Query API - Generated response with context:', {
      hasContext,
      responseLength: response.length
    });

    return NextResponse.json({
      response,
      hasContext,
      sources,
      usage: completion.usage
    });

  } catch (error) {
    console.error('RAG Query API error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to process RAG query',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
