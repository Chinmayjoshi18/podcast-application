import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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

    // Define required environment variables
    // For testing purposes, I've hardcoded an API key and secret - REPLACE THESE WITH YOUR ACTUAL VALUES
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "yBXnwXjzGsrouGygWQ9S1y3rfzg";
    const apiKey = process.env.CLOUDINARY_API_KEY || "864259289886747";
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dbrso3dnr";

    console.log("Using Cloudinary credentials:", { 
      cloudName, 
      apiKey,
      // Don't log the full secret, just the first few chars to verify it's loaded
      secretFirstChars: apiSecret.substring(0, 4) 
    });

    // Create parameters object that will be used for the upload
    const publicId = `podcast_${Date.now()}`;
    const params: Record<string, string> = {
      timestamp: timestamp.toString(),
      folder,
      public_id: publicId,
    };

    // Add additional parameters for audio files
    if (isAudio) {
      params.resource_type = 'video';
    }

    // Build the string to sign exactly per Cloudinary's requirements
    // This must be in format: param1=value1&param2=value2&...&timestamp=1234567890
    // The params MUST be sorted alphabetically by key
    let signatureString = '';
    Object.keys(params)
      .sort()
      .forEach(key => {
        if (params[key]) {
          signatureString += `${key}=${params[key]}&`;
        }
      });

    // Remove the trailing '&'
    signatureString = signatureString.substring(0, signatureString.length - 1);

    console.log('String to sign:', signatureString);

    // Generate the signature using SHA-1 hash of the string + API secret
    const signature = crypto
      .createHash('sha1')
      .update(signatureString + apiSecret)
      .digest('hex');
      
    console.log('Generated signature:', signature);

    // Return the signature and other required parameters
    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      publicId,
      stringToSign: signatureString, // Include this for debugging
      success: true,
    });
  } catch (error) {
    console.error('Error generating upload signature:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
} 