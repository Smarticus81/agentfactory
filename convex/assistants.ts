import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_VOICE_CONFIG = {
  provider: "openai",
  model: "gpt-4o-mini",
  voice: "alloy",
  temperature: 0.7,
  maxTokens: 1000,
};

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("Restaurant"),
      v.literal("Bar & Lounge"),
      v.literal("Nightclub"),
      v.literal("Event Venue"),
      v.literal("Custom")
    ),
    description: v.string(),
    customInstructions: v.optional(v.string()),
    voiceEnabled: v.optional(v.boolean()),
    wakeWord: v.optional(v.string()),
    voiceConfig: v.optional(v.any()),
    venueConfig: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const assistantId = await ctx.db.insert("assistants", {
      ownerId: args.userId,
      name: args.name,
      type: args.type,
      description: args.description,
      customInstructions: args.customInstructions || "",
      voiceEnabled: args.voiceEnabled || true,
      wakeWord: args.wakeWord,
      voiceConfig: args.voiceConfig || DEFAULT_VOICE_CONFIG,
      venueConfig: args.venueConfig || {},
      isActive: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { assistantId };
  },
});

export const get = query({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) return null;
    return {
      ...assistant,
      isActive: assistant.isActive !== undefined ? assistant.isActive : true,
      isArchived: assistant.isArchived || false,
    };
  },
});

export const getUserAgents = query({
  args: {
    userId: v.string(),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const assistants = await ctx.db
      .query("assistants")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    const filtered = args.includeArchived
      ? assistants
      : assistants.filter((a) => !a.isArchived);

    return filtered.map((a) => ({
      ...a,
      isActive: a.isActive !== undefined ? a.isActive : true,
      isArchived: a.isArchived || false,
    }));
  },
});

export const update = mutation({
  args: {
    assistantId: v.id("assistants"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      customInstructions: v.optional(v.string()),
      voiceEnabled: v.optional(v.boolean()),
      wakeWord: v.optional(v.string()),
      voiceConfig: v.optional(v.any()),
      venueConfig: v.optional(v.any()),
      isActive: v.optional(v.boolean()),
      isDeployed: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assistantId, {
      ...args.updates,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

export const deleteAgent = mutation({
  args: { agentId: v.id("assistants"), userId: v.string() },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.agentId);
    if (!assistant) throw new Error("Agent not found");
    if (assistant.ownerId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.agentId);
    return { success: true };
  },
});

export const archiveAgent = mutation({
  args: { agentId: v.id("assistants"), userId: v.string() },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.agentId);
    if (!assistant) throw new Error("Agent not found");
    if (assistant.ownerId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.agentId, {
      isArchived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

export const unarchiveAgent = mutation({
  args: { agentId: v.id("assistants"), userId: v.string() },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.agentId);
    if (!assistant) throw new Error("Agent not found");
    if (assistant.ownerId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.agentId, {
      isArchived: false,
      archivedAt: undefined,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

export const getPublishedAgent = query({
  args: { agentId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.agentId);
    if (!assistant || !assistant.isActive) return null;
    return {
      id: assistant._id,
      ownerId: assistant.ownerId,
      slug: assistant.name.toLowerCase().replace(/\s+/g, "-"),
      publishedAt: assistant.updatedAt,
      allowedOrigins: ["*"],
      config: {
        name: assistant.name,
        type: assistant.type,
        description: assistant.description,
        customInstructions: assistant.customInstructions,
        voiceEnabled: assistant.voiceEnabled,
        wakeWord: assistant.wakeWord,
        voiceConfig: assistant.voiceConfig,
        venueConfig: assistant.venueConfig,
      },
    };
  },
});

export const getUserUsage = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const allUsage = await ctx.db
      .query("usageLedger")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthUsage = allUsage.filter((item) => {
      const d = new Date(item.occurredAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totals = { voice_minutes: 0, pos_queries: 0, api_calls: 0, deployments: 0 };
    currentMonthUsage.forEach((item) => {
      if (item.category in totals) {
        totals[item.category as keyof typeof totals] += item.amount;
      }
    });

    return {
      currentMonth: {
        aiMinutes: totals.voice_minutes,
        messages: totals.pos_queries + totals.api_calls,
        cost: totals.voice_minutes * 0.1 + totals.pos_queries * 0.001,
      },
      limits: { aiMinutes: 100, messages: 5000, cost: 100 },
    };
  },
});
