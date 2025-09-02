import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params or headers
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch agents from Convex using the getByOwner function
    const agents = await convex.query(api.assistants.getByOwner, { ownerId: userId });
    
    return NextResponse.json({
      success: true,
      agents: agents || [],
      count: agents?.length || 0
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      type, 
      description, 
      customInstructions, 
      instructions,
      capabilities, 
      voiceEnabled, 
      voicePipeline, 
      wakeWord, 
      userId 
    } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, userId' },
        { status: 400 }
      );
    }

    // Use instructions from onboarding or fallback to customInstructions
    const finalInstructions = instructions || customInstructions || `You are ${name}, a helpful AI assistant.`;

    // Create agent using Convex create function
    const result = await convex.mutation(api.assistants.create, {
      userId,
      name,
      type: type || 'assistant',
      description: description || `${name} - Your personalized AI assistant`,
      customInstructions: finalInstructions,
      voiceEnabled: voiceEnabled || false,
      voiceConfig: voiceEnabled ? {
        pipeline: voicePipeline || 'lite',
        wakeWord: wakeWord || 'Hey Assistant',
        enabled: true
      } : null
    });

    // Fetch the created agent to return complete data
    const createdAgent = await convex.query(api.assistants.get, { 
      assistantId: result.assistantId 
    });

    if (!createdAgent) {
      throw new Error('Failed to create agent');
    }

    return NextResponse.json({
      success: true,
      agent: createdAgent,
      id: result.assistantId,
      message: 'Agent created successfully'
    });

  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
