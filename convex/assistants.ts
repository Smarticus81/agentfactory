import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Default voice pipeline configuration  
const DEFAULT_VOICE_PIPELINE_CONFIG = {
  provider: "openai",
  model: "gpt-4o",
  voice: "nova", // Changed from "alloy" to avoid hardcoded defaults
  temperature: 0.7,
  maxTokens: 1000,
};

// Create a new assistant
export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("Family Assistant"),
      v.literal("Personal Admin"),
      v.literal("Student Helper"),
      v.literal("Custom")
    ),
    description: v.string(),
    customInstructions: v.optional(v.string()),
    voiceEnabled: v.optional(v.boolean()),
    wakeWord: v.optional(v.string()),
    voiceConfig: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const assistantId = await ctx.db.insert("assistants", {
      ownerId: args.userId,
      name: args.name,
      type: args.type,
      description: args.description,
      customInstructions: args.customInstructions || "",
      voiceEnabled: args.voiceEnabled || false,
      wakeWord: args.wakeWord,
      voiceConfig: args.voiceConfig || DEFAULT_VOICE_PIPELINE_CONFIG,
      isActive: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { assistantId };
  },
});

// Update an assistant
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
      isActive: v.optional(v.boolean()),
      isDeployed: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const { assistantId, updates } = args;
    
    await ctx.db.patch(assistantId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Get an assistant by ID
export const get = query({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) return null;

    return {
      ...assistant,
      voicePipeline: assistant.voiceConfig || DEFAULT_VOICE_PIPELINE_CONFIG,
      isActive: assistant.isActive !== undefined ? assistant.isActive : true,
      isArchived: assistant.isArchived || false,
      createdAt: assistant.createdAt || new Date().toISOString(),
      updatedAt: assistant.updatedAt || new Date().toISOString(),
    };
  },
});

// Get all assistants for a user
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const assistants = await ctx.db
      .query("assistants")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    return assistants.map(assistant => ({
      ...assistant,
      voicePipeline: assistant.voiceConfig || DEFAULT_VOICE_PIPELINE_CONFIG,
      isActive: assistant.isActive !== undefined ? assistant.isActive : true,
      isArchived: assistant.isArchived || false,
      createdAt: assistant.createdAt || new Date().toISOString(),
      updatedAt: assistant.updatedAt || new Date().toISOString(),
    }));
  },
});

// Get all assistants for a user (alias for list function)
export const getUserAgents = query({
  args: { 
    userId: v.string(),
    includeArchived: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const assistants = await ctx.db
      .query("assistants")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    let filteredAssistants = assistants;
    
    // Filter by archived status if specified
    if (args.includeArchived !== undefined) {
      filteredAssistants = assistants.filter(assistant => 
        args.includeArchived ? true : !assistant.isArchived
      );
    }

    return filteredAssistants.map(assistant => ({
      ...assistant,
      voicePipeline: assistant.voiceConfig || DEFAULT_VOICE_PIPELINE_CONFIG,
      isActive: assistant.isActive !== undefined ? assistant.isActive : true,
      isArchived: assistant.isArchived || false,
      createdAt: assistant.createdAt || new Date().toISOString(),
      updatedAt: assistant.updatedAt || new Date().toISOString(),
    }));
  },
});

// Delete an assistant
export const remove = mutation({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) {
      throw new Error("Assistant not found");
    }

    await ctx.db.delete(args.assistantId);
    return { success: true };
  },
});

// Delete an assistant (alias for remove function)
export const deleteAgent = mutation({
  args: { 
    agentId: v.id("assistants"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.agentId);
    if (!assistant) {
      throw new Error("Assistant not found");
    }

    // Verify ownership
    if (assistant.ownerId !== args.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.agentId);
    return { success: true };
  },
});

