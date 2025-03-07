import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for tracking uploads (in a production app, use Redis or a database)
const UPLOADS_MAP = new Map();

/**
 * Initialize a multipart upload
 * POST /api/uploads/initiate
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileType, fileSize, folder = 'podcasts' } = await request.json();

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'fileName, fileType, and fileSize are required' },
        { status: 400 }
      );
    }

    // Generate a unique ID for this upload
    const uploadId = uuidv4();
    
    // Store metadata about this upload
    UPLOADS_MAP.set(uploadId, {
      fileName,
      fileType,
      fileSize,
      folder,
      userId: session.user.id,
      parts: [],
      status: 'initiated',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      uploadId,
      presignedUrls: [], // In a real implementation with S3, you would generate presigned URLs for each chunk
      message: 'Upload initiated'
    });
  } catch (error) {
    console.error('Error initiating upload:', error);
    return NextResponse.json(
      { error: 'Failed to initiate upload' },
      { status: 500 }
    );
  }
}

/**
 * Complete a multipart upload
 * POST /api/uploads/complete
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uploadId, parts } = await request.json();

    if (!uploadId || !parts) {
      return NextResponse.json(
        { error: 'uploadId and parts are required' },
        { status: 400 }
      );
    }

    // Get upload data
    const uploadData = UPLOADS_MAP.get(uploadId);
    if (!uploadData) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Check if this user owns the upload
    if (uploadData.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this upload' },
        { status: 403 }
      );
    }

    // Update upload status
    uploadData.parts = parts;
    uploadData.status = 'completed';
    uploadData.completedAt = new Date().toISOString();
    UPLOADS_MAP.set(uploadId, uploadData);

    // In a real implementation, you would trigger a cloud function to combine the parts
    // and create the final file in your storage service

    // For this demo, we're just simulating success
    return NextResponse.json({
      status: 'success',
      fileUrl: `https://example.com/podcasts/${uploadData.fileName}`, // This would be the real URL in production
      message: 'Upload completed successfully'
    });
  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}

/**
 * Get upload status
 * GET /api/uploads/:uploadId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { uploadId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uploadId } = params;
    if (!uploadId) {
      return NextResponse.json(
        { error: 'uploadId is required' },
        { status: 400 }
      );
    }

    // Get upload data
    const uploadData = UPLOADS_MAP.get(uploadId);
    if (!uploadData) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Check if this user owns the upload
    if (uploadData.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this upload' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ...uploadData,
      partsCount: uploadData.parts.length,
    });
  } catch (error) {
    console.error('Error getting upload status:', error);
    return NextResponse.json(
      { error: 'Failed to get upload status' },
      { status: 500 }
    );
  }
} 