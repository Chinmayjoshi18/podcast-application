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

    // Create a timestamp for the signature (expires in 1 hour)
    const timestamp = Math.round(new Date().getTime() / 1000);
    const expiresAt = timestamp + 3600; // 1 hour from now

    // Define required environment variables
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dbrso3dnr';

    // Ensure we have the required API credentials
    if (!apiSecret || !apiKey) {
      console.error('Missing Cloudinary API credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create the string to sign
    // This includes all parameters that will be sent to Cloudinary
    const publicId = `podcast_${Date.now()}`;
    const paramsToSign: SignatureParams = {
      timestamp: timestamp.toString(),
      folder,
      public_id: publicId,
    };

    // Add additional parameters for audio files
    if (isAudio) {
      paramsToSign.resource_type = 'video';
      paramsToSign.audio_codec = 'aac';
    }

    // Generate the signature string
    let signatureString = '';
    const sortedKeys = Object.keys(paramsToSign).sort();
    for (const key of sortedKeys) {
      signatureString += `${key}=${paramsToSign[key]}&`;
    }

    // Remove the trailing '&' and append the API secret
    signatureString = signatureString.slice(0, -1) + apiSecret;

    // Generate the actual signature
    const signature = crypto
      .createHash('sha1')
      .update(signatureString)
      .digest('hex');

    // Return the signature and other required parameters
    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      publicId,
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