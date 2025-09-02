import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Google Calendar integration functions for voice-commanded calendar management

// Add calendar event via voice command
export const addCalendarEvent = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startDateTime: v.string(), // ISO string
    endDateTime: v.string(), // ISO string
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
    reminder: v.optional(v.string()),
    agentId: v.optional(v.id("assistants")),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    
    // Store event in database
    const eventId = await ctx.db.insert("calendarEvents", {
      userId: args.userId,
      agentId: args.agentId,
      title: args.title,
      description: args.description,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      location: args.location,
      attendees: args.attendees || [],
      status: "confirmed",
      source: "voice_command",
      reminder: args.reminder,
      createdAt: timestamp,
    });

    try {
      // Integration with Google Calendar API would happen here
      console.log('📅 Voice Command: Adding calendar event', {
        title: args.title,
        start: args.startDateTime,
        end: args.endDateTime,
        user: args.userId
      });

      // Simulate Google Calendar API call
      const googleEventId = `google_event_${Date.now()}`;
      
      // Update with Google event ID
      await ctx.db.patch(eventId, {
        googleEventId,
        updatedAt: timestamp,
      });

      return {
        success: true,
        eventId,
        googleEventId,
        message: `Event "${args.title}" added to calendar`,
      };
    } catch (error: any) {
      // Update status to failed if Google Calendar API fails
      await ctx.db.patch(eventId, {
        status: "cancelled",
        updatedAt: timestamp,
      });

      throw new Error(`Failed to add calendar event: ${error.message}`);
    }
  },
});

// Get upcoming events for voice queries like "what's on my calendar today?"
export const getUpcomingEvents = query({
  args: {
    userId: v.string(),
    fromDate: v.optional(v.string()), // ISO string
    toDate: v.optional(v.string()), // ISO string
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const fromDate = args.fromDate || new Date().toISOString();
    const toDate = args.toDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
    
    const events = await ctx.db
      .query("calendarEvents")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("startDateTime"), fromDate),
          q.lte(q.field("startDateTime"), toDate),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .order("asc") // Order by start time
      .take(limit);

    return events.map(event => ({
      id: event._id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: event.location,
      attendees: event.attendees,
      status: event.status,
      source: event.source,
      createdAt: event.createdAt,
    }));
  },
});

// Search calendar events by voice command
export const searchCalendarEvents = query({
  args: {
    userId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const events = await ctx.db
      .query("calendarEvents")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.neq(q.field("status"), "cancelled")
          // Note: For text search, we'd need to implement full-text search
          // For now, we'll return all events and filter client-side
        )
      )
      .order("desc")
      .take(limit);

    // Basic client-side filtering - in production, use proper text search
    const filteredEvents = events.filter(event => 
      event.title.toLowerCase().includes(args.query.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(args.query.toLowerCase())) ||
      (event.location && event.location.toLowerCase().includes(args.query.toLowerCase()))
    );

    return filteredEvents.map(event => ({
      id: event._id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: event.location,
      attendees: event.attendees,
      status: event.status,
      source: event.source,
      createdAt: event.createdAt,
    }));
  },
});

// Update calendar event
export const updateCalendarEvent = mutation({
  args: {
    userId: v.string(),
    eventId: v.id("calendarEvents"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDateTime: v.optional(v.string()),
    endDateTime: v.optional(v.string()),
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    
    if (!event || event.userId !== args.userId) {
      throw new Error("Event not found");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.startDateTime !== undefined) updateData.startDateTime = args.startDateTime;
    if (args.endDateTime !== undefined) updateData.endDateTime = args.endDateTime;
    if (args.location !== undefined) updateData.location = args.location;
    if (args.attendees !== undefined) updateData.attendees = args.attendees;

    try {
      // Integration with Google Calendar API would happen here
      console.log('📅 Voice Command: Updating calendar event', {
        eventId: args.eventId,
        updates: updateData,
      });

      await ctx.db.patch(args.eventId, updateData);

      return {
        success: true,
        message: `Event "${event.title}" updated`,
      };
    } catch (error: any) {
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  },
});

// Cancel/delete calendar event
export const cancelCalendarEvent = mutation({
  args: {
    userId: v.string(),
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    
    if (!event || event.userId !== args.userId) {
      throw new Error("Event not found");
    }

    try {
      // Integration with Google Calendar API would happen here
      console.log('📅 Voice Command: Cancelling calendar event', {
        eventId: args.eventId,
        title: event.title,
      });

      await ctx.db.patch(args.eventId, {
        status: "cancelled",
        updatedAt: Date.now(),
      });

      return {
        success: true,
        message: `Event "${event.title}" cancelled`,
      };
    } catch (error: any) {
      throw new Error(`Failed to cancel calendar event: ${error.message}`);
    }
  },
});

// Get events for a specific date (for daily briefings)
export const getEventsForDate = query({
  args: {
    userId: v.string(),
    date: v.string(), // ISO date string (YYYY-MM-DD)
  },
  handler: async (ctx, args) => {
    const startOfDay = new Date(args.date + 'T00:00:00.000Z').toISOString();
    const endOfDay = new Date(args.date + 'T23:59:59.999Z').toISOString();
    
    const events = await ctx.db
      .query("calendarEvents")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("startDateTime"), startOfDay),
          q.lte(q.field("startDateTime"), endOfDay),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .order("asc")
      .collect();

    return events.map(event => ({
      id: event._id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      location: event.location,
      attendees: event.attendees,
      status: event.status,
      source: event.source,
    }));
  },
});

// Get calendar summary for voice briefings
export const getCalendarSummary = query({
  args: {
    userId: v.string(),
    days: v.optional(v.number()), // Number of days to look ahead
  },
  handler: async (ctx, args) => {
    const days = args.days || 7; // Default to 7 days
    const fromDate = new Date().toISOString();
    const toDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    
    const events = await ctx.db
      .query("calendarEvents")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("startDateTime"), fromDate),
          q.lte(q.field("startDateTime"), toDate),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .order("asc")
      .collect();

    // Group events by date
    const eventsByDate: { [date: string]: any[] } = {};
    events.forEach(event => {
      const date = event.startDateTime.split('T')[0]; // Get YYYY-MM-DD
      if (!eventsByDate[date]) {
        eventsByDate[date] = [];
      }
      eventsByDate[date].push({
        id: event._id,
        title: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        location: event.location,
      });
    });

    return {
      totalEvents: events.length,
      eventsByDate,
      summary: `You have ${events.length} events in the next ${days} days`,
    };
  },
});
