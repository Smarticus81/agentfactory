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
    
    // Fetch usage data from Convex using the getUserUsage function
    const usageData = await convex.query(api.assistants.getUserUsage, { userId });
    
    if (!usageData) {
      // Return default empty data if no usage found
      return NextResponse.json({
        success: true,
        usageData: {
          currentMonth: { calls: 0, messages: 0, aiMinutes: 0, cost: 0 },
          lastMonth: { calls: 0, messages: 0, aiMinutes: 0, cost: 0 },
          limits: { calls: 1000, messages: 5000, aiMinutes: 50, cost: 100 }
        },
        activeAddons: [],
        costBreakdown: [],
        usageHistory: []
      });
    }

    // Extract cost breakdown from usage data
    const costBreakdown = Object.entries(usageData.currentMonth.breakdown || {}).map(([category, cost]) => ({
      category,
      cost: cost as number,
      percentage: usageData.currentMonth.cost > 0 ? ((cost as number) / usageData.currentMonth.cost) * 100 : 0
    }));

    // Format active addons (this would come from user's plan/subscription)
    const activeAddons = [
      {
        name: 'Voice Agent',
        status: 'active',
        cost: 9.99
      },
      {
        name: 'RAG Knowledge Base',
        status: 'active',
        cost: 4.99
      }
    ];

    return NextResponse.json({
      success: true,
      usageData: usageData,
      activeAddons,
      costBreakdown,
      usageHistory: usageData.usageHistory || []
    });

  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
