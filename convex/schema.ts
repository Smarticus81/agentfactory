import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Core user and assistant tables
  users: defineTable({
    email: v.string(),
    name: v.string(),
    authProvider: v.union(v.literal("google"), v.literal("microsoft"), v.literal("email")),
    settings: v.any(), // User preferences, notification settings, etc.
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("pro_plus"), v.literal("premium")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_plan", ["plan"]),

  assistants: defineTable({
    ownerId: v.string(), // Clerk user ID
    name: v.string(),
    type: v.union(v.literal("Family Assistant"), v.literal("Personal Admin"), v.literal("Student Helper"), v.literal("Custom")),
    description: v.string(),
    customInstructions: v.string(),
    voiceEnabled: v.boolean(),
    wakeWord: v.optional(v.string()),
    voiceConfig: v.any(), // Voice type, temperature, etc.
    isActive: v.boolean(),
    isArchived: v.optional(v.boolean()), // Track if assistant is archived
    archivedAt: v.optional(v.string()), // When the assistant was archived
    isDeployed: v.optional(v.boolean()), // Track if assistant is deployed
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_type", ["type"])
    .index("by_active", ["isActive"])
    .index("by_archived", ["isArchived"]),

  // Deployments for assistants
  deployments: defineTable({
    assistantId: v.id("assistants"),
    userId: v.string(), // Clerk user ID
    name: v.string(),
    description: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("stopped")),
    settings: v.any(), // Deployment-specific settings
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_assistant", ["assistantId"])
    .index("by_status", ["status"]),

  // Service connections (OAuth tokens, API keys)
  connections: defineTable({
    userId: v.string(), // Clerk user ID
    type: v.union(v.literal("gmail"), v.literal("google_calendar"), v.literal("outlook"), v.literal("microsoft_calendar"), v.literal("google_drive"), v.literal("onedrive"), v.literal("dropbox")),
    scopes: v.array(v.string()),
    tokenRef: v.string(), // Reference to encrypted token in secrets vault
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
    lastSyncAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  // Family and household management
  familyMembers: defineTable({
    userId: v.string(), // Clerk user ID
    name: v.string(),
    role: v.union(v.literal("child"), v.literal("spouse"), v.literal("parent"), v.literal("other")),
    contactRef: v.optional(v.string()), // Reference to contact info
    calendarRefs: v.array(v.string()), // Array of calendar feed references
    color: v.optional(v.string()), // UI color assignment
    metadata: v.optional(v.any()), // Additional info like school, team, etc.
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"]),

  // Knowledge and RAG system
  knowledgeItems: defineTable({
    userId: v.string(), // Clerk user ID
    sourceType: v.union(v.literal("email"), v.literal("document"), v.literal("calendar"), v.literal("web_snapshot"), v.literal("note")),
    uri: v.string(), // Source identifier (email ID, file path, URL, etc.)
    title: v.string(),
    content: v.string(), // Full text content
    chunks: v.array(v.string()), // Text chunks for RAG
    embeddings: v.array(v.number()), // Vector embeddings
    tags: v.array(v.string()), // Person names, categories, etc.
    metadata: v.any(), // Source-specific metadata
    lastRefreshAt: v.string(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_source_type", ["sourceType"])
    .index("by_tags", ["tags"])
    .index("by_refresh", ["lastRefreshAt"]),

  // Tasks and events
  tasks: defineTable({
    userId: v.string(), // Clerk user ID
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.optional(v.string()),
    assignee: v.optional(v.string()), // Family member name
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
    sourceEmailId: v.optional(v.string()), // If extracted from email
    tags: v.array(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_assignee", ["assignee"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueAt"]),

  events: defineTable({
    userId: v.string(), // Clerk user ID
    calendarId: v.string(), // Which calendar this belongs to
    icalUid: v.optional(v.string()), // iCal UID for sync
    title: v.string(),
    description: v.optional(v.string()),
    startAt: v.string(),
    endAt: v.string(),
    location: v.optional(v.string()),
    attendees: v.array(v.string()),
    childRef: v.optional(v.string()), // If related to a family member
    source: v.union(v.literal("manual"), v.literal("email_extraction"), v.literal("ics_import"), v.literal("assistant_created")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_calendar", ["calendarId"])
    .index("by_date_range", ["startAt", "endAt"])
    .index("by_child", ["childRef"]),

  // Gmail and email management
  emails: defineTable({
    userId: v.string(), // Clerk user ID
    agentId: v.optional(v.id("assistants")), // Which agent handled this
    type: v.union(v.literal("sent"), v.literal("draft"), v.literal("received")),
    to: v.string(),
    from: v.optional(v.string()),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("draft"), v.literal("failed")),
    gmailId: v.optional(v.string()), // Gmail message ID for sync
    threadId: v.optional(v.string()), // Gmail thread ID
    sentAt: v.optional(v.number()),
    receivedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_agent", ["agentId"])
    .index("by_thread", ["threadId"])
    .index("by_gmail_id", ["gmailId"]),

  // Google Calendar integration
  calendarEvents: defineTable({
    userId: v.string(), // Clerk user ID
    agentId: v.optional(v.id("assistants")), // Which agent created this
    googleCalendarId: v.optional(v.string()), // Google Calendar ID
    googleEventId: v.optional(v.string()), // Google Event ID for sync
    title: v.string(),
    description: v.optional(v.string()),
    startDateTime: v.string(), // ISO string
    endDateTime: v.string(), // ISO string
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
    status: v.union(v.literal("confirmed"), v.literal("tentative"), v.literal("cancelled")),
    source: v.union(v.literal("voice_command"), v.literal("manual"), v.literal("sync"), v.literal("email_extraction")),
    reminder: v.optional(v.string()), // Reminder time
    recurring: v.optional(v.any()), // Recurrence rules
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_google_calendar", ["googleCalendarId"])
    .index("by_google_event", ["googleEventId"])
    .index("by_date_range", ["startDateTime", "endDateTime"])
    .index("by_status", ["status"])
    .index("by_source", ["source"]),

  // Action logging and audit trail
  actionLog: defineTable({
    userId: v.string(), // Clerk user ID
    action: v.string(), // Tool call identifier
    payloadHash: v.string(), // Hash of action payload for verification
    result: v.any(), // Action result
    requiresConfirmation: v.boolean(),
    confirmedBy: v.optional(v.string()), // User confirmation timestamp
    timestamp: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"])
    .index("by_confirmation", ["requiresConfirmation"]),

  // Usage tracking for billing
  usageLedger: defineTable({
    userId: v.string(), // Clerk user ID
    category: v.union(v.literal("voice_minutes"), v.literal("email_sends"), v.literal("rag_queries"), v.literal("web_searches"), v.literal("calendar_events")),
    unit: v.string(), // minutes, count, etc.
    amount: v.number(),
    occurredAt: v.string(),
    sessionId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_date", ["occurredAt"]),

  // Routines and automation
  routines: defineTable({
    userId: v.string(), // Clerk user ID
    name: v.string(),
    type: v.union(v.literal("morning_brief"), v.literal("inbox_sweep"), v.literal("after_school_digest"), v.literal("travel_day"), v.literal("custom")),
    schedule: v.any(), // Cron expression or trigger conditions
    isActive: v.boolean(),
    lastRunAt: v.optional(v.string()),
    nextRunAt: v.optional(v.string()),
    actions: v.array(v.any()), // Array of actions to perform
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_active", ["isActive"])
    .index("by_next_run", ["nextRunAt"]),

  // Voice sessions (for usage tracking)
  voiceSessions: defineTable({
    assistantId: v.id("assistants"),
    userId: v.string(), // Clerk user ID
    sessionId: v.string(),
    status: v.union(v.literal("active"), v.literal("ended"), v.literal("error")),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    duration: v.optional(v.number()), // in seconds
    toolCalls: v.array(v.any()), // Array of tool calls made during session
    metadata: v.any(),
  })
    .index("by_assistant", ["assistantId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session", ["sessionId"]),

  // Voice sessions (alternative naming for compatibility)
  voice_sessions: defineTable({
    id: v.string(),
    assistantId: v.id("assistants"),
    userId: v.string(), // Clerk user ID
    sessionId: v.string(),
    status: v.union(v.literal("active"), v.literal("ended"), v.literal("error")),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    duration: v.optional(v.number()), // in seconds
    toolCalls: v.array(v.any()), // Array of tool calls made during session
    metadata: v.any(),
  })
    .index("by_assistant", ["assistantId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session", ["sessionId"])
    .index("by_session_id", ["id"]),

  // Voice commands tracking
  voice_commands: defineTable({
    id: v.string(),
    sessionId: v.string(),
    userId: v.string(),
    assistantId: v.id("assistants"),
    command: v.string(),
    response: v.optional(v.string()),
    timestamp: v.string(),
    status: v.union(v.literal("processed"), v.literal("pending"), v.literal("error")),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_assistant", ["assistantId"])
    .index("by_session", ["sessionId"])
    .index("by_command_id", ["id"]),



  // Legacy tables for migration (can be removed after migration)
  legacyAgents: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.union(v.literal("Family Assistant"), v.literal("Personal Admin"), v.literal("Student Helper")),
    description: v.string(),
    customInstructions: v.string(),
    context: v.string(),
    voiceConfig: v.any(),
    voicePipeline: v.optional(v.any()),
    toolPermissions: v.any(),
    deploymentSettings: v.optional(v.any()),
    tags: v.array(v.string()),
    isActive: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    archivedAt: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    slug: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    publishedAt: v.optional(v.string()),
    publishedConfig: v.optional(v.any()),
    allowedOrigins: v.optional(v.array(v.string())),
    publicEmbedToken: v.optional(v.string()),
    generatedUI: v.optional(v.string()),
    uiCustomization: v.optional(v.any()),
    pwaManifest: v.optional(v.any()),
    status: v.optional(v.string()),
    systemInstructions: v.optional(v.string()),
    enabledTools: v.optional(v.array(v.string())),
    version: v.optional(v.string()),
    lastModified: v.optional(v.number()),
    createdBy: v.optional(v.string()),
    stats: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_active", ["isActive"]),
});
