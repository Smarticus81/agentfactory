import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create or update user profile
export const createOrUpdateUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    authProvider: v.union(v.literal("google"), v.literal("microsoft"), v.literal("email")),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("pro_plus"), v.literal("premium")),
    settings: v.any()
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const now = new Date().toISOString();

    if (existingUser) {
      // Update existing user
      return await ctx.db.patch(existingUser._id, {
        name: args.name,
        authProvider: args.authProvider,
        plan: args.plan,
        settings: args.settings,
        updatedAt: now
      });
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        authProvider: args.authProvider,
        plan: args.plan,
        settings: args.settings,
        createdAt: now,
        updatedAt: now
      });
    }
  }
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userId))
      .first();
  }
});

// Update user plan
export const updateUserPlan = mutation({
  args: {
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("pro_plus"), v.literal("premium"))
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.patch(user._id, {
      plan: args.plan,
      updatedAt: new Date().toISOString()
    });
  }
});

// Update user settings
export const updateUserSettings = mutation({
  args: {
    userId: v.string(),
    settings: v.any()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updatedSettings = { ...user.settings, ...args.settings };

    return await ctx.db.patch(user._id, {
      settings: updatedSettings,
      updatedAt: new Date().toISOString()
    });
  }
});