// Archive an assistant
export const archiveAgent = mutation({
  args: { 
    agentId: v.id("assistants"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.agentId);
    if (!assistant) {
      throw new Error("Assistant not found");
    }

    // Verify ownership
    if (assistant.ownerId !== args.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.agentId, {
      isArchived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Unarchive an assistant
export const unarchiveAgent = mutation({
  args: { 
    agentId: v.id("assistants"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.agentId);
    if (!assistant) {
      throw new Error("Assistant not found");
    }

    // Verify ownership
    if (assistant.ownerId !== args.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.agentId, {
      isArchived: false,
      archivedAt: undefined,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Toggle assistant active status
export const toggleActive = mutation({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) {
      throw new Error("Assistant not found");
    }

    await ctx.db.patch(args.assistantId, {
      isActive: !assistant.isActive,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Update assistant voice configuration
export const updateVoiceConfig = mutation({
  args: {
    assistantId: v.id("assistants"),
    voiceConfig: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assistantId, {
      voiceConfig: args.voiceConfig,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Get assistant manifest for PWA
export const getManifest = query({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) return null;

    return {
      name: `${assistant.name} - AI Assistant`,
      short_name: assistant.name,
      description: `${assistant.type} AI assistant for ${assistant.description}`,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#3b82f6",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    };
  },
});

// Get assistant configuration for embedding
export const getConfig = query({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) return null;

    return {
      id: assistant._id,
      name: assistant.name,
      type: assistant.type,
      description: assistant.description,
      customInstructions: assistant.customInstructions,
      voiceEnabled: assistant.voiceEnabled,
      wakeWord: assistant.wakeWord,
      voiceConfig: assistant.voiceConfig,
      isActive: assistant.isActive,
      createdAt: assistant.createdAt,
      updatedAt: assistant.updatedAt,
    };
  },
});

// Update assistant configuration
export const updateConfig = mutation({
  args: {
    assistantId: v.id("assistants"),
    config: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      customInstructions: v.optional(v.string()),
      voiceEnabled: v.optional(v.boolean()),
      wakeWord: v.optional(v.string()),
      voiceConfig: v.optional(v.any()),
      isActive: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assistantId, {
      ...args.config,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Get published assistant configuration
export const getPublishedConfig = query({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant || !assistant.isActive) return null;

    return {
      id: assistant._id,
      slug: assistant.name.toLowerCase().replace(/\s+/g, "-"),
      publishedAt: assistant.updatedAt,
      allowedOrigins: ["*"],
      config: {
        name: assistant.name,
        description: assistant.description,
        customInstructions: assistant.customInstructions,
        voiceEnabled: assistant.voiceEnabled,
        wakeWord: assistant.wakeWord,
        voiceConfig: assistant.voiceConfig,
      },
    };
  },
});

// Get published agent (alias for getPublishedConfig for compatibility)
export const getPublishedAgent = query({
  args: { agentId: v.id("assistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.agentId);
    if (!assistant || !assistant.isActive) return null;

    return {
      id: assistant._id,
      slug: assistant.name.toLowerCase().replace(/\s+/g, "-"),
      publishedAt: assistant.updatedAt,
      allowedOrigins: ["*"],
      config: {
        name: assistant.name,
        description: assistant.description,
        customInstructions: assistant.customInstructions,
        voiceEnabled: assistant.voiceEnabled,
        wakeWord: assistant.wakeWord,
        voiceConfig: assistant.voiceConfig,
      },
    };
  },
});

// Update allowed origins for embedding (placeholder for compatibility)
export const updateAllowedOrigins = mutation({
  args: {
    assistantId: v.id("assistants"),
    origins: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Note: allowedOrigins field removed from new schema
    // This function is kept for compatibility but no longer updates the database
    return { success: true, message: "allowedOrigins field removed from new schema" };
  },
});

// Migration function to update existing assistants
export const migrateAssistants = mutation({
  args: {},
  handler: async (ctx) => {
    const assistants = await ctx.db.query("assistants").collect();
    
    for (const assistant of assistants) {
      const updates: any = {};
      
      if (!assistant.createdAt) {
        updates.createdAt = new Date().toISOString();
      }
      
      if (!assistant.updatedAt) {
        updates.updatedAt = new Date().toISOString();
      }
      
      if (!assistant.voiceConfig) {
        updates.voiceConfig = DEFAULT_VOICE_PIPELINE_CONFIG;
      }
      
      if (assistant.isActive === undefined) {
        updates.isActive = true;
      }

      if (assistant.isArchived === undefined) {
        updates.isArchived = false;
      }
      
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(assistant._id, updates);
      }
    }
    
    return { migrated: assistants.length };
  },
});

// Get usage data for a user
export const getUserUsage = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Get all usage for the user first
    const allUsage = await ctx.db
      .query("usageLedger")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter current month usage in JavaScript
    const currentMonthUsage = allUsage.filter(item => {
      const usageDate = new Date(item.occurredAt);
      return usageDate.getMonth() === currentMonth && usageDate.getFullYear() === currentYear;
    });

    // Filter last month usage in JavaScript
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const lastMonthUsage = allUsage.filter(item => {
      const usageDate = new Date(item.occurredAt);
      return usageDate.getMonth() === lastMonth && usageDate.getFullYear() === lastMonthYear;
    });

    // Calculate totals by category
    const calculateTotals = (usageData: any[]) => {
      const totals = {
        voice_minutes: 0,
        email_sends: 0,
        rag_queries: 0,
        web_searches: 0,
        calendar_events: 0
      };
      
      usageData.forEach(item => {
        if (item.category in totals) {
          totals[item.category as keyof typeof totals] += item.amount;
        }
      });
      
      return totals;
    };

    const currentTotals = calculateTotals(currentMonthUsage);
    const lastTotals = calculateTotals(lastMonthUsage);

    // Calculate costs (this would integrate with your billing system)
    const calculateCosts = (totals: any) => {
      // Placeholder cost calculation - replace with your actual pricing
      const costs = {
        voice_minutes: totals.voice_minutes * 0.10, // $0.10 per minute
        email_sends: totals.email_sends * 0.01,     // $0.01 per email
        rag_queries: totals.rag_queries * 0.001,    // $0.001 per query
        web_searches: totals.web_searches * 0.005,  // $0.005 per search
        calendar_events: totals.calendar_events * 0.02 // $0.02 per event
      };
      
      return {
        total: Object.values(costs).reduce((sum, cost) => sum + cost, 0),
        breakdown: costs
      };
    };

    const currentCosts = calculateCosts(currentTotals);
    const lastCosts = calculateCosts(lastTotals);

    return {
      currentMonth: {
        calls: currentTotals.voice_minutes,
        messages: currentTotals.email_sends,
        aiMinutes: currentTotals.voice_minutes,
        cost: currentCosts.total,
        breakdown: currentCosts.breakdown
      },
      lastMonth: {
        calls: lastTotals.voice_minutes,
        messages: lastTotals.email_sends,
        aiMinutes: lastTotals.voice_minutes,
        cost: lastCosts.total,
        breakdown: lastCosts.breakdown
      },
      limits: {
        calls: 1000,
        messages: 5000,
        aiMinutes: 50,
        cost: 100
      },
      usageHistory: currentMonthUsage.map(item => ({
        category: item.category,
        amount: item.amount,
        unit: item.unit,
        occurredAt: item.occurredAt,
        metadata: item.metadata
      }))
    };
  },
});

// Aliases for compatibility
export const getUserAssistants = getUserAgents;
export const getById = get;
