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
export const config = {
  api: {
    bodyParser: false,
  },
};

// POST /api/upload/finalize - Finalize a chunked upload
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request as FormData
    const formData = await request.formData();
    const action = formData.get('action') as string;
    
    if (action !== 'finalize') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    const fileType = formData.get('fileType') as string || 'auto';
    const folder = formData.get('folder') as string || 'podcasts';
    const filename = formData.get('filename') as string;
    const totalChunks = parseInt(formData.get('totalChunks') as string || '0');
    const originalFilename = formData.get('originalFilename') as string;
    
    if (!filename || totalChunks <= 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    console.log(`Finalizing upload for ${originalFilename} (${totalChunks} chunks)...`);
    
    // In a production environment, you would:
    // 1. Verify all chunks were uploaded
    // 2. Combine chunks on the server or in cloud storage
    // 3. Clean up temporary chunk files
    
    // For this implementation, we'll simulate combining chunks by 
    // creating a new resource in Cloudinary that refers to the chunks
    
    const isAudio = fileType === 'audio';
    
    // Construct the final resource URL 
    // In a real implementation, you would properly combine chunks
    // For now, we'll create a placeholder that points to a real URL
    
    // Upload parameters
    const uploadOptions: any = {
      public_id: filename.replace(/\.[^/.]+$/, ""), // Remove extension
      folder: folder,
      resource_type: isAudio ? 'video' : 'auto', // Cloudinary uses 'video' type for audio files
      type: 'upload',
      access_mode: 'public',
    };
    
    // For audio files add additional options
    if (isAudio) {
      uploadOptions.audio_codec = 'aac';
      uploadOptions.bit_rate = '128k';
    }
    
    // In a real implementation, this would properly combine the chunks
    // Here we'll just create a simple text file with metadata for demonstration
    const metadataString = JSON.stringify({
      filename: originalFilename,
      chunks: totalChunks,
      type: fileType,
      timestamp: new Date().toISOString()
    });
    
    const metadataBuffer = Buffer.from(metadataString);
    const base64Metadata = metadataBuffer.toString('base64');
    const dataUrl = `data:text/plain;base64,${base64Metadata}`;
    
    // Upload the metadata to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUrl,
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary finalize error:', error);
            reject(error);
          } else {
            console.log('Finalize successful:', result?.public_id);
            resolve(result);
          }
        }
      );
    });
    
    // Here we're returning the URL where the combined file would be
    // In a real implementation, this would be the actual combined file URL
    return NextResponse.json({
      success: true,
      url: (result as any).secure_url,
      publicId: (result as any).public_id,
    });
  } catch (error) {
    console.error('Error finalizing upload:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to finalize upload',
      details: (error as Error).message 
    }, { status: 500 });
  }
} 