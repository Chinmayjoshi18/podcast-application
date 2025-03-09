import { v2 as cloudinary } from 'cloudinary';

/**
 * Parse Cloudinary URL to extract credentials
 */
function parseCloudinaryUrl(url: string): { cloudName: string; apiKey: string; apiSecret: string } | null {
  try {
    // Format: cloudinary://api_key:api_secret@cloud_name
    const match = url.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    if (!match) {
      console.error('Invalid CLOUDINARY_URL format, should be: cloudinary://api_key:api_secret@cloud_name');
      return null;
    }
    
    return {
      apiKey: match[1],
      apiSecret: match[2],
      cloudName: match[3]
    };
  } catch (error) {
    console.error('Failed to parse Cloudinary URL:', error);
    return null;
  }
}

/**
 * Configure Cloudinary with environment variables
 * This function handles both CLOUDINARY_URL and individual credentials
 */
function setupCloudinary() {
  // First check if CLOUDINARY_URL is available
  const cloudinaryUrl = process.env.CLOUDINARY_URL || '';
  
  if (cloudinaryUrl && cloudinaryUrl.startsWith('cloudinary://')) {
    // When using CLOUDINARY_URL format, parse it and use explicit configuration
    // This ensures it works correctly
    const credentials = parseCloudinaryUrl(cloudinaryUrl);
    
    if (credentials) {
      cloudinary.config({
        cloud_name: credentials.cloudName,
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret
      });
      console.log(`Cloudinary configured with credentials from CLOUDINARY_URL for cloud: ${credentials.cloudName}`);
      return true;
    } else {
      console.error('Invalid CLOUDINARY_URL format, falling back to individual credentials');
    }
  }
  
  // Fallback to individual credentials
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    console.log(`Cloudinary configured with individual credentials for cloud: ${cloudName}`);
    return true;
  }
  
  console.error('No valid Cloudinary credentials found in environment variables');
  return false;
}

// Initialize Cloudinary on module import
setupCloudinary();

// Export configured cloudinary instance and utility functions
export { cloudinary, setupCloudinary, parseCloudinaryUrl }; 