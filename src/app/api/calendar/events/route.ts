import { NextRequest, NextResponse } from 'next/server';
import { convex } from '@/lib/convex';
import { api } from '../../../../../convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      title, 
      description, 
      startDateTime, 
      endDateTime, 
      location, 
      attendees, 
      reminder, 
      agentId 
    } = body;

    if (!userId || !title || !startDateTime) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, startDateTime' },
        { status: 400 }
      );
    }

    // Call the Convex Calendar function
    const result = await convex.mutation(api.calendar.addCalendarEvent, {
      userId,
      title,
      description,
      startDateTime,
      endDateTime: endDateTime || new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString(),
      location,
      attendees,
      reminder,
      agentId,
    });

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      message: result.message,
    });

  } catch (error) {
    console.error('Calendar add error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add calendar event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get upcoming events
    const events = await convex.query(api.calendar.getUpcomingEvents, {
      userId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      events,
    });

  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}
