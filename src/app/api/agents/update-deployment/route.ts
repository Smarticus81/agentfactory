import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { agentId, deploymentInfo } = await request.json();

    if (!agentId || !deploymentInfo) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId and deploymentInfo' },
        { status: 400 }
      );
    }

    // Update the assistant with deployment information
    await convex.mutation(api.assistants.update, {
      assistantId: agentId,
      updates: {
        isDeployed: true,
        // Store deployment info in voiceConfig or create a separate deployment record
        voiceConfig: {
          ...deploymentInfo,
          deployedAt: new Date().toISOString()
        }
      }
    });

    // Create a deployment record
    await convex.mutation(api.deployments.create, {
      assistantId: agentId,
      userId: deploymentInfo.userId || '', // User ID should be provided
      name: deploymentInfo.agentName || 'Voice Agent',
      description: `Deployed ${deploymentInfo.platform} voice agent`,
      status: 'active',
      settings: {
        platform: deploymentInfo.platform,
        tier: deploymentInfo.tier,
        deploymentUrl: deploymentInfo.deploymentUrl,
        deploymentId: deploymentInfo.deploymentId,
        deployedAt: new Date().toISOString()
      }
    });

    console.log(`Agent ${agentId} deployed successfully to ${deploymentInfo.platform} platform`);

    return NextResponse.json({
      success: true,
      message: 'Agent deployment updated successfully',
      agentId,
      deploymentInfo,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating agent deployment:', error);
    return NextResponse.json(
      { error: 'Failed to update agent deployment' },
      { status: 500 }
    );
  }
}
