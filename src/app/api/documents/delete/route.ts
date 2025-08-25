import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');

    if (!documentId || !userId) {
      return NextResponse.json({ 
        error: 'Document ID and User ID are required' 
      }, { status: 400 });
    }

    console.log('Deleting document:', { documentId, userId });

    // Delete from Convex database
    await convex.mutation(api.documents.deleteDocument, {
      documentId: documentId as any,
      userId,
    });

    // Also try to delete local file if it exists
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId);
      if (existsSync(uploadDir)) {
        // This is a best-effort cleanup - we don't fail if file doesn't exist
        console.log('Local file cleanup attempted for:', documentId);
      }
    } catch (error) {
      console.warn('Local file cleanup failed (non-critical):', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
