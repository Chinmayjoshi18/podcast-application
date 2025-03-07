import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Temporary storage directory for chunks
const CHUNKS_DIR = process.env.TEMP_CHUNKS_DIR || './temp-uploads';

/**
 * Upload a single chunk
 * POST /api/uploads/chunk
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the multipart form data
    const formData = await request.formData();
    
    // Extract relevant data from the form
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = formData.get('chunkIndex') as string;
    const totalChunks = formData.get('totalChunks') as string;
    const chunkFile = formData.get('chunk') as File;
    
    if (!uploadId || !chunkIndex || !totalChunks || !chunkFile) {
      return NextResponse.json(
        { error: 'Missing required fields: uploadId, chunkIndex, totalChunks, chunk' },
        { status: 400 }
      );
    }

    // Create user-specific chunk directory to prevent conflicts
    const userId = session.user.id;
    const userUploadDir = join(CHUNKS_DIR, userId, uploadId);
    
    try {
      // Ensure directory exists
      await mkdir(userUploadDir, { recursive: true });
      
      // Write chunk to a temporary file
      const chunkPath = join(userUploadDir, `chunk_${chunkIndex}`);
      const chunkBuffer = Buffer.from(await chunkFile.arrayBuffer());
      await writeFile(chunkPath, chunkBuffer);
      
      return NextResponse.json({
        success: true,
        chunkIndex,
        message: `Chunk ${chunkIndex} of ${totalChunks} uploaded successfully`,
      });
    } catch (error) {
      console.error(`Error saving chunk ${chunkIndex}:`, error);
      return NextResponse.json(
        { error: `Failed to save chunk ${chunkIndex}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return NextResponse.json(
      { error: 'Failed to process chunk upload' },
      { status: 500 }
    );
  }
} 