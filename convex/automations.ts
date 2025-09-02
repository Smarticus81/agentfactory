import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new routine/automation
export const createRoutine = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    type: v.union(v.literal("morning_brief"), v.literal("inbox_sweep"), v.literal("after_school_digest"), v.literal("travel_day"), v.literal("custom")),
    schedule: v.any(), // Cron expression or trigger conditions
    isActive: v.boolean(),
    actions: v.array(v.any())
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    return await ctx.db.insert("routines", {
      userId: args.userId,
      name: args.name,
      type: args.type,
      schedule: args.schedule,
      isActive: args.isActive,
      lastRunAt: undefined,
      nextRunAt: calculateNextRun(args.schedule),
      actions: args.actions,
      createdAt: now,
      updatedAt: now
    });
  }
});

// Get user routines
export const getUserRoutines = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("routines")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  }
});

// Update routine
export const updateRoutine = mutation({
  args: {
    routineId: v.id("routines"),
    userId: v.string(),
    name: v.optional(v.string()),
    schedule: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
    actions: v.optional(v.array(v.any()))
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== args.userId) {
      throw new Error("Routine not found or access denied");
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.schedule !== undefined) {
      updates.schedule = args.schedule;
      updates.nextRunAt = calculateNextRun(args.schedule);
    }
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.actions !== undefined) updates.actions = args.actions;

    return await ctx.db.patch(args.routineId, updates);
  }
});

// Delete routine
export const deleteRoutine = mutation({
  args: {
    routineId: v.id("routines"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== args.userId) {
      throw new Error("Routine not found or access denied");
    }

    await ctx.db.delete(args.routineId);
    return { success: true };
  }
});

// Get active routines that need to run
export const getActiveRoutines = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    
    return await ctx.db
      .query("routines")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.lte(q.field("nextRunAt"), now))
      .collect();
  }
});

// Mark routine as executed
export const markRoutineExecuted = mutation({
  args: {
    routineId: v.id("routines"),
    executedAt: v.string(),
    success: v.boolean(),
    error: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }

    return await ctx.db.patch(args.routineId, {
      lastRunAt: args.executedAt,
      nextRunAt: calculateNextRun(routine.schedule),
      updatedAt: new Date().toISOString()
    });
  }
});

// Helper function to calculate next run time
function calculateNextRun(schedule: any): string {
  // Basic implementation - would need proper cron parser in production
  if (typeof schedule === 'object' && schedule.type === 'daily') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':');
      tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    return tomorrow.toISOString();
  }
  
  // Default: next hour
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1);
  return nextHour.toISOString();
}
