import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// This configuration disables the default body parser for this route
// allowing us to handle large files directly
export const config = {
  api: {
    bodyParser: false,
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
    
    // Get additional parameters
    const fileType = formData.get('fileType') as string || 'auto';
    const folder = formData.get('folder') as string || 'podcasts';
    const isAudio = fileType === 'audio';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`Starting upload of ${file.name} (${file.size} bytes) as ${fileType}`);

    // Convert file to base64 for reliable uploading
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64File = buffer.toString('base64');
    const base64FileData = `data:${file.type};base64,${base64File}`;

    // Configure upload parameters
    const uploadOptions: any = {
      folder: folder,
      resource_type: isAudio ? 'video' : 'auto', // Cloudinary uses 'video' type for audio files
      use_filename: true,
      unique_filename: true,
    };

    // For audio files add additional options
    if (isAudio) {
      uploadOptions.audio_codec = 'aac';
      uploadOptions.bit_rate = '128k';
      uploadOptions.overwrite = true;
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64FileData,
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Upload successful:', result?.public_id);
            resolve(result);
          }
        }
      );
    });

    // Return the upload result with specific fields
    return NextResponse.json({
      success: true,
      url: (result as any).secure_url,
      publicId: (result as any).public_id,
      ...(isAudio && { duration: (result as any).duration })
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      success: false,
      error: 'File upload failed',
      details: (error as Error).message 
    }, { status: 500 });
  }
} 