import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Connection management for external services
export const createConnection = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("gmail"),
      v.literal("google_calendar"),
      v.literal("outlook"),
      v.literal("microsoft_calendar"),
      v.literal("google_drive"),
      v.literal("onedrive"),
      v.literal("dropbox")
    ),
    scopes: v.array(v.string()),
    tokenRef: v.string(),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
    lastSyncAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists
    const existingConnection = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();

    if (existingConnection) {
      // Update existing connection
      await ctx.db.patch(existingConnection._id, {
        scopes: args.scopes,
        tokenRef: args.tokenRef,
        status: args.status,
        lastSyncAt: args.lastSyncAt,
        updatedAt: new Date().toISOString(),
      });
      return { connectionId: existingConnection._id };
    }

    // Create new connection
    const connectionId = await ctx.db.insert("connections", {
      userId: args.userId,
      type: args.type,
      scopes: args.scopes,
      tokenRef: args.tokenRef,
      status: args.status,
      lastSyncAt: args.lastSyncAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { connectionId };
  },
});

export const getConnections = query({
  args: { 
    userId: v.string(),
    type: v.optional(v.union(
      v.literal("gmail"),
      v.literal("google_calendar"),
      v.literal("outlook"),
      v.literal("microsoft_calendar"),
      v.literal("google_drive"),
      v.literal("onedrive"),
      v.literal("dropbox")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    const connections = await query.collect();

    if (args.type) {
      return connections.filter(conn => conn.type === args.type);
    }

    return connections;
  },
});

export const updateConnectionStatus = mutation({
  args: {
    connectionId: v.id("connections"),
    userId: v.string(),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
    lastSyncAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== args.userId) {
      throw new Error("Connection not found or access denied");
    }

    await ctx.db.patch(args.connectionId, {
      status: args.status,
      lastSyncAt: args.lastSyncAt,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const deleteConnection = mutation({
  args: {
    connectionId: v.id("connections"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== args.userId) {
      throw new Error("Connection not found or access denied");
    }

    await ctx.db.delete(args.connectionId);
    return { success: true };
  },
});

// Email-specific functions
export const syncEmailEvents = mutation({
  args: {
    userId: v.string(),
    connectionId: v.id("connections"),
    emails: v.array(v.object({
      subject: v.string(),
      from: v.string(),
      date: v.string(),
      body: v.string(),
      messageId: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== args.userId) {
      throw new Error("Connection not found or access denied");
    }

    const extractedEvents = [];

    for (const email of args.emails) {
      // Basic email parsing for calendar events
      const eventKeywords = ['meeting', 'appointment', 'call', 'interview', 'conference', 'event'];
      const subjectLower = email.subject.toLowerCase();
      const bodyLower = email.body.toLowerCase();

      if (eventKeywords.some(keyword => 
        subjectLower.includes(keyword) || bodyLower.includes(keyword)
      )) {
        // Extract potential event details
        const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/g;
        const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g;
        
        const timeMatches = email.body.match(timeRegex);
        const dateMatches = email.body.match(dateRegex);

        if (timeMatches && dateMatches) {
          // Create event from email
          const eventId = await ctx.db.insert("events", {
            userId: args.userId,
            calendarId: "email_extracted",
            title: email.subject,
            description: `Extracted from email from ${email.from}\n\n${email.body.substring(0, 500)}...`,
            startAt: new Date(dateMatches[0] + ' ' + timeMatches[0]).toISOString(),
            endAt: new Date(new Date(dateMatches[0] + ' ' + timeMatches[0]).getTime() + 60 * 60 * 1000).toISOString(),
            attendees: [email.from],
            source: "email_extraction",
            icalUid: email.messageId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          extractedEvents.push(eventId);
        }
      }
    }

    // Update last sync time
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { extractedEvents: extractedEvents.length };
  },
});

// Calendar-specific functions
export const syncCalendarEvents = mutation({
  args: {
    userId: v.string(),
    connectionId: v.id("connections"),
    calendarEvents: v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      start: v.string(),
      end: v.string(),
      location: v.optional(v.string()),
      attendees: v.optional(v.array(v.string())),
      icalUid: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== args.userId) {
      throw new Error("Connection not found or access denied");
    }

    const syncedEvents = [];

    for (const calEvent of args.calendarEvents) {
      // Check if event already exists
      const existingEvent = await ctx.db
        .query("events")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("icalUid"), calEvent.icalUid || calEvent.id))
        .first();

      if (existingEvent) {
        // Update existing event
        await ctx.db.patch(existingEvent._id, {
          title: calEvent.title,
          description: calEvent.description,
          startAt: calEvent.start,
          endAt: calEvent.end,
          location: calEvent.location,
          attendees: calEvent.attendees || [],
          updatedAt: new Date().toISOString(),
        });
        syncedEvents.push(existingEvent._id);
      } else {
        // Create new event
        const eventId = await ctx.db.insert("events", {
          userId: args.userId,
          calendarId: connection.type,
          title: calEvent.title,
          description: calEvent.description,
          startAt: calEvent.start,
          endAt: calEvent.end,
          location: calEvent.location,
          attendees: calEvent.attendees || [],
          source: "ics_import",
          icalUid: calEvent.icalUid || calEvent.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        syncedEvents.push(eventId);
      }
    }

    // Update last sync time
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { syncedEvents: syncedEvents.length };
  },
});

// Get integration status summary
export const getIntegrationStatus = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const statusSummary = {
      total: connections.length,
      active: connections.filter(c => c.status === "active").length,
      expired: connections.filter(c => c.status === "expired").length,
      revoked: connections.filter(c => c.status === "revoked").length,
      byType: {} as Record<string, number>,
      lastSync: connections.reduce((latest, conn) => {
        if (!conn.lastSyncAt) return latest;
        return !latest || conn.lastSyncAt > latest ? conn.lastSyncAt : latest;
      }, null as string | null),
    };

    connections.forEach(conn => {
      statusSummary.byType[conn.type] = (statusSummary.byType[conn.type] || 0) + 1;
    });

    return statusSummary;
  },
});
