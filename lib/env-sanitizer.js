/**
 * Environment Variable Sanitizer
 * 
 * This file is loaded early in the build process (via next.config.js)
 * to sanitize environment variables before any modules try to use them.
 * 
 * This prevents build failures due to malformed environment variables.
 */

// Safely parse Cloudinary URL
function parseCloudinaryUrl(url) {
  try {
    if (!url || typeof url !== 'string') return null;
    
    // Clean up the URL
    url = url.trim().replace(/^['"](.*)['"]$/, '$1');
    
    // Expected format: cloudinary://api_key:api_secret@cloud_name
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!match) {
      console.warn('⚠️ Invalid CLOUDINARY_URL format detected');
      return null;
    }
    
    return {
      apiKey: match[1],
      apiSecret: match[2],
      cloudName: match[3]
    };
  } catch (error) {
    console.warn('⚠️ Error parsing CLOUDINARY_URL:', error.message);
    return null;
  }
}

// Handle Cloudinary URL Environment Variable
function sanitizeCloudinaryUrl() {
  // Check if CLOUDINARY_URL is set
  if (process.env.CLOUDINARY_URL) {
    console.log('Checking CLOUDINARY_URL format...');
    
    const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
    if (!parsed) {
      // If invalid, clear it to prevent errors
      console.warn('⚠️ Removing invalid CLOUDINARY_URL to prevent build failures');
      delete process.env.CLOUDINARY_URL;
    } else {
      // If valid, ensure it has the exact correct format
      process.env.CLOUDINARY_URL = `cloudinary://${parsed.apiKey}:${parsed.apiSecret}@${parsed.cloudName}`;
      console.log('✅ CLOUDINARY_URL validated and normalized');
    }
  }
}

// Run sanitizers
sanitizeCloudinaryUrl();

// Export this function for use in other modules
module.exports = {
  sanitizeCloudinaryUrl,
}; 