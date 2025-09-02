import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { convex } from '@/lib/convex';
import { api } from '../../../../convex/_generated/api';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// Define available tools for agents
const availableTools = [
  {
    type: "function" as const,
    function: {
      name: "search_documents",
      description: "Search through uploaded documents and knowledge base for relevant information",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant information"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_current_time",
      description: "Get the current date and time",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    const { message, instructions, agentName, agentId, userId, enableTools = true } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('Chat API - Processing message:', { message, agentName, hasInstructions: !!instructions, agentId, userId, enableTools });

    // Query RAG knowledge base if agentId and userId are provided
    let knowledgeContext = '';
    if (agentId && userId) {
      try {
        console.log('Chat API - Querying knowledge base');
        const knowledgeResults = await convex.query(api.knowledge.queryKnowledge, {
          userId,
          query: message,
          sourceTypes: ['document'],
          limit: 3,
        });

        if (knowledgeResults && knowledgeResults.length > 0) {
          knowledgeContext = knowledgeResults
            .map((item: any) => `Document: ${item.title}\nContent: ${item.content.substring(0, 500)}...`)
            .join('\n\n');
          console.log('Chat API - Found relevant knowledge:', knowledgeResults.length, 'items');
        }
      } catch (error) {
        console.error('Chat API - Knowledge query error:', error);
      }
    }

    // Create system message with instructions, knowledge context, and agent name
    let systemMessage = `You are ${agentName || 'a helpful assistant'}. ${instructions || 'Be helpful, concise, and friendly. Keep responses under 100 words for voice interactions.'}`;
    
    if (knowledgeContext) {
      systemMessage += `\n\nRelevant information from uploaded documents:\n${knowledgeContext}\n\nUse this information to provide more accurate and personalized responses when relevant to the user's question.`;
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: systemMessage
      },
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Get response from OpenAI with tools if enabled
    const requestParams: any = {
      model: 'gpt-4o-mini',  // Using latest GPT-4o-mini (gpt-4 is deprecated)
      messages,
      max_tokens: 200,
      temperature: 0.7,
    };

    // Add tools if enabled
    if (enableTools) {
      requestParams.tools = availableTools;
      requestParams.tool_choice = "auto";
    }

    const completion = await openai.chat.completions.create(requestParams);

    const responseMessage = completion.choices[0]?.message;
    
    // Handle tool calls
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      console.log('Chat API - Processing tool calls:', responseMessage.tool_calls.length);
      
      // Process each tool call
      const toolResults = [];
      for (const toolCall of responseMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        let toolResult = '';
        
        switch (toolName) {
          case 'search_documents':
            try {
              const searchResults = await convex.query(api.knowledge.queryKnowledge, {
                userId: userId || 'unknown',
                query: toolArgs.query,
                sourceTypes: ['document'],
                limit: 5,
              });
              
              if (searchResults && searchResults.length > 0) {
                toolResult = searchResults
                  .map((item: any) => `${item.title}: ${item.content.substring(0, 300)}...`)
                  .join('\n\n');
              } else {
                toolResult = 'No relevant documents found.';
              }
            } catch (error) {
              toolResult = 'Error searching documents.';
            }
            break;
            
          case 'get_current_time':
            toolResult = new Date().toLocaleString();
            break;
            
          default:
            toolResult = `Unknown tool: ${toolName}`;
        }
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: toolResult,
        });
      }
      
      // Get final response with tool results
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',  // Using latest GPT-4o-mini consistently
        messages: [
          ...messages,
          responseMessage,
          ...toolResults,
        ],
        max_tokens: 200,
        temperature: 0.7,
      });
      
      const finalResponse = finalCompletion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';
      
      console.log('Chat API - Generated response with tools');
      
      return NextResponse.json({ 
        response: finalResponse,
        hasContext: !!knowledgeContext,
        toolsUsed: responseMessage.tool_calls.map(tc => tc.function.name),
        usage: finalCompletion.usage,
        source: 'tools'
      });
    }
    
    // Regular response without tools
    const response = responseMessage?.content || 'I apologize, but I couldn\'t generate a response.';

    console.log('Chat API - Generated standard response');

    return NextResponse.json({ 
      response,
      hasContext: !!knowledgeContext,
      toolsUsed: [],
      usage: completion.usage,
      source: knowledgeContext ? 'rag' : 'standard'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    return NextResponse.json({ 
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
