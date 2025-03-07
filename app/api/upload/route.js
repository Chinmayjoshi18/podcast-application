import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { v2 as cloudinary } from 'cloudinary';
import { authOptions } from '@/lib/auth';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const fileType = formData.get('type') || 'image'; // 'image' or 'audio'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Convert file to base64
    const fileBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(fileBuffer).toString('base64');
    const base64FileData = `data:${file.type};base64,${base64File}`;
    
    // Set upload options based on file type
    const uploadOptions = {
      folder: fileType === 'audio' ? 'podcasts' : 'images',
    };
    
    // If it's an audio file, we want to make sure it's streamable
    if (fileType === 'audio') {
      uploadOptions.resource_type = 'video'; // Cloudinary handles audio under 'video' type
      uploadOptions.use_filename = true;
      uploadOptions.unique_filename = true;
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
            resolve(result);
          }
        }
      );
    });
    
    // Return the result with the URL
    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      ...(fileType === 'audio' && { duration: result.duration })
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// Config for allowing larger files
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '30mb',
  },
}; 