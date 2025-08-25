import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.union(v.literal("Event Venue"), v.literal("Venue Bar"), v.literal("Venue Voice")),
    description: v.string(),
    customInstructions: v.string(),
    context: v.string(),
    voiceConfig: v.any(), // Voice configuration including voice type, temperature, etc.
    voicePipeline: v.optional(v.any()), // WebRTC pipeline configuration (optional for existing agents)
    toolPermissions: v.any(), // Tool permissions and capabilities
    deploymentSettings: v.optional(v.any()), // Deployment and PWA settings (optional for existing agents)
    tags: v.array(v.string()),
    isActive: v.optional(v.boolean()), // Optional for existing agents
    isArchived: v.optional(v.boolean()), // Archive status
    archivedAt: v.optional(v.string()), // Archive timestamp
    createdAt: v.optional(v.string()), // Optional for existing agents
    updatedAt: v.optional(v.string()), // Optional for existing agents
    // Publishing & Embedding
    slug: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    publishedAt: v.optional(v.string()),
    publishedConfig: v.optional(v.any()),
    allowedOrigins: v.optional(v.array(v.string())),
    publicEmbedToken: v.optional(v.string()),
    // UI Generation and PWA
    generatedUI: v.optional(v.string()), // Generated React component code
    uiCustomization: v.optional(v.any()), // Branding and layout preferences
    pwaManifest: v.optional(v.any()), // PWA configuration
    // Legacy fields for existing agents
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

  deployments: defineTable({
    agentId: v.id("agents"),
    userId: v.string(),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("stopped")),
    deploymentType: v.union(v.literal("pwa"), v.literal("web"), v.literal("api")),
    url: v.optional(v.string()),
    settings: v.any(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  voiceSessions: defineTable({
    agentId: v.id("agents"),
    userId: v.string(),
    sessionId: v.string(),
    status: v.union(v.literal("active"), v.literal("ended"), v.literal("error")),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    duration: v.optional(v.number()),
    stats: v.any(),
    metadata: v.any(),
  })
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session", ["sessionId"]),

  voiceCommands: defineTable({
    sessionId: v.string(),
    agentId: v.id("agents"),
    userId: v.string(),
    command: v.string(),
    intent: v.optional(v.string()),
    confidence: v.optional(v.number()),
    entities: v.optional(v.any()),
    response: v.string(),
    timestamp: v.string(),
    processingTime: v.optional(v.number()),
    success: v.boolean(),
  })
    .index("by_session", ["sessionId"])
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  carts: defineTable({
    sessionId: v.string(),
    agentId: v.id("agents"),
    userId: v.string(),
    items: v.array(v.any()),
    total: v.number(),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_session", ["sessionId"])
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  orders: defineTable({
    cartId: v.id("carts"),
    agentId: v.id("agents"),
    userId: v.string(),
    items: v.array(v.any()),
    total: v.number(),
    tax: v.number(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("cancelled")),
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_cart", ["cartId"])
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  userProfiles: defineTable({
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    organization: v.optional(v.string()),
    preferences: v.any(),
    settings: v.any(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"]),

  documents: defineTable({
    userId: v.string(),
    agentId: v.optional(v.string()), // Optional - documents can be global or agent-specific
    filename: v.string(),
    originalName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    textContent: v.string(),
    embeddings: v.array(v.number()), // OpenAI embeddings for RAG
    uploadedAt: v.string(),
    processedAt: v.optional(v.string()),
    status: v.union(v.literal("processing"), v.literal("ready"), v.literal("error")),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional metadata
  })
    .index("by_user", ["userId"])
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"])
    .index("by_user_agent", ["userId", "agentId"]),

  knowledgeBases: defineTable({
    agentId: v.id("agents"),
    userId: v.string(),
    name: v.string(),
    type: v.union(v.literal("faq"), v.literal("venue_info"), v.literal("schedule"), v.literal("inventory"), v.literal("custom")),
    content: v.string(), // JSON stringified content
    fileUrl: v.optional(v.string()), // URL to uploaded file
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_agent", ["agentId"])
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_active", ["isActive"]),
});
