import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Increase body size limit specifically for this route to handle large files
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // Set limit to 100MB
    },
  },
};

// POST /api/upload - Upload a file to Cloudinary
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request as FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validate resource type - must be one of auto/image/video/raw
    const resourceTypeInput = formData.get('resourceType') as string || 'auto';
    const resourceType = (['auto', 'image', 'video', 'raw'].includes(resourceTypeInput)) 
      ? resourceTypeInput as 'auto' | 'image' | 'video' | 'raw'
      : 'auto';
      
    const uploadPreset = formData.get('uploadPreset') as string || 'podcast_uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer for Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          upload_preset: uploadPreset,
          chunk_size: 6000000, // 6MB chunks
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Upload the buffer to Cloudinary through the stream
      uploadStream.end(buffer);
    });

    // Return the upload result
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
} 