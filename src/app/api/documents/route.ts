import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Supported file types for RAG
const SUPPORTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'application/json'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agentId') as string;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!agentId || !userId) {
      return NextResponse.json({ error: 'Agent ID and User ID are required' }, { status: 400 });
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Supported types: PDF, TXT, DOC, DOCX, MD, JSON' 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId, agentId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${originalName}`;
    const filepath = path.join(uploadDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Extract text content based on file type
    let textContent = '';
    try {
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        textContent = buffer.toString('utf-8');
      } else if (file.type === 'application/json') {
        const jsonData = JSON.parse(buffer.toString('utf-8'));
        textContent = JSON.stringify(jsonData, null, 2);
      } else if (file.type === 'application/pdf') {
        console.log('Processing PDF file...');
        const pdfData = await pdfParse(buffer);
        textContent = pdfData.text;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log('Processing DOCX file...');
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
      } else if (file.type === 'application/msword') {
        // Basic DOC support (limited)
        textContent = buffer.toString('utf-8').replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
      } else {
        // Fallback for unsupported types
        textContent = `Document: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes\nUploaded: ${new Date().toISOString()}\n\nContent extraction not supported for this file type.`;
      }
      
      // Clean and validate extracted text
      textContent = textContent.trim();
      if (textContent.length === 0) {
        textContent = `Document: ${file.name} (no text content extracted)`;
      }
      
      console.log(`Extracted ${textContent.length} characters from ${file.name}`);
    } catch (error) {
      console.error('Error extracting text content:', error);
      textContent = `Document: ${file.name}\nError: ${error instanceof Error ? error.message : 'Unknown error'}\nFallback content for RAG processing.`;
    }

    // Create embeddings for RAG
    let embeddings = null;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textContent.substring(0, 8000), // Limit to 8k chars for embedding
      });
      
      embeddings = embeddingResponse.data[0].embedding;
    } catch (error) {
      console.error('Error creating embeddings:', error);
    }

    // Store document in Convex database
    const documentId = await convex.mutation(api.documents.storeDocument, {
      userId,
      agentId,
      filename,
      originalName: file.name,
      fileType: file.type,
      fileSize: file.size,
      textContent,
      embeddings: embeddings || [],
      metadata: {
        uploadedAt: new Date().toISOString(),
        extractedLength: textContent.length,
        hasEmbeddings: !!embeddings,
      },
    });

    console.log('Document stored in database:', documentId);

    // Also store file locally for backup (optional)
    const documentMetadata = {
      id: `doc_${timestamp}`,
      filename: originalName,
      filepath: `/uploads/${userId}/${agentId}/${filename}`,
      type: file.type,
      size: file.size,
      agentId,
      userId,
      uploadedAt: new Date().toISOString(),
      textContent: textContent.substring(0, 2000), // Store first 2k chars for preview
      embeddings,
      processed: true
    };

    // Save metadata to JSON file (in production, use a proper database)
    const metadataPath = path.join(uploadDir, `${timestamp}_metadata.json`);
    await writeFile(metadataPath, JSON.stringify(documentMetadata, null, 2));

    console.log('Document uploaded successfully:', {
      filename: originalName,
      size: file.size,
      agentId,
      hasEmbeddings: !!embeddings
    });

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        processed: true,
        hasEmbeddings: !!embeddings,
        preview: textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '')
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const agentId = searchParams.get('agentId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('Getting documents for:', { userId, agentId });

    // Get documents from Convex
    const documents = await convex.query(api.documents.getDocuments, {
      userId,
      agentId: agentId || undefined,
    });

    // Format documents for response
    const formattedDocuments = documents.map(doc => ({
      id: doc._id,
      filename: doc.originalName,
      size: doc.fileSize,
      type: doc.fileType,
      uploadedAt: doc.uploadedAt,
      processed: doc.status === 'ready',
      status: doc.status,
      hasEmbeddings: doc.embeddings && doc.embeddings.length > 0,
      preview: doc.textContent.substring(0, 200) + (doc.textContent.length > 200 ? '...' : '')
    }));

    return NextResponse.json({
      success: true,
      documents: formattedDocuments
    });

  } catch (error) {
    console.error('Error getting documents:', error);
    return NextResponse.json({ 
      error: 'Failed to get documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
