import { NextRequest, NextResponse } from 'next/server';
import { convex } from '@/lib/convex';
import { api } from '../../../../convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agentId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !agentId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, agentId, userId' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'application/json'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please use PDF, TXT, DOC, DOCX, MD, or JSON files.' },
        { status: 400 }
      );
    }

    // Extract text content from file
    let textContent = '';
    try {
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        textContent = await file.text();
      } else if (file.type === 'application/json') {
        const jsonContent = await file.text();
        const parsed = JSON.parse(jsonContent);
        textContent = JSON.stringify(parsed, null, 2);
      } else if (file.type === 'application/pdf') {
        // For PDF, we'll need a PDF parsing library
        // For now, return an error asking user to convert to text
        return NextResponse.json(
          { error: 'PDF parsing not yet implemented. Please convert to TXT or MD format.' },
          { status: 400 }
        );
      } else if (file.type.includes('word')) {
        // For Word docs, we'll need a document parsing library
        // For now, return an error asking user to convert to text
        return NextResponse.json(
          { error: 'Word document parsing not yet implemented. Please convert to TXT or MD format.' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to extract text from file' },
        { status: 400 }
      );
    }

    if (!textContent.trim()) {
      return NextResponse.json(
        { error: 'File appears to be empty or could not extract text content' },
        { status: 400 }
      );
    }

    // Create document chunks for RAG
    const chunks = createTextChunks(textContent);
    
    // Generate embeddings (placeholder for now)
    const embeddings = generatePlaceholderEmbeddings(textContent);

    // Store in Convex knowledge base
    try {
      const knowledgeItemId = await convex.mutation(api.knowledge.createKnowledgeItem, {
        userId,
        sourceType: 'document',
        uri: `agent://${agentId}/documents/${file.name}`,
        title: file.name,
        content: textContent,
        chunks,
        embeddings,
        tags: [agentId, 'uploaded_document', file.type.split('/')[1]],
        metadata: {
          agentId,
          filename: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Return document info
      const document = {
        id: knowledgeItemId,
        filename: file.name,
        size: file.size,
        type: file.type,
        agentId,
        hasEmbeddings: true,
        status: 'processed',
        uploadedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        document,
        message: `Document "${file.name}" uploaded and processed successfully`,
      });

    } catch (convexError) {
      console.error('Error storing document in Convex:', convexError);
      return NextResponse.json(
        { error: 'Failed to store document in knowledge base' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing document upload:', error);
    return NextResponse.json(
      { error: 'Failed to process document upload' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get documents from knowledge base
    const knowledgeItems = await convex.query(api.knowledge.getKnowledgeItems, {
      userId,
      sourceType: 'document',
      searchQuery: agentId ? undefined : undefined,
      tags: agentId ? [agentId] : undefined,
    });

    // Format for frontend
    const documents = knowledgeItems.map((item: any) => ({
      id: item._id,
      filename: item.metadata?.filename || item.title,
      size: item.metadata?.fileSize || 0,
      type: item.metadata?.fileType || 'text/plain',
      agentId: item.metadata?.agentId || '',
      hasEmbeddings: true,
      status: 'processed',
      uploadedAt: item.createdAt,
    }));

    return NextResponse.json({
      success: true,
      documents,
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');

    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'documentId and userId are required' },
        { status: 400 }
      );
    }

    // Delete from knowledge base
    await convex.mutation(api.knowledge.deleteKnowledgeItem, {
      knowledgeItemId: documentId as any,
      userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

// Helper function to create text chunks for RAG
function createTextChunks(text: string): string[] {
  // Simple sentence-based chunking
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  const maxChunkLength = 500; // Characters per chunk

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence.trim();
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text]; // Fallback to full text if no chunks
}

// Placeholder embedding generation (in production, use OpenAI embeddings API)
function generatePlaceholderEmbeddings(text: string): number[] {
  // Generate consistent embeddings based on text content
  const hash = simpleHash(text);
  const embeddings: number[] = [];
  const size = 1536; // OpenAI embedding size

  for (let i = 0; i < size; i++) {
    embeddings.push((Math.sin(hash + i) + 1) / 2); // Normalize to 0-1
  }

  return embeddings;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
