import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables from the server
cloudinary.config({
  cloud_name: "dbrso3dnr",
  api_key: "583278933339254",
  api_secret: "nqTz-rpPOodt5hbCCejYjLrcO8A"
});

// This configuration explicitly disables Next.js's default body parser
// to handle large file uploads ourselves
export const config = {
  api: {
    bodyParser: false,
    // Increase the response limit to handle large files
    responseLimit: '100mb',
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

    // Log file size for debugging
    const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
    console.log(`Handling upload of ${file.name} (${fileSizeMB}MB) as ${fileType}`);

    // For very large files, use direct unsigned upload to Cloudinary
    // This bypasses our server size limits
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({
        success: true,
        // Return instructions for client-side upload
        directUpload: true,
        uploadParams: {
          cloudName: "dbrso3dnr",
          uploadPreset: "podcast_uploads",
          folder: folder,
          resourceType: isAudio ? 'video' : 'auto',
        }
      });
    }

    // For smaller files, we can handle the upload server-side
    try {
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Generate upload options
      const uploadOptions: any = {
        folder: folder,
        resource_type: isAudio ? 'video' : 'auto', // Cloudinary uses 'video' for audio
        use_filename: true,
        unique_filename: true,
        public_id: `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`,
      };
      
      // For audio files, add optimized settings
      if (isAudio) {
        uploadOptions.audio_codec = 'aac';
        uploadOptions.bit_rate = '128k';
      }
      
      // Upload to Cloudinary using buffer
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
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
        
        // Send buffer to upload stream
        uploadStream.end(buffer);
      });
      
      // Return success with URL
      return NextResponse.json({
        success: true,
        directUpload: false,
        url: (uploadResult as any).secure_url,
        publicId: (uploadResult as any).public_id,
        ...(isAudio && { duration: (uploadResult as any).duration })
      });
    } catch (error) {
      console.error('Server-side upload failed:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Server-side upload failed',
        details: (error as Error).message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling upload request:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Upload failed',
      details: (error as Error).message 
    }, { status: 500 });
  }
} 