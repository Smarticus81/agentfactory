import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

// Check if Convex is available
const isConvexAvailable = !!process.env.NEXT_PUBLIC_CONVEX_URL;

// Create Convex client for server-side queries
const convexClient = isConvexAvailable ? new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!) : null;

// Create a factory to build an OpenAI client with a resolved API key
function createOpenAIClient(possibleKey?: string) {
  const envKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  const apiKey = envKey || possibleKey;
  return new OpenAI({ apiKey });
}

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
  },
  {
    type: "function" as const,
    function: {
      name: "get_weather",
      description: "Get current weather information for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city or location to get weather for"
          }
        },
        required: ["location"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_local_events",
      description: "Search for local events, concerts, festivals, or activities in a specific area",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city or area to search for events"
          },
          date: {
            type: "string",
            description: "Optional date range (e.g., 'this weekend', 'next week', 'tomorrow')"
          },
          category: {
            type: "string",
            description: "Optional event category (e.g., 'music', 'sports', 'family', 'food')"
          }
        },
        required: ["location"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "create_reminder",
      description: "Create a reminder or task for the user",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The reminder title or task description"
          },
          date: {
            type: "string",
            description: "When the reminder should trigger (e.g., 'tomorrow at 3pm', 'next Monday')"
          },
          notes: {
            type: "string",
            description: "Optional additional notes for the reminder"
          }
        },
        required: ["title", "date"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_web",
      description: "Search the web for current information, news, or general knowledge",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query"
          },
          type: {
            type: "string",
            description: "Type of search (news, general, local)",
            enum: ["news", "general", "local"]
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "calculate",
      description: "Perform mathematical calculations or conversions",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The mathematical expression to calculate"
          }
        },
        required: ["expression"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_directions",
      description: "Get directions between two locations",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "Starting location"
          },
          to: {
            type: "string",
            description: "Destination location"
          },
          mode: {
            type: "string",
            description: "Transportation mode",
            enum: ["driving", "walking", "transit", "bicycling"]
          }
        },
        required: ["from", "to"]
      }
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, instructions, agentName, agentId, userId, enableTools = true } = body;

    // Allow providing an API key via header or body as a fallback in dev (when env not set)
    const headerApiKey = request.headers.get('x-openai-key') || undefined;
    const bodyApiKey = body?.openaiApiKey || body?.apiKey || undefined;
    const resolvedApiKey = (process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || headerApiKey || bodyApiKey);

    // If still no key, return a graceful 200 with fallback message (avoid 500 breaking voice pipeline)
    if (!resolvedApiKey) {
      console.warn('Chat API - No OpenAI API key available from env, header, or body');
      return NextResponse.json({
        response: "I'm set up to use tools, but my language model isn't configured yet. Please add an OpenAI API key to enable full responses.",
        hasContext: false,
        toolsUsed: [],
        source: 'unconfigured'
      }, { status: 200 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('Chat API - Processing message:', { message, agentName, hasInstructions: !!instructions, agentId, userId, enableTools });

    // Check if Convex is available
    let knowledgeContext = '';
    if (agentId && userId && convexClient) {
      try {
        console.log('Chat API - Querying knowledge base');
        const knowledgeResults = await convexClient.query(api.knowledge.queryKnowledge, {
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
        // Continue without knowledge context if query fails
        console.log('Chat API - Continuing without knowledge context');
      }
    } else {
      console.log('Chat API - Skipping knowledge base query (missing agentId, userId, or Convex URL)');
    }

    // Create system message with instructions, knowledge context, and agent name
    let systemMessage = `You are ${agentName || 'a helpful assistant'}. ${instructions || 'Be helpful, concise, and friendly. Keep responses under 100 words for voice interactions.'}
    
When users ask about events, activities, or local happenings, use the search_local_events tool to provide relevant information.
For weather-related questions, use the get_weather tool.
For scheduling or reminders, use the create_reminder tool.
For general information or news, use the search_web tool.
For calculations or conversions, use the calculate tool.
For directions or travel planning, use the get_directions tool.
For time-related questions, use the get_current_time tool.
For questions about uploaded documents or personal knowledge, use the search_documents tool.

Always provide practical, actionable information and suggest next steps when appropriate.`;
    
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

  const openai = createOpenAIClient(resolvedApiKey);
    let completion;
    try {
      console.log('Chat API - Making OpenAI request with model:', requestParams.model);
      completion = await openai.chat.completions.create(requestParams);
      console.log('Chat API - OpenAI request successful');
    } catch (modelError) {
      console.error('Chat API - OpenAI completion error:', modelError);
      return NextResponse.json({
        response: "I'm having trouble reaching the language model right now. Please try again in a moment.",
        hasContext: !!knowledgeContext,
        toolsUsed: [],
        source: 'fallback-error'
      }, { status: 200 });
    }

    const responseMessage = completion.choices[0]?.message;
    
    // Handle tool calls
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      console.log('Chat API - Processing tool calls:', responseMessage.tool_calls.length);
      
      // Process each tool call
      const toolResults = [];
      for (const toolCall of responseMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: any = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          console.warn('Chat API - failed to parse tool arguments, continuing with empty args');
          toolArgs = {};
        }
        
        let toolResult = '';
        
        switch (toolName) {
          case 'search_documents':
            try {
              if (!convexClient) {
                toolResult = 'Knowledge base search is not available (Convex not configured).';
              } else {
                const searchResults = await convexClient.query(api.knowledge.queryKnowledge, {
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
              }
            } catch (error) {
              console.error('Chat API - Document search error:', error);
              toolResult = 'Error searching documents.';
            }
            break;
            
          case 'get_current_time':
            toolResult = new Date().toLocaleString();
            break;

          case 'get_weather':
            try {
              // Mock weather data - in production, integrate with a weather API
              const location = toolArgs.location || 'current location';
              toolResult = `Weather information for ${location}: Currently 72°F with partly cloudy skies. High of 78°F, low of 65°F. No precipitation expected.`;
            } catch (error) {
              toolResult = 'Unable to retrieve weather information at this time.';
            }
            break;

          case 'search_local_events':
            try {
              const location = toolArgs.location || 'local area';
              const date = toolArgs.date || 'upcoming';
              const category = toolArgs.category || 'general';

              // Mock event search - in production, integrate with event APIs
              toolResult = `Here are some ${category} events in ${location} for ${date}:\n\n` +
                `• Dallas Arts Festival - September 14-16 at Fair Park\n` +
                `• Texas State Fair - October 4-20 at Fair Park\n` +
                `• Deep Ellum Art Co. Events - Various dates throughout the month\n` +
                `• Katy Trail Ice House Music Series - Every Friday and Saturday\n\n` +
                `For the most current information, check local event calendars or websites like Eventbrite and VisitDallas.`;
            } catch (error) {
              toolResult = 'Unable to search for local events at this time.';
            }
            break;

          case 'create_reminder':
            try {
              const title = toolArgs.title;
              const date = toolArgs.date;
              const notes = toolArgs.notes || '';

              // Mock reminder creation - in production, integrate with calendar/task system
              toolResult = `✅ Reminder created: "${title}" scheduled for ${date}.${notes ? ` Notes: ${notes}` : ''}\n\nI'll help you remember this!`;
            } catch (error) {
              toolResult = 'Unable to create reminder at this time.';
            }
            break;

          case 'search_web':
            try {
              const query = toolArgs.query;
              const type = toolArgs.type || 'general';

              // Mock web search - in production, integrate with search APIs
              if (type === 'news') {
                toolResult = `Latest news for "${query}":\n\n` +
                  `• [Source] - Recent developments in the area\n` +
                  `• [Source] - Community updates and announcements\n` +
                  `• [Source] - Local business news\n\n` +
                  `For the most current news, visit local news websites or apps.`;
              } else {
                toolResult = `Search results for "${query}":\n\n` +
                  `Based on current information, here are some relevant details about your query. ` +
                  `For the most up-to-date information, I recommend checking official sources or recent web searches.`;
              }
            } catch (error) {
              toolResult = 'Unable to perform web search at this time.';
            }
            break;

          case 'calculate':
            try {
              const expression = toolArgs.expression;
              // Simple calculator - in production, use a proper math library
              toolResult = `Calculation: ${expression}\nResult: [This would be calculated using a math library]`;
            } catch (error) {
              toolResult = 'Unable to perform calculation.';
            }
            break;

          case 'get_directions':
            try {
              const from = toolArgs.from;
              const to = toolArgs.to;
              const mode = toolArgs.mode || 'driving';

              // Mock directions - in production, integrate with maps API
              toolResult = `Directions from ${from} to ${to} (${mode}):\n\n` +
                `• Distance: Approximately 15 miles\n` +
                `• Estimated time: 25 minutes\n` +
                `• Route: Take I-35E N, exit at Downtown Dallas\n\n` +
                `For real-time traffic and detailed directions, use Google Maps or Apple Maps.`;
            } catch (error) {
              toolResult = 'Unable to get directions at this time.';
            }
            break;
            
          default:
            toolResult = `Unknown tool: ${toolName}`;
        }        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: toolResult,
        });
      }
      
      // Get final response with tool results
      let finalCompletion;
      try {
        console.log('Chat API - Making final OpenAI request with tool results');
        finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',  // Using latest GPT-4o-mini consistently
        messages: [
          ...messages,
          responseMessage,
          ...toolResults,
        ],
        max_tokens: 200,
        temperature: 0.7,
        });
        console.log('Chat API - Final OpenAI request successful');
      } catch (finalError) {
        console.error('Chat API - OpenAI final completion error:', finalError);
        return NextResponse.json({
          response: "I ran into an issue finalizing that answer. Let's try again.",
          hasContext: !!knowledgeContext,
          toolsUsed: responseMessage.tool_calls.map(tc => tc.function.name),
          source: 'fallback-error'
        }, { status: 200 });
      }
      
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
