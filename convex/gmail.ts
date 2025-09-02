import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Gmail integration functions for voice-commanded email management

// Send email via voice command
export const sendEmail = mutation({
  args: {
    userId: v.string(),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    agentId: v.optional(v.id("assistants")),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    // Store email in database for tracking
    const emailId = await ctx.db.insert("emails", {
      userId: args.userId,
      agentId: args.agentId,
      type: "sent",
      to: args.to,
      cc: args.cc || "",
      bcc: args.bcc || "",
      subject: args.subject,
      body: args.body,
      status: "pending",
      createdAt: timestamp,
    });

    try {
      // This will be called by the API route after successful Gmail API send
      // The actual Gmail API integration happens in the API route
      console.log('📧 Voice Command: Email queued for sending', {
        to: args.to,
        subject: args.subject,
        from: args.userId
      });

      // Status will be updated by the API route after successful send
      return {
        success: true,
        emailId,
        message: `Email queued for sending to ${args.to}`,
      };
    } catch (error: any) {
      // Update status to failed
      await ctx.db.patch(emailId, {
        status: "failed",
        error: error.message,
        updatedAt: timestamp,
      });

      throw new Error(`Failed to queue email: ${error.message}`);
    }
  },
});

// Get recent emails for voice queries like "what are my recent emails?"
export const getRecentEmails = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const emails = await ctx.db
      .query("emails")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .take(limit);

    return emails.map(email => ({
      id: email._id,
      type: email.type,
      to: email.to,
      from: email.from || "You",
      subject: email.subject,
      preview: email.body.substring(0, 100) + "...",
      status: email.status,
      createdAt: email.createdAt,
      sentAt: email.sentAt,
    }));
  },
});

// Search emails by voice command
export const searchEmails = query({
  args: {
    userId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const emails = await ctx.db
      .query("emails")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.or(
            // Using text search instead of like since like doesn't exist
            q.eq(q.field("subject"), args.query),
            q.eq(q.field("to"), args.query)
          )
        )
      )
      .order("desc")
      .take(limit);

    return emails.map(email => ({
      id: email._id,
      type: email.type,
      to: email.to,
      from: email.from || "You",
      subject: email.subject,
      preview: email.body.substring(0, 150) + "...",
      status: email.status,
      createdAt: email.createdAt,
      sentAt: email.sentAt,
    }));
  },
});

// Draft email for later sending
export const draftEmail = mutation({
  args: {
    userId: v.string(),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    agentId: v.optional(v.id("assistants")),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    
    const draftId = await ctx.db.insert("emails", {
      userId: args.userId,
      agentId: args.agentId,
      type: "draft",
      to: args.to,
      cc: args.cc || "",
      bcc: args.bcc || "",
      subject: args.subject,
      body: args.body,
      status: "draft",
      createdAt: timestamp,
    });

    return {
      success: true,
      draftId,
      message: `Email draft saved`,
    };
  },
});

// Get user's drafts
export const getDrafts = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const drafts = await ctx.db
      .query("emails")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("status"), "draft")
        )
      )
      .order("desc")
      .collect();

    return drafts.map(draft => ({
      id: draft._id,
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
      createdAt: draft.createdAt,
    }));
  },
});

// Send a draft
export const sendDraft = mutation({
  args: {
    userId: v.string(),
    draftId: v.id("emails"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);

    if (!draft || draft.userId !== args.userId) {
      throw new Error("Draft not found");
    }

    if (draft.status !== "draft") {
      throw new Error("Email is not a draft");
    }

    try {
      // This will be called by the API route after successful Gmail API send
      console.log('📧 Voice Command: Sending draft email', {
        to: draft.to,
        subject: draft.subject,
      });

      const timestamp = Date.now();
      await ctx.db.patch(args.draftId, {
        status: "sent",
        sentAt: timestamp,
        updatedAt: timestamp,
      });

      return {
        success: true,
        message: `Draft sent to ${draft.to}`,
      };
    } catch (error: any) {
      await ctx.db.patch(args.draftId, {
        status: "failed",
        error: error.message,
        updatedAt: Date.now(),
      });

      throw new Error(`Failed to send draft: ${error.message}`);
    }
  },
});
