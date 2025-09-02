import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userType,
      familySize,
      primaryUseCase,
      experience,
      goals,
      notifications,
      connectors,
      voicePipeline,
      wakeWord,
      routines,
      familyMembers
    } = body;

    // For now, we'll implement a simplified version without direct Convex calls
    // The frontend will handle the Convex mutations directly
    
    const onboardingData = {
      userId,
      userType,
      familySize,
      primaryUseCase,
      experience,
      goals,
      notifications,
      connectors,
      voicePipeline: voicePipeline || 'lite',
      wakeWord: wakeWord || 'Hey Family',
      routines: routines || [],
      familyMembers: familyMembers || [],
      completedAt: new Date().toISOString()
    };

    // The actual data persistence will be handled by the frontend
    // using useConvexMutation hooks for better error handling and real-time updates

    return NextResponse.json({
      success: true,
      data: onboardingData,
      nextSteps: {
        connectServices: connectors ? Object.keys(connectors).length > 0 : false,
        setupVoice: voicePipeline === 'pro' || voicePipeline === 'pro_plus',
        testAssistant: true,
        createAssistant: true
      }
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
