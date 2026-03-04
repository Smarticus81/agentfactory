import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    authProvider: v.union(v.literal("google"), v.literal("microsoft"), v.literal("email")),
    settings: v.any(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("pro_plus"), v.literal("premium")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_plan", ["plan"]),

  assistants: defineTable({
    ownerId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("Restaurant"),
      v.literal("Bar & Lounge"),
      v.literal("Nightclub"),
      v.literal("Event Venue"),
      v.literal("Custom")
    ),
    description: v.string(),
    customInstructions: v.string(),
    voiceEnabled: v.boolean(),
    wakeWord: v.optional(v.string()),
    voiceConfig: v.any(),
    venueConfig: v.optional(v.any()),
    isActive: v.boolean(),
    isArchived: v.optional(v.boolean()),
    archivedAt: v.optional(v.string()),
    isDeployed: v.optional(v.boolean()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_type", ["type"])
    .index("by_active", ["isActive"])
    .index("by_archived", ["isArchived"]),

  deployments: defineTable({
    assistantId: v.id("assistants"),
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("stopped")),
    settings: v.any(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_assistant", ["assistantId"])
    .index("by_status", ["status"]),

  connections: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("pos_database"),
      v.literal("square"),
      v.literal("toast"),
      v.literal("clover"),
      v.literal("custom_sql")
    ),
    config: v.any(),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
    lastSyncAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  voiceSessions: defineTable({
    assistantId: v.id("assistants"),
    userId: v.string(),
    sessionId: v.string(),
    status: v.union(v.literal("active"), v.literal("ended"), v.literal("error")),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    duration: v.optional(v.number()),
    toolCalls: v.array(v.any()),
    metadata: v.any(),
  })
    .index("by_assistant", ["assistantId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session", ["sessionId"]),

  actionLog: defineTable({
    userId: v.string(),
    action: v.string(),
    payloadHash: v.string(),
    result: v.any(),
    requiresConfirmation: v.boolean(),
    confirmedBy: v.optional(v.string()),
    timestamp: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  usageLedger: defineTable({
    userId: v.string(),
    category: v.union(
      v.literal("voice_minutes"),
      v.literal("pos_queries"),
      v.literal("api_calls"),
      v.literal("deployments")
    ),
    unit: v.string(),
    amount: v.number(),
    occurredAt: v.string(),
    sessionId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_date", ["occurredAt"]),
});
