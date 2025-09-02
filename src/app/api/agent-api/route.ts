import { NextRequest } from "next/server";
import { convexServer } from '@/lib/convex-server';
import { api } from '../../../../convex/_generated/api';

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { agentId, deploymentId, message, type } = data;

    if (!agentId || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Try to get agent configuration from Convex or localStorage
    let agentConfig = null;
    let relevantKnowledge = '';
    let knowledgeResults: any[] = [];
    
    try {
      // Import convexApi dynamically to avoid edge runtime issues
      const { convexApi } = await import('@/lib/convex-api');
      const agents = await convexApi.getUserAgents('any'); // We'll filter by agentId
      agentConfig = agents.find((a: any) => a._id === agentId);

      // Query knowledge base for relevant information
      try {
        knowledgeResults = await convexServer.query(api.knowledge.queryKnowledge, {
          userId: (agentConfig as any)?.ownerId || 'unknown',
          query: message,
          sourceTypes: ['document'],
          limit: 3,
        });

        if (knowledgeResults && knowledgeResults.length > 0) {
          relevantKnowledge = knowledgeResults
            .map((item: any) => `${item.title}:\n${item.content.substring(0, 500)}...`)
            .join('\n\n');
        }
      } catch (knowledgeError) {
        console.log('Could not query knowledge base:', knowledgeError);
      }
    } catch (error) {
      console.log('Could not fetch agent config from Convex, using default');
    }

    // If no agent config found, use default configuration
    if (!agentConfig) {
      agentConfig = {
        name: 'Voice Agent',
        customInstructions: 'You are a helpful AI assistant for families and personal organization. Respond concisely and naturally as if speaking to someone. Keep responses under 100 words.',
        context: 'Family organization and personal assistance',
        voiceConfig: { voice: 'alloy' }
      };
    }

    // Build system message with knowledge context
    let systemMessage = `You are ${agentConfig.name}, an AI assistant for families and personal organization. ${agentConfig.customInstructions || 'Respond concisely and naturally as if speaking to someone. Keep responses under 100 words.'}`;

    if (relevantKnowledge) {
      systemMessage += `\n\nRelevant information from uploaded documents:\n${relevantKnowledge}\n\nUse this information to provide more accurate and personalized responses when relevant to the user's question.`;
    }

    // Use the best model (gpt-4o) for voice interactions
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const responseText = result.choices[0]?.message?.content || "I'm sorry, I didn't understand that.";

    return Response.json({
      response: responseText,
      agentId,
      deploymentId,
      timestamp: new Date().toISOString(),
      model: "gpt-4o",
      usage: result.usage,
      hasKnowledge: !!relevantKnowledge,
      knowledgeUsed: relevantKnowledge ? knowledgeResults.length : 0
    });
  } catch (error) {
    console.error("Error processing agent request:", error);
    return Response.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    // Forward audio to OpenAI
    const response = await fetch(`https://api.openai.com/v1/realtime/sessions/${data.realtimeSessionId}/audio`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "audio/wav",
      },
      body: data.audio,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    return Response.json(result);
  } catch (error) {
    console.error("Error processing audio:", error);
    return Response.json({ error: "Failed to process audio" }, { status: 500 });
  }
}
