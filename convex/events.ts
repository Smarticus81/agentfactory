import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Event and calendar management
export const createEvent = mutation({
  args: {
    userId: v.string(),
    calendarId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startAt: v.string(),
    endAt: v.string(),
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
    childRef: v.optional(v.string()),
    source: v.optional(v.union(v.literal("manual"), v.literal("email_extraction"), v.literal("ics_import"), v.literal("assistant_created"))),
    icalUid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", {
      userId: args.userId,
      calendarId: args.calendarId,
      icalUid: args.icalUid,
      title: args.title,
      description: args.description,
      startAt: args.startAt,
      endAt: args.endAt,
      location: args.location,
      attendees: args.attendees || [],
      childRef: args.childRef,
      source: args.source || "assistant_created",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { eventId };
  },
});

export const getEvents = query({
  args: { 
    userId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    calendarId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    let events = await query.collect();

    // Filter by calendar if provided
    if (args.calendarId) {
      events = events.filter(event => event.calendarId === args.calendarId);
    }

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      events = events.filter(event => 
        event.startAt >= args.startDate! && event.startAt <= args.endDate!
      );
    }

    return events.sort((a, b) => 
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startAt: v.optional(v.string()),
    endAt: v.optional(v.string()),
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
    childRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== args.userId) {
      throw new Error("Event not found or access denied");
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.startAt !== undefined) updates.startAt = args.startAt;
    if (args.endAt !== undefined) updates.endAt = args.endAt;
    if (args.location !== undefined) updates.location = args.location;
    if (args.attendees !== undefined) updates.attendees = args.attendees;
    if (args.childRef !== undefined) updates.childRef = args.childRef;

    await ctx.db.patch(args.eventId, updates);
    return { success: true };
  },
});

export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== args.userId) {
      throw new Error("Event not found or access denied");
    }

    await ctx.db.delete(args.eventId);
    return { success: true };
  },
});

// Family-specific calendar functions
export const getFamilyEvents = query({
  args: { 
    userId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("startAt"), args.startDate),
          q.lte(q.field("startAt"), args.endDate)
        )
      )
      .collect();

    const familyMembers = await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Group events by family member
    const eventsByMember = familyMembers.reduce((acc, member) => {
      acc[member.name] = events.filter(event => 
        event.childRef === member.name || 
        event.attendees.includes(member.name)
      );
      return acc;
    }, {} as Record<string, any[]>);

    // Add unassigned events
    eventsByMember['unassigned'] = events.filter(event => 
      !event.childRef && 
      !familyMembers.some(member => event.attendees.includes(member.name))
    );

    return {
      events,
      familyMembers,
      eventsByMember,
    };
  },
});

// Student-specific calendar functions
export const getSchoolEvents = query({
  args: { 
    userId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let schoolEvents = events.filter(event => 
      event.title.toLowerCase().includes('class') ||
      event.title.toLowerCase().includes('exam') ||
      event.title.toLowerCase().includes('assignment') ||
      event.title.toLowerCase().includes('test') ||
      event.title.toLowerCase().includes('quiz') ||
      event.title.toLowerCase().includes('homework') ||
      event.title.toLowerCase().includes('study') ||
      event.location?.toLowerCase().includes('school') ||
      event.location?.toLowerCase().includes('classroom')
    );

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      schoolEvents = schoolEvents.filter(event => 
        event.startAt >= args.startDate! && event.startAt <= args.endDate!
      );
    }

    return schoolEvents.sort((a, b) => 
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  },
});

export const getUpcomingDeadlines = query({
  args: { 
    userId: v.string(),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAhead = args.daysAhead || 7;
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
    
    const nowISO = now.toISOString();
    const futureDateISO = futureDate.toISOString();

    // Get tasks with due dates
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const upcomingTasks = tasks.filter(task => 
      task.dueAt && 
      task.dueAt >= nowISO && 
      task.dueAt <= futureDateISO &&
      task.status !== "completed" &&
      task.status !== "cancelled"
    );

    // Get events that are deadlines or assignments
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("startAt"), nowISO),
          q.lte(q.field("startAt"), futureDateISO)
        )
      )
      .collect();

    const deadlineEvents = events.filter(event => 
      event.title.toLowerCase().includes('due') ||
      event.title.toLowerCase().includes('deadline') ||
      event.title.toLowerCase().includes('assignment') ||
      event.title.toLowerCase().includes('exam') ||
      event.title.toLowerCase().includes('test')
    );

    return {
      tasks: upcomingTasks.sort((a, b) => 
        new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()
      ),
      events: deadlineEvents.sort((a, b) => 
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      ),
    };
  },
});
