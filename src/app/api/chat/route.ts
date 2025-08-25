import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, instructions, agentName, agentId, userId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('Chat API - Processing message:', { message, agentName, hasInstructions: !!instructions, agentId, userId });

    // Try to use RAG if agentId and userId are provided
    if (agentId && userId) {
      try {
        console.log('Chat API - Attempting RAG query');
        const ragResponse = await fetch(`${request.nextUrl.origin}/api/rag-query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: message,
            agentId,
            userId,
            instructions,
            agentName
          })
        });

        if (ragResponse.ok) {
          const ragData = await ragResponse.json();
          console.log('Chat API - RAG response received:', { hasContext: ragData.hasContext });
          return NextResponse.json({
            response: ragData.response,
            hasContext: ragData.hasContext,
            usage: ragData.usage,
            source: 'rag'
          });
        } else {
          console.log('Chat API - RAG failed, falling back to standard chat');
        }
      } catch (error) {
        console.error('Chat API - RAG error, falling back to standard chat:', error);
      }
    }

    // Fallback to standard chat completion
    console.log('Chat API - Using standard chat completion');
    
    // Create system message with instructions and agent name
    const systemMessage = instructions 
      ? `You are ${agentName || 'a helpful assistant'}. ${instructions}`
      : `You are ${agentName || 'a helpful assistant'}. Be helpful, concise, and friendly.`;

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 150, // Keep responses concise for voice
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';

    console.log('Chat API - Generated standard response');

    return NextResponse.json({ 
      response,
      hasContext: false,
      usage: completion.usage,
      source: 'standard'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
