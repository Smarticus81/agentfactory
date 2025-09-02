import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Family member management for Family Assistant
export const addMember = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    role: v.union(v.literal("child"), v.literal("spouse"), v.literal("parent"), v.literal("other")),
    contactRef: v.optional(v.string()),
    calendarRefs: v.array(v.string()),
    color: v.optional(v.string()),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    return await ctx.db.insert("familyMembers", {
      userId: args.userId,
      name: args.name,
      role: args.role,
      contactRef: args.contactRef,
      calendarRefs: args.calendarRefs,
      color: args.color,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now
    });
  }
});

export const createFamilyMember = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    role: v.union(v.literal("child"), v.literal("spouse"), v.literal("parent"), v.literal("other")),
    contactRef: v.optional(v.string()),
    calendarRefs: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const memberId = await ctx.db.insert("familyMembers", {
      userId: args.userId,
      name: args.name,
      role: args.role,
      contactRef: args.contactRef,
      calendarRefs: args.calendarRefs || [],
      color: args.color,
      metadata: args.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { memberId };
  },
});

export const getFamilyMembers = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const updateFamilyMember = mutation({
  args: {
    memberId: v.id("familyMembers"),
    userId: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("child"), v.literal("spouse"), v.literal("parent"), v.literal("other"))),
    contactRef: v.optional(v.string()),
    calendarRefs: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.userId !== args.userId) {
      throw new Error("Family member not found or access denied");
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.role !== undefined) updates.role = args.role;
    if (args.contactRef !== undefined) updates.contactRef = args.contactRef;
    if (args.calendarRefs !== undefined) updates.calendarRefs = args.calendarRefs;
    if (args.color !== undefined) updates.color = args.color;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.memberId, updates);
    return { success: true };
  },
});

export const deleteFamilyMember = mutation({
  args: {
    memberId: v.id("familyMembers"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.userId !== args.userId) {
      throw new Error("Family member not found or access denied");
    }

    await ctx.db.delete(args.memberId);
    return { success: true };
  },
});

// Family calendar coordination
export const getFamilySchedule = query({
  args: { 
    userId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("startAt"), args.startDate),
          q.lte(q.field("startAt"), args.endDate)
        )
      )
      .collect();

    const familyMembers = await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      events,
      familyMembers,
      schedule: events.map(event => ({
        ...event,
        assignedMember: familyMembers.find(member => 
          event.childRef === member.name || event.attendees.includes(member.name)
        )
      }))
    };
  },
});
