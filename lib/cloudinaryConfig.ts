/**
 * Cloudinary Configuration Module
 * This module provides a centralized configuration for Cloudinary
 * and ensures that invalid environment variables don't break the build
 */

// Import cloudinary AFTER we've handled potential invalid environment variables
let cloudinary: any;

// Safely parse Cloudinary URL
function parseCloudinaryUrl(url: string): { cloudName: string; apiKey: string; apiSecret: string } | null {
  try {
    if (!url || typeof url !== 'string') return null;
    
    // Clean up the URL if needed (sometimes URLs can have extra whitespace or quotes)
    url = url.trim().replace(/^['"](.*)['"]$/, '$1');
    
    // Format must be: cloudinary://api_key:api_secret@cloud_name
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!match) {
      console.error('⚠️ Invalid CLOUDINARY_URL format. Expected: cloudinary://api_key:api_secret@cloud_name');
      return null;
    }
    
    return {
      apiKey: match[1],
      apiSecret: match[2],
      cloudName: match[3]
    };
  } catch (error) {
    console.error('⚠️ Failed to parse Cloudinary URL:', error);
    return null;
  }
}

// CRITICAL: Handle the URL before importing Cloudinary
function sanitizeCloudinaryEnv() {
  // Store the original CLOUDINARY_URL
  const originalUrl = process.env.CLOUDINARY_URL;
  
  // If CLOUDINARY_URL is set, validate it
  if (originalUrl) {
    const parsedCreds = parseCloudinaryUrl(originalUrl);
    
    if (!parsedCreds) {
      // If CLOUDINARY_URL is invalid, remove it to prevent Cloudinary SDK from failing
      console.warn('⚠️ Invalid CLOUDINARY_URL detected, removing it to prevent errors');
      delete process.env.CLOUDINARY_URL;
      
      // Set individual credentials if available
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        console.log('✅ Using individual Cloudinary credentials instead');
      } else {
        console.warn('⚠️ No valid Cloudinary credentials found. Functionality may be limited.');
      }
    } else {
      console.log(`✅ Valid CLOUDINARY_URL detected for cloud: ${parsedCreds.cloudName}`);
      
      // Ensure the format is exactly right (this is important for the Cloudinary SDK)
      process.env.CLOUDINARY_URL = `cloudinary://${parsedCreds.apiKey}:${parsedCreds.apiSecret}@${parsedCreds.cloudName}`;
    }
  } else {
    console.log('ℹ️ No CLOUDINARY_URL found, will use individual credentials if available');
  }
}

// Run the sanitization BEFORE importing Cloudinary
sanitizeCloudinaryEnv();

// NOW it's safe to import Cloudinary
import { v2 as cloudinaryImport } from 'cloudinary';
cloudinary = cloudinaryImport;

// Configure Cloudinary with explicit settings to ensure it works correctly
function setupCloudinary() {
  // Get configuration values, prioritizing individual credentials if URL was invalid
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  
  // Explicitly configure Cloudinary, even if CLOUDINARY_URL is set
  // This ensures we have control over the configuration
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    console.log(`✅ Cloudinary explicitly configured for cloud: ${cloudName}`);
    return true;
  }
  
  // Check if CLOUDINARY_URL is configured automatically 
  const config = cloudinary.config();
  if (config && config.cloud_name) {
    console.log(`✅ Cloudinary auto-configured for cloud: ${config.cloud_name}`);
    return true;
  }
  
  console.warn('⚠️ Cloudinary configuration is incomplete. Features requiring Cloudinary may not work.');
  return false;
}

// Run the setup
setupCloudinary();

// Export configured cloudinary instance
export { cloudinary }; 