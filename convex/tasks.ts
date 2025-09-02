import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Task management for Personal Admin and Student Helper
export const createTask = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    dueAt: v.optional(v.string()),
    assignee: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    status: v.optional(v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled"))),
    sourceEmailId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      userId: args.userId,
      title: args.title,
      description: args.description,
      dueAt: args.dueAt,
      assignee: args.assignee,
      priority: args.priority,
      status: args.status || "pending",
      sourceEmailId: args.sourceEmailId,
      tags: args.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { taskId };
  },
});

export const getTasks = query({
  args: { 
    userId: v.string(),
    status: v.optional(v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled"))),
    assignee: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    const tasks = await query.collect();

    // Filter by status if provided
    let filteredTasks = tasks;
    if (args.status) {
      filteredTasks = tasks.filter(task => task.status === args.status);
    }

    // Filter by assignee if provided
    if (args.assignee) {
      filteredTasks = filteredTasks.filter(task => task.assignee === args.assignee);
    }

    return filteredTasks.sort((a, b) => {
      // Sort by priority and due date
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueAt: v.optional(v.string()),
    assignee: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))),
    status: v.optional(v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled"))),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== args.userId) {
      throw new Error("Task not found or access denied");
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueAt !== undefined) updates.dueAt = args.dueAt;
    if (args.assignee !== undefined) updates.assignee = args.assignee;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.status !== undefined) updates.status = args.status;
    if (args.tags !== undefined) updates.tags = args.tags;

    await ctx.db.patch(args.taskId, updates);
    return { success: true };
  },
});

export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== args.userId) {
      throw new Error("Task not found or access denied");
    }

    await ctx.db.delete(args.taskId);
    return { success: true };
  },
});

// Student-specific functions
export const createHomeworkTask = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    subject: v.string(),
    dueAt: v.string(),
    description: v.optional(v.string()),
    estimatedHours: v.optional(v.number()),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      userId: args.userId,
      title: args.title,
      description: args.description,
      dueAt: args.dueAt,
      priority: "medium",
      status: "pending",
      tags: ["homework", args.subject],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { taskId };
  },
});

export const getHomeworkTasks = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return tasks
      .filter(task => task.tags.includes("homework"))
      .sort((a, b) => {
        if (a.dueAt && b.dueAt) {
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        }
        return 0;
      });
  },
});

// Personal Admin specific functions
export const getTasksByPriority = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const activeTasks = tasks.filter(task => 
      task.status !== "completed" && task.status !== "cancelled"
    );

    return {
      urgent: activeTasks.filter(task => task.priority === "urgent"),
      high: activeTasks.filter(task => task.priority === "high"),
      medium: activeTasks.filter(task => task.priority === "medium"),
      low: activeTasks.filter(task => task.priority === "low"),
    };
  },
});

export const getOverdueTasks = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return tasks.filter(task => 
      task.dueAt && 
      task.dueAt < now && 
      task.status !== "completed" && 
      task.status !== "cancelled"
    );
  },
});
