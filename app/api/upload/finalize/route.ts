import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
// First check if CLOUDINARY_URL is available
if (process.env.CLOUDINARY_URL) {
  // When using CLOUDINARY_URL, we don't need to call cloudinary.config()
  // The SDK automatically picks it up from the environment
  console.log('Using CLOUDINARY_URL from environment variables');
} else {
  // Fallback to individual credentials if CLOUDINARY_URL is not set
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dbrso3dnr",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || ""
  });
  console.log('Using individual Cloudinary credentials from environment variables');
}

// This configuration disables the default body parser for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

// Define types for Cloudinary responses
interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  [key: string]: any;
}

interface CloudinarySearchResult {
  resources: CloudinaryResource[];
  total_count: number;
  [key: string]: any;
}

// POST /api/upload/finalize - Finalize a chunked upload
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { tag, filename, totalChunks, folder, resourceType } = body;

    if (!tag || !filename || !totalChunks) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    console.log(`Finalizing upload for tag ${tag} with ${totalChunks} chunks`);

    // First, use the Cloudinary API to search for all chunks with this tag
    const searchResult = await new Promise<CloudinarySearchResult>((resolve, reject) => {
      cloudinary.search
        .expression(`tags=${tag}`)
        .sort_by('public_id', 'asc')
        .max_results(totalChunks)
        .execute((error, result) => {
          if (error) {
            console.error('Error searching for chunks:', error);
            reject(error);
          } else {
            resolve(result as CloudinarySearchResult);
          }
        });
    });

    // Verify all chunks are present
    if (!searchResult.resources || searchResult.resources.length < totalChunks) {
      return NextResponse.json({
        error: `Not all chunks were found. Expected ${totalChunks}, found ${searchResult.resources?.length || 0}`,
      }, { status: 400 });
    }

    console.log(`Found all ${totalChunks} chunks, creating final file`);

    // For audio files, we need to use Cloudinary's create_slideshow API
    // For other files, we use create_zip
    let finalUrl;

    if (resourceType === 'video') {
      // Audio files - use create_slideshow with audio settings
      const publicIds = searchResult.resources.map(r => r.public_id);
      const result = await new Promise<CloudinaryResource>((resolve, reject) => {
        cloudinary.uploader.create_slideshow({
          tag,
          public_ids: publicIds,
          resource_type: 'video',
          notification_url: null,
          transformation: [
            { audio_codec: 'aac', bit_rate: '128k' }
          ],
          overwrite: true,
          public_id: `${folder}/${filename.replace(/\.[^/.]+$/, "")}`
        }, (error, result) => {
          if (error) {
            console.error('Error creating slideshow:', error);
            reject(error);
          } else {
            resolve(result as CloudinaryResource);
          }
        });
      });

      finalUrl = result.secure_url;
    } else {
      // Images or other files - use create_zip
      const result = await new Promise<CloudinaryResource>((resolve, reject) => {
        cloudinary.uploader.create_zip({
          tags: [tag],
          resource_type: resourceType,
          target_tags: [tag],
          target_public_id: `${folder}/${filename.replace(/\.[^/.]+$/, "")}`,
          overwrite: true
        }, (error, result) => {
          if (error) {
            console.error('Error creating zip:', error);
            reject(error);
          } else {
            resolve(result as CloudinaryResource);
          }
        });
      });

      finalUrl = result.secure_url;
    }

    // Note: We're skipping the cleanup step for now due to TypeScript compatibility issues
    // Cloudinary will automatically clean up temporary resources after a period of time
    // If cleanup is needed, implement a separate API endpoint for this purpose

    return NextResponse.json({
      success: true,
      secure_url: finalUrl
    });
  } catch (error) {
    console.error('Error finalizing upload:', error);
    return NextResponse.json({ 
      error: 'Failed to finalize upload',
      details: (error as Error).message 
    }, { status: 500 });
  }
} 