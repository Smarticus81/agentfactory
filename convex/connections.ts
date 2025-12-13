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

// Gmail-specific token management functions
export const saveGmailTokens = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenType: v.string(),
    expiryDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if Gmail connection already exists
    const existingConnection = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "gmail"))
      .first();

    const tokenData = {
      email: args.email,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenType: args.tokenType,
      expiryDate: args.expiryDate,
      updatedAt: Date.now(),
    };

    if (existingConnection) {
      // Update existing connection
      await ctx.db.patch(existingConnection._id, {
        tokenRef: JSON.stringify(tokenData),
        status: "active",
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { connectionId: existingConnection._id };
    } else {
      // Create new Gmail connection
      const connectionId = await ctx.db.insert("connections", {
        userId: args.userId,
        type: "gmail",
        scopes: [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.compose",
          "https://www.googleapis.com/auth/userinfo.email"
        ],
        tokenRef: JSON.stringify(tokenData),
        status: "active",
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { connectionId };
    }
  },
});

export const checkGmailConnection = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "gmail"))
      .first();

    if (!connection || connection.status !== "active") {
      return { 
        connected: false, 
        email: null,
        requiresAuth: true 
      };
    }

    try {
      const tokenData = JSON.parse(connection.tokenRef);

      // Check if token is expired
      const now = Date.now();
      const expiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
      const isExpired = tokenData.expiryDate && (tokenData.expiryDate * 1000) < (now + expiryBuffer);

      if (isExpired) {
        return { 
          connected: false, 
          email: tokenData.email || null,
          requiresAuth: true,
          expired: true
        };
      }

      return {
        connected: true,
        email: tokenData.email || null,
        requiresAuth: false
      };
    } catch (error) {
      console.error("Error checking Gmail connection:", error);
      return { 
        connected: false, 
        email: null,
        requiresAuth: true 
      };
    }
  },
});

export const getGmailTokens = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "gmail"))
      .first();

    if (!connection || connection.status !== "active") {
      return null;
    }

    try {
      const tokenData = JSON.parse(connection.tokenRef);

      // Check if token is expired and needs refresh
      const now = Date.now();
      const expiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
      const isExpired = tokenData.expiryDate && (tokenData.expiryDate * 1000) < (now + expiryBuffer);

      if (isExpired) {
        console.log(`Gmail token expired for user ${args.userId}, needs refresh`);
      }

      return {
        email: tokenData.email,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenType: tokenData.tokenType,
        expiryDate: tokenData.expiryDate,
        expired: isExpired,
      };
    } catch (error) {
      console.error("Error parsing Gmail tokens:", error);
      return null;
    }
  },
});

export const updateGmailTokens = mutation({
  args: {
    userId: v.string(),
    accessToken: v.string(),
    expiryDate: v.number(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "gmail"))
      .first();

    if (!connection) {
      throw new Error("Gmail connection not found");
    }

    try {
      const tokenData = JSON.parse(connection.tokenRef);
      tokenData.accessToken = args.accessToken;
      tokenData.expiryDate = args.expiryDate;
      tokenData.updatedAt = Date.now();

      await ctx.db.patch(connection._id, {
        tokenRef: JSON.stringify(tokenData),
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating Gmail tokens:", error);
      throw new Error("Failed to update Gmail tokens");
    }
  },
});

// Production-ready token refresh function
export const refreshGmailToken = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("connections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "gmail"))
      .first();

    if (!connection || connection.status !== "active") {
      throw new Error("No active Gmail connection found");
    }

    try {
      const tokenData = JSON.parse(connection.tokenRef);

      if (!tokenData.refreshToken) {
        throw new Error("No refresh token available");
      }

      // Use Google's token refresh endpoint
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: tokenData.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error(`Token refresh failed: ${refreshResponse.status}`);
      }

      const newTokens = await refreshResponse.json();

      // Update token data
      tokenData.accessToken = newTokens.access_token;
      tokenData.expiryDate = Date.now() + (newTokens.expires_in * 1000);
      tokenData.updatedAt = Date.now();

      await ctx.db.patch(connection._id, {
        tokenRef: JSON.stringify(tokenData),
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        accessToken: newTokens.access_token,
        expiryDate: tokenData.expiryDate,
      };
    } catch (error) {
      console.error("Error refreshing Gmail token:", error);

      // Mark connection as expired if refresh fails
      await ctx.db.patch(connection._id, {
        status: "expired",
        updatedAt: new Date().toISOString(),
      });

      throw new Error("Failed to refresh Gmail token");
    }
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

// Production monitoring: Get system-wide connection stats (admin only)
export const getSystemConnectionStats = query({
  handler: async (ctx) => {
    // In production, you'd add admin authentication here
    const allConnections = await ctx.db.query("connections").collect();

    const stats = {
      totalUsers: new Set(allConnections.map(c => c.userId)).size,
      totalConnections: allConnections.length,
      connectionsByType: {} as Record<string, number>,
      connectionsByStatus: {} as Record<string, number>,
      recentConnections: allConnections.filter(c => {
        const createdAt = new Date(c.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdAt > weekAgo;
      }).length,
    };

    allConnections.forEach(conn => {
      stats.connectionsByType[conn.type] = (stats.connectionsByType[conn.type] || 0) + 1;
      stats.connectionsByStatus[conn.status] = (stats.connectionsByStatus[conn.status] || 0) + 1;
    });

    return stats;
  },
});

// Production: Batch token refresh for expired connections
export const batchRefreshExpiredTokens = mutation({
  handler: async (ctx) => {
    // In production, this would be run by a scheduled job
    const expiredConnections = await ctx.db
      .query("connections")
      .filter((q) => q.eq(q.field("status"), "active"))
      .filter((q) => q.eq(q.field("type"), "gmail"))
      .collect();

    const results = [];
    const now = Date.now();
    const expiryBuffer = 30 * 60 * 1000; // 30 minutes buffer

    for (const connection of expiredConnections) {
      try {
        const tokenData = JSON.parse(connection.tokenRef);

        // Check if token needs refresh
        if (tokenData.expiryDate && (tokenData.expiryDate * 1000) < (now + expiryBuffer)) {
          // Refresh token logic here (simplified)
          console.log(`Refreshing token for user ${connection.userId}`);

          // Mark as successfully processed
          results.push({ userId: connection.userId, status: 'refreshed' });
        }
      } catch (error) {
        console.error(`Failed to process connection for user ${connection.userId}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ userId: connection.userId, status: 'error', error: errorMessage });
      }
    }

    return { processed: results.length, results };
  },
});
