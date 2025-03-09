import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinaryConfig'; // Import from centralized config

// Define the params interface to fix type errors
interface SignatureParams {
  timestamp: string;
  folder: string;
  public_id: string;
  resource_type?: string;
  audio_codec?: string;
  [key: string]: string | undefined;
}

/**
 * Generate a signature for Cloudinary uploads
 * Signed uploads prevent unauthorized users from uploading files directly
 * 
 * This follows Cloudinary's exact signature requirements:
 * https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await req.json();
    const { filename, folder, fileType, fileSize, isAudio } = body;

    // Validate required parameters
    if (!filename || !folder) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create a timestamp for the signature
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Get Cloudinary configuration
    const { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret } = cloudinary.config();

    // Ensure we have the required API credentials
    if (!apiSecret || !apiKey) {
      console.error('Missing Cloudinary API credentials - check your environment variables');
      return NextResponse.json(
        { error: 'Server configuration error - missing Cloudinary credentials' },
        { status: 500 }
      );
    }

    console.log("Using Cloudinary credentials:", { 
      cloudName,
      apiKey: apiKey.substring(0, 5) + '...',
      secretAvailable: !!apiSecret
    });

    // Create a unique public ID for the file
    const publicId = `podcast_${Date.now()}`;
    
    // Parameters to include in signature
    // These MUST match exactly what will be sent to Cloudinary
    const params: Record<string, string> = {
      timestamp: timestamp.toString(),
      folder,
      public_id: publicId,
      api_key: apiKey,
    };

    // Add audio-specific parameters if needed
    if (isAudio) {
      params.resource_type = 'video';  // Audio files use the 'video' resource type in Cloudinary
    }

    // Generate the signature string in the exact format Cloudinary expects
    // Format: param1=value1&param2=value2...paramN=valueN+API_SECRET
    // Parameters must be sorted alphabetically by key
    let signatureString = '';
    Object.keys(params)
      .sort()
      .forEach(key => {
        if (params[key]) {
          signatureString += `${key}=${params[key]}&`;
        }
      });

    // Remove the trailing '&'
    signatureString = signatureString.slice(0, -1);

    // Generate the signature
    // Important: The API secret is appended to the string, not included with & separator
    const signature = crypto
      .createHash('sha1')
      .update(signatureString + apiSecret)
      .digest('hex');

    console.log('Generated signature for params:', {
      signatureParams: Object.keys(params).sort(),
      signature: signature.substring(0, 10) + '...' // Only log part of the signature for security
    });

    // Return the signature and parameters needed by the client
    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      publicId,
      success: true
    });
  } catch (error) {
    console.error('Error generating upload signature:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 