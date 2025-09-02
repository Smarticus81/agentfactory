import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Initialize usage counters for a new user
export const initializeCounters = mutation({
  args: {
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("pro_plus"), v.literal("premium"))
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const categories = ["voice_minutes", "email_sends", "rag_queries", "web_searches", "calendar_events"];
    
    // Initialize counters for each category
    for (const category of categories) {
      await ctx.db.insert("usageLedger", {
        userId: args.userId,
        category: category as any,
        unit: getUnitForCategory(category),
        amount: 0,
        occurredAt: now,
        sessionId: `init-${args.userId}`,
        metadata: { type: "initialization", plan: args.plan }
      });
    }
    
    return { success: true, initialized: categories.length };
  }
});

// Record usage
export const recordUsage = mutation({
  args: {
    userId: v.string(),
    category: v.union(v.literal("voice_minutes"), v.literal("email_sends"), v.literal("rag_queries"), v.literal("web_searches"), v.literal("calendar_events")),
    amount: v.number(),
    sessionId: v.optional(v.string()),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("usageLedger", {
      userId: args.userId,
      category: args.category,
      unit: getUnitForCategory(args.category),
      amount: args.amount,
      occurredAt: new Date().toISOString(),
      sessionId: args.sessionId,
      metadata: args.metadata
    });
  }
});

// Get usage summary for user
export const getUserUsage = query({
  args: {
    userId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("usageLedger")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.startDate && args.endDate) {
      query = query.filter((q) => 
        q.and(
          q.gte(q.field("occurredAt"), args.startDate!),
          q.lte(q.field("occurredAt"), args.endDate!)
        )
      );
    }

    const usage = await query.collect();
    
    // Aggregate by category
    const summary = usage.reduce((acc, record) => {
      if (!acc[record.category]) {
        acc[record.category] = {
          total: 0,
          unit: record.unit,
          count: 0
        };
      }
      acc[record.category].total += record.amount;
      acc[record.category].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return {
      summary,
      details: usage,
      period: {
        start: args.startDate || 'all-time',
        end: args.endDate || 'now'
      }
    };
  }
});

// Get current month usage
export const getCurrentMonthUsage = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    return await ctx.db
      .query("usageLedger")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("occurredAt"), startOfMonth),
          q.lte(q.field("occurredAt"), endOfMonth)
        )
      )
      .collect();
  }
});

// Get usage by category
export const getUsageByCategory = query({
  args: {
    userId: v.string(),
    category: v.union(v.literal("voice_minutes"), v.literal("email_sends"), v.literal("rag_queries"), v.literal("web_searches"), v.literal("calendar_events")),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("usageLedger")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  }
});

// Check if user has exceeded limits
export const checkUsageLimits = query({
  args: {
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("pro_plus"), v.literal("premium"))
  },
  handler: async (ctx, args) => {
    const currentUsage = await ctx.db
      .query("usageLedger")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const limits = getPlanLimits(args.plan);
    const usage = currentUsage.reduce((acc, record) => {
      if (!acc[record.category]) acc[record.category] = 0;
      acc[record.category] += record.amount;
      return acc;
    }, {} as Record<string, number>);

    const status = Object.entries(limits).map(([category, limit]) => ({
      category,
      used: usage[category] || 0,
      limit,
      percentage: ((usage[category] || 0) / limit) * 100,
      exceeded: (usage[category] || 0) >= limit
    }));

    return {
      overall: status.some(s => s.exceeded),
      categories: status
    };
  }
});

// Helper functions
function getUnitForCategory(category: string): string {
  switch (category) {
    case "voice_minutes": return "minutes";
    case "email_sends": return "count";
    case "rag_queries": return "count";
    case "web_searches": return "count";
    case "calendar_events": return "count";
    default: return "count";
  }
}

function getPlanLimits(plan: string): Record<string, number> {
  switch (plan) {
    case "free":
      return {
        voice_minutes: 30,
        email_sends: 10,
        rag_queries: 50,
        web_searches: 20,
        calendar_events: 25
      };
    case "pro":
      return {
        voice_minutes: 300,
        email_sends: 100,
        rag_queries: 500,
        web_searches: 200,
        calendar_events: 250
      };
    case "pro_plus":
      return {
        voice_minutes: 1000,
        email_sends: 500,
        rag_queries: 2000,
        web_searches: 1000,
        calendar_events: 1000
      };
    case "premium":
      return {
        voice_minutes: -1, // unlimited
        email_sends: -1,
        rag_queries: -1,
        web_searches: -1,
        calendar_events: -1
      };
    default:
      return getPlanLimits("free");
  }
}
