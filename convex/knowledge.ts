import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Knowledge item management for RAG system
export const createKnowledgeItem = mutation({
  args: {
    userId: v.string(),
    sourceType: v.union(v.literal("email"), v.literal("document"), v.literal("calendar"), v.literal("web_snapshot"), v.literal("note")),
    uri: v.string(),
    title: v.string(),
    content: v.string(),
    chunks: v.array(v.string()),
    embeddings: v.array(v.number()),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const knowledgeItemId = await ctx.db.insert("knowledgeItems", {
      userId: args.userId,
      sourceType: args.sourceType,
      uri: args.uri,
      title: args.title,
      content: args.content,
      chunks: args.chunks,
      embeddings: args.embeddings,
      tags: args.tags || [],
      metadata: args.metadata,
      lastRefreshAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return { knowledgeItemId };
  },
});

export const getKnowledgeItems = query({
  args: {
    userId: v.string(),
    sourceType: v.optional(v.union(v.literal("email"), v.literal("document"), v.literal("calendar"), v.literal("web_snapshot"), v.literal("note"))),
    searchQuery: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("knowledgeItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    let items = await query.collect();

    // Filter by sourceType if provided
    if (args.sourceType) {
      items = items.filter(item => item.sourceType === args.sourceType);
    }

    // Search functionality
    if (args.searchQuery) {
      const searchLower = args.searchQuery.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.content.toLowerCase().includes(searchLower) ||
        item.uri.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by tags if provided
    if (args.tags && args.tags.length > 0) {
      items = items.filter(item => 
        args.tags!.some(tag => item.tags.includes(tag))
      );
    }

    // Sort by creation date (newest first)
    items.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply limit if provided
    if (args.limit) {
      items = items.slice(0, args.limit);
    }

    return items;
  },
});

export const updateKnowledgeItem = mutation({
  args: {
    knowledgeItemId: v.id("knowledgeItems"),
    userId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    chunks: v.optional(v.array(v.string())),
    embeddings: v.optional(v.array(v.number())),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.knowledgeItemId);
    if (!item || item.userId !== args.userId) {
      throw new Error("Knowledge item not found or access denied");
    }

    const updates: any = {
      lastRefreshAt: new Date().toISOString(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.chunks !== undefined) updates.chunks = args.chunks;
    if (args.embeddings !== undefined) updates.embeddings = args.embeddings;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.knowledgeItemId, updates);
    return { success: true };
  },
});

export const deleteKnowledgeItem = mutation({
  args: {
    knowledgeItemId: v.id("knowledgeItems"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.knowledgeItemId);
    if (!item || item.userId !== args.userId) {
      throw new Error("Knowledge item not found or access denied");
    }

    await ctx.db.delete(args.knowledgeItemId);
    return { success: true };
  },
});

// Bulk operations for knowledge management
export const bulkImportKnowledgeItems = mutation({
  args: {
    userId: v.string(),
    items: v.array(v.object({
      sourceType: v.union(v.literal("email"), v.literal("document"), v.literal("calendar"), v.literal("web_snapshot"), v.literal("note")),
      uri: v.string(),
      title: v.string(),
      content: v.string(),
      chunks: v.array(v.string()),
      embeddings: v.array(v.number()),
      tags: v.optional(v.array(v.string())),
      metadata: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const insertedIds = [];

    for (const item of args.items) {
      const knowledgeItemId = await ctx.db.insert("knowledgeItems", {
        userId: args.userId,
        sourceType: item.sourceType,
        uri: item.uri,
        title: item.title,
        content: item.content,
        chunks: item.chunks,
        embeddings: item.embeddings,
        tags: item.tags || [],
        metadata: item.metadata,
        lastRefreshAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      insertedIds.push(knowledgeItemId);
    }

    return { insertedCount: insertedIds.length, insertedIds };
  },
});

// Student Helper specific knowledge functions
export const createStudyNote = mutation({
  args: {
    userId: v.string(),
    subject: v.string(),
    topic: v.string(),
    content: v.string(),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
    studyDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const uri = `study://${args.subject}/${args.topic}/${Date.now()}`;
    
    // Simple text chunking for embeddings
    const chunks = args.content.split(/[.!?]+/).filter(chunk => chunk.trim().length > 0);
    
    // Placeholder embeddings (in real implementation, this would be generated by an embedding service)
    const embeddings = new Array(1536).fill(0).map(() => Math.random());

    const knowledgeItemId = await ctx.db.insert("knowledgeItems", {
      userId: args.userId,
      sourceType: "note",
      uri: uri,
      title: `${args.subject}: ${args.topic}`,
      content: args.content,
      chunks: chunks,
      embeddings: embeddings,
      tags: [args.subject, args.topic, "study_note"],
      metadata: {
        subject: args.subject,
        topic: args.topic,
        difficulty: args.difficulty || "medium",
        studyDate: args.studyDate || new Date().toISOString(),
      },
      lastRefreshAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return { knowledgeItemId };
  },
});

export const getStudyMaterials = query({
  args: {
    userId: v.string(),
    subject: v.optional(v.string()),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("knowledgeItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("sourceType"), "note"))
      .collect();

    // Filter by subject if provided
    if (args.subject) {
      items = items.filter(item => 
        item.tags.includes(args.subject!) ||
        (item.metadata?.subject === args.subject)
      );
    }

    // Filter by difficulty if provided
    if (args.difficulty) {
      items = items.filter(item => 
        item.metadata?.difficulty === args.difficulty
      );
    }

    // Group by subject
    const bySubject = items.reduce((acc, item) => {
      const subject = item.metadata?.subject || 'General';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      items: items.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      bySubject,
      totalCount: items.length,
    };
  },
});

// Family Assistant specific knowledge functions
export const createFamilyDocument = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.union(
      v.literal("medical"),
      v.literal("school"),
      v.literal("activities"),
      v.literal("contacts"),
      v.literal("emergency"),
      v.literal("other")
    ),
    familyMember: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const uri = `family://${args.category}/${args.familyMember || 'general'}/${Date.now()}`;
    
    // Simple text chunking for embeddings
    const chunks = args.content.split(/[.!?]+/).filter(chunk => chunk.trim().length > 0);
    
    // Placeholder embeddings
    const embeddings = new Array(1536).fill(0).map(() => Math.random());

    const knowledgeItemId = await ctx.db.insert("knowledgeItems", {
      userId: args.userId,
      sourceType: "document",
      uri: uri,
      title: args.title,
      content: args.content,
      chunks: chunks,
      embeddings: embeddings,
      tags: [args.category, "family_document"],
      metadata: {
        category: args.category,
        familyMember: args.familyMember,
      },
      lastRefreshAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return { knowledgeItemId };
  },
});

export const getFamilyDocuments = query({
  args: {
    userId: v.string(),
    category: v.optional(v.union(
      v.literal("medical"),
      v.literal("school"),
      v.literal("activities"),
      v.literal("contacts"),
      v.literal("emergency"),
      v.literal("other")
    )),
    familyMember: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("knowledgeItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("sourceType"), "document"))
      .collect();

    // Filter items that are family documents
    items = items.filter(item => 
      item.tags.includes("family_document")
    );

    // Filter by category if provided
    if (args.category) {
      items = items.filter(item => 
        item.metadata?.category === args.category
      );
    }

    // Filter by family member if provided
    if (args.familyMember) {
      items = items.filter(item => 
        item.metadata?.familyMember === args.familyMember
      );
    }

    return items.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
});

// RAG query functionality
export const queryKnowledge = query({
  args: {
    userId: v.string(),
    query: v.string(),
    sourceTypes: v.optional(v.array(v.union(v.literal("email"), v.literal("document"), v.literal("calendar"), v.literal("web_snapshot"), v.literal("note")))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("knowledgeItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by source types if provided
    if (args.sourceTypes && args.sourceTypes.length > 0) {
      items = items.filter(item => args.sourceTypes!.includes(item.sourceType));
    }

    // Simple text-based search (in real implementation, this would use vector similarity)
    const queryLower = args.query.toLowerCase();
    const relevantItems = items.filter(item => 
      item.title.toLowerCase().includes(queryLower) ||
      item.content.toLowerCase().includes(queryLower) ||
      item.chunks.some(chunk => chunk.toLowerCase().includes(queryLower)) ||
      item.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );

    // Sort by relevance (simple keyword count for now)
    relevantItems.sort((a, b) => {
      const scoreA = (a.title.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length +
                     (a.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
      const scoreB = (b.title.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length +
                     (b.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
      return scoreB - scoreA;
    });

    const limit = args.limit || 10;
    return relevantItems.slice(0, limit);
  },
});
