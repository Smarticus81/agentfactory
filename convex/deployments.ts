import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get deployments by user
export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deployments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  }
});

// Update deployment status
export const updateStatus = mutation({
  args: {
    deploymentId: v.id("deployments"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("stopped"))
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.deploymentId, {
      status: args.status,
      updatedAt: new Date().toISOString()
    });
  }
});

// Delete deployment
export const deleteDeployment = mutation({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.deploymentId);
  }
});

// Create a new deployment
export const create = mutation({
  args: {
    assistantId: v.id("assistants"),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("stopped")),
    settings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const deployment = {
      assistantId: args.assistantId,
      userId: args.userId as Id<"users">,
      name: args.name,
      description: args.description || "",
      status: args.status,
      settings: args.settings || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const deploymentId = await ctx.db.insert("deployments", deployment);

    // Update the assistant to mark it as deployed
    await ctx.db.patch(args.assistantId, {
      isDeployed: true,
      updatedAt: new Date().toISOString(),
    });

    return { deploymentId };
  },
});

// Get deployments for a user
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deployments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as Id<"users">))
      .collect();
  },
});

// Get deployments for a specific assistant
export const getByAssistant = query({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deployments")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
  },
});

// Get a specific deployment
export const get = query({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deploymentId);
  },
});

// Update deployment settings
export const updateSettings = mutation({
  args: {
    deploymentId: v.id("deployments"),
    settings: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deploymentId, {
      settings: args.settings,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Delete a deployment
export const remove = mutation({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, args) => {
    const deployment = await ctx.db.get(args.deploymentId);
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    // Update the assistant to mark it as not deployed
    await ctx.db.patch(deployment.assistantId, {
      isDeployed: false,
      updatedAt: new Date().toISOString(),
    });

    await ctx.db.delete(args.deploymentId);
    return { success: true };
  },
});

// Get deployment analytics
export const getAnalytics = query({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, args) => {
    const deployment = await ctx.db.get(args.deploymentId);
    if (!deployment) return null;

    // Get voice sessions for this deployment
    const sessions = await ctx.db
      .query("voiceSessions")
      .withIndex("by_assistant", (q) => q.eq("assistantId", deployment.assistantId))
      .collect();

    // Get action logs for this deployment
    const actions = await ctx.db
      .query("actionLog")
      .withIndex("by_user", (q) => q.eq("userId", deployment.userId))
      .collect();

    const successfulActions = actions.filter(a => a.requiresConfirmation && a.confirmedBy).length;
    const totalActions = actions.length;

    return {
      deploymentId: args.deploymentId,
      status: deployment.status,
      sessions: {
        total: sessions.length,
        active: sessions.filter(s => s.status === "active").length,
        completed: sessions.filter(s => s.status === "ended").length,
      },
      actions: {
        total: totalActions,
        successful: successfulActions,
        pending: totalActions - successfulActions,
      },
      lastActivity: deployment.updatedAt,
    };
  },
});

// Aliases for compatibility
export const getUserDeployments = list;
export const getById = get;
