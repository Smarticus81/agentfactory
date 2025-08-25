import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store document metadata and embeddings
export const storeDocument = mutation({
  args: {
    userId: v.string(),
    agentId: v.optional(v.string()),
    filename: v.string(),
    originalName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    textContent: v.string(),
    embeddings: v.array(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const documentId = await ctx.db.insert("documents", {
      ...args,
      uploadedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      status: "ready" as const,
    });
    
    return documentId;
  },
});

// Get documents for a user/agent
export const getDocuments = query({
  args: {
    userId: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let documents;
    
    if (args.agentId) {
      // Get documents for specific agent
      documents = await ctx.db
        .query("documents")
        .withIndex("by_user_agent", (q) => 
          q.eq("userId", args.userId).eq("agentId", args.agentId)
        )
        .order("desc")
        .collect();
    } else {
      // Get all documents for user
      documents = await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();
    }
    
    return documents;
  },
});

// Search documents by similarity (for RAG)
export const searchDocuments = query({
  args: {
    userId: v.string(),
    agentId: v.optional(v.string()),
    queryEmbedding: v.array(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    
    // Get documents for the user/agent
    let documents;
    if (args.agentId) {
      documents = await ctx.db
        .query("documents")
        .withIndex("by_user_agent", (q) => 
          q.eq("userId", args.userId).eq("agentId", args.agentId)
        )
        .filter((q) => q.eq(q.field("status"), "ready"))
        .collect();
    } else {
      documents = await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("status"), "ready"))
        .collect();
    }
    
    // Calculate cosine similarity and sort
    const documentsWithSimilarity = documents.map(doc => {
      // Ensure same length by trimming/padding the shorter vector as a defensive measure
      const a = args.queryEmbedding;
      const b = doc.embeddings || [];
      const len = Math.min(a.length, b.length);
      const aTrim = len > 0 ? a.slice(0, len) : a;
      const bTrim = len > 0 ? b.slice(0, len) : b;
      const similarity = cosineSimilarity(aTrim, bTrim);
      return { ...doc, similarity };
    });
    
    // Sort by similarity and return top results
    return documentsWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  },
});

// Delete a document
export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const document = await ctx.db.get(args.documentId);
    if (!document || document.userId !== args.userId) {
      throw new Error("Document not found or access denied");
    }
    
    await ctx.db.delete(args.documentId);
    return { success: true };
  },
});

// Update document status
export const updateDocumentStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(v.literal("processing"), v.literal("ready"), v.literal("error")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: args.status,
      errorMessage: args.errorMessage,
      processedAt: new Date().toISOString(),
    });
    
    return { success: true };
  },
});

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}
