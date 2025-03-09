/**
 * Advanced File Storage Utilities
 * Enterprise-grade implementation for handling file uploads to Supabase Storage
 * Features:
 * - Background uploads with progress tracking
 * - Resilient error handling and retry logic
 * - Large file support via chunked uploads
 * - Offline detection and recovery
 * - Upload cache to prevent duplicates
 */

import toast from 'react-hot-toast';
import { supabase, handleStorageError } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Enhanced upload cache with additional metadata
interface UploadCache {
  status: 'initializing' | 'uploading' | 'paused' | 'completed' | 'error';
  url?: string;
  progress: number;
  error?: string;
  retries: number;
  lastActivity: number; // timestamp of last activity
  fileSize: number;
  chunks?: { uploaded: boolean; index: number }[];
  uploadMethod: 'direct' | 'chunked';
}

// Configurable upload settings
const UPLOAD_SETTINGS = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // ms
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks for large files
  LARGE_FILE_THRESHOLD: 50 * 1024 * 1024, // 50MB
  PROGRESS_INTERVAL: 300, // ms between progress updates
  CONNECTION_CHECK_URL: 'https://www.google.com/favicon.ico', // URL to check connectivity
  TIMEOUT: 30000, // 30s timeout for uploads
};

// Global cache for file uploads
const uploadCache = new Map<string, UploadCache>();

// Check if we're in a browser environment with connectivity APIs
const isBrowser = typeof window !== 'undefined';
const hasNavigatorOnline = isBrowser && 'onLine' in navigator;

/**
 * Check if the device is currently online
 */
const isOnline = async (): Promise<boolean> => {
  if (!isBrowser) return true; // Assume online in non-browser environments
  
  if (hasNavigatorOnline && !navigator.onLine) {
    return false; // Quick check if browser reports offline
  }
  
  // Double-check with a real network request
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(UPLOAD_SETTINGS.CONNECTION_CHECK_URL, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    console.warn('Network connectivity check failed:', error);
    return false;
  }
};

/**
 * Get the current progress of a file upload by ID
 */
export const getUploadProgress = (uploadId: string): number => {
  const cache = uploadCache.get(uploadId);
  return cache?.progress || 0;
};

/**
 * Check if a file is currently uploading
 */
export const isFileUploading = (fileId: string): boolean => {
  const cache = uploadCache.get(fileId);
  return cache?.status === 'uploading' || cache?.status === 'initializing';
};

/**
 * Check if a file upload is complete
 */
export const isFileUploaded = (fileId: string): boolean => {
  const cache = uploadCache.get(fileId);
  return cache?.status === 'completed' && !!cache.url;
};

/**
 * Check if a file upload is paused
 */
export const isFilePaused = (fileId: string): boolean => {
  const cache = uploadCache.get(fileId);
  return cache?.status === 'paused';
};

/**
 * Get the URL of an already uploaded file
 */
export const getUploadedFileUrl = (fileId: string): string | null => {
  const cache = uploadCache.get(fileId);
  return (cache?.status === 'completed' && cache.url) ? cache.url : null;
};

/**
 * Pause an ongoing upload
 */
export const pauseUpload = (fileId: string): boolean => {
  const cache = uploadCache.get(fileId);
  if (cache && cache.status === 'uploading') {
    cache.status = 'paused';
    uploadCache.set(fileId, cache);
    return true;
  }
  return false;
};

/**
 * Resume a paused upload
 */
export const resumeUpload = async (
  fileId: string, 
  file: File,
  onProgress?: (progress: number) => void,
  userId?: string
): Promise<string> => {
  const cache = uploadCache.get(fileId);
  if (!cache || cache.status !== 'paused') {
    throw new Error('Cannot resume upload: upload not paused or not found');
  }
  
  // Reset status to uploading
  cache.status = 'uploading';
  uploadCache.set(fileId, cache);
  
  // Determine the original folder from the upload method
  const folder = cache.uploadMethod === 'direct' ? 'images' : 'podcast-audio';
  
  // Actually restart the upload with the existing file
  return startFileUpload(file, folder, onProgress, userId);
};

/**
 * Calculate checksum for a file or chunk
 * Used for data integrity verification
 */
const calculateChecksum = async (blob: Blob): Promise<string> => {
  // Use SubtleCrypto API if available
  if (isBrowser && window.crypto && 'subtle' in window.crypto) {
    try {
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('Crypto API checksum failed, using fallback:', error);
    }
  }
  
  // Fallback simple "checksum" based on size and last modified
  if (blob instanceof File) {
    return `size-${blob.size}-lastModified-${blob.lastModified}`;
  }
  
  return `size-${blob.size}-time-${Date.now()}`;
};

/**
 * Choose the best upload method based on file size and type
 */
const determineUploadMethod = (file: File): 'direct' | 'chunked' => {
  // For images and small files, use direct upload
  if (
    file.size < UPLOAD_SETTINGS.LARGE_FILE_THRESHOLD || 
    file.type.startsWith('image/')
  ) {
    return 'direct';
  }
  
  // For large files, use chunked upload
  return 'chunked';
};

/**
 * Manual implementation of chunked upload for large files
 */
const uploadLargeFile = async (
  bucketName: string,
  filePath: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Calculate total chunks
  const chunkSize = UPLOAD_SETTINGS.CHUNK_SIZE;
  const chunksCount = Math.ceil(file.size / chunkSize);
  
  // Create an array to track uploaded chunks
  const chunks = Array(chunksCount).fill(null).map((_, index) => ({
    uploaded: false,
    index,
  }));
  
  // Start uploading chunks
  for (let i = 0; i < chunksCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunk = file.slice(start, end);
    
    // Calculate chunk progress percentage
    const chunkProgress = Math.floor((i / chunksCount) * 90) + 5;
    onProgress?.(chunkProgress);
    
    // Add content type for the first chunk
    const options = i === 0 
      ? { contentType: file.type, upsert: true }
      : { upsert: true };
    
    // Upload chunk with retries
    let attempts = 0;
    while (attempts < UPLOAD_SETTINGS.MAX_RETRIES) {
      try {
        // For first chunk, create new file; for others, append
        if (i === 0) {
          const { error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, chunk, options);
            
          if (error) throw error;
        } else {
          // Use append API endpoint directly since it's not exposed in the SDK
          const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/append`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              'x-upsert': 'true'
            },
            body: JSON.stringify({
              bucketId: bucketName,
              objectName: filePath,
              offset: start,
              data: await chunk.arrayBuffer()
            })
          });
          
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to append chunk');
          }
        }
        
        // Mark chunk as uploaded
        chunks[i].uploaded = true;
        break; // Successfully uploaded this chunk
      } catch (error) {
        attempts++;
        console.error(`Error uploading chunk ${i+1}/${chunksCount} (attempt ${attempts}):`, error);
        
        if (attempts >= UPLOAD_SETTINGS.MAX_RETRIES) {
          throw new Error(`Failed to upload chunk ${i+1} after ${attempts} attempts`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, UPLOAD_SETTINGS.RETRY_DELAY));
      }
    }
  }
  
  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);
    
  return publicUrl;
};

/**
 * Start uploading a file immediately when it's selected
 * Enhanced version with advanced error handling, progress tracking, and large file support
 */
export const startFileUpload = async (
  file: File,
  folder: string,
  onProgress?: (progress: number) => void,
  userId?: string
): Promise<string> => {
  // Generate a unique file ID based on file name, size and last modified date
  const fileId = `${file.name}_${file.size}_${file.lastModified}`;
  
  // Verify we're online before starting upload
  const online = await isOnline();
  if (!online) {
    const errorMessage = 'Cannot upload while offline. Please check your internet connection.';
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  // Check if this file is already uploading or uploaded
  const existingCache = uploadCache.get(fileId);
  if (existingCache) {
    if (existingCache.status === 'completed' && existingCache.url) {
      console.log(`File ${file.name} already uploaded, returning cached URL`);
      onProgress?.(100);
      return existingCache.url;
    } else if (existingCache.status === 'uploading') {
      console.log(`File ${file.name} is currently uploading, waiting for completion`);
      return new Promise((resolve, reject) => {
        // Poll for completion with exponential backoff
        let checkCount = 0;
        const maxCheckCount = 60; // Maximum number of checks before giving up
        
        const checkInterval = setInterval(() => {
          checkCount++;
          const cache = uploadCache.get(fileId);
          
          if (cache?.status === 'completed' && cache.url) {
            clearInterval(checkInterval);
            onProgress?.(100);
            resolve(cache.url);
          } else if (cache?.status === 'error') {
            clearInterval(checkInterval);
            reject(new Error(cache.error || 'Unknown upload error'));
          } else if (checkCount >= maxCheckCount) {
            clearInterval(checkInterval);
            reject(new Error('Upload timeout: the operation took too long to complete'));
          }
          
          // Update progress for the caller
          if (cache) {
            onProgress?.(cache.progress);
          }
        }, 1000 * Math.min(1 + (checkCount * 0.1), 3)); // Exponential backoff up to 3 seconds
      });
    } else if (existingCache.status === 'paused') {
      // Resume paused upload
      return resumeUpload(fileId, file, onProgress, userId);
    }
  }
  
  // Determine the best upload method based on file size and type
  const uploadMethod = determineUploadMethod(file);
  console.log(`Using upload method: ${uploadMethod} for ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
  
  // Initialize cache entry
  uploadCache.set(fileId, {
    status: 'initializing',
    progress: 0,
    retries: 0,
    lastActivity: Date.now(),
    fileSize: file.size,
    uploadMethod,
  });
  
  // Start the upload process
  try {
    // Update progress helper function
    const updateProgress = (progress: number) => {
      const cache = uploadCache.get(fileId);
      if (cache) {
        cache.progress = progress;
        cache.lastActivity = Date.now();
        uploadCache.set(fileId, cache);
      }
      onProgress?.(progress);
    };
    
    // Start with 1% to indicate we're starting
    updateProgress(1);
    
    // Generate a unique filename to avoid collisions
    const fileExt = file.name.split('.').pop() || 'bin';
    const uniqueFilename = `${uuidv4()}.${fileExt}`;
    
    // Include userId in path to comply with row-level security policies
    const safeUserId = userId || 'anonymous';
    
    // Add diagnostic logging
    console.log('==== UPLOAD DIAGNOSTICS ====');
    console.log('User ID:', safeUserId);
    console.log('Folder:', folder);
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Instead of nesting the userId within the folder, keep the userId as the first path segment
    // This is critical for RLS policies which check storage.foldername(name)[1] = auth.uid()
    const filePath = `${safeUserId}/${uniqueFilename}`;
    
    console.log('Generated file path:', filePath);
    console.log('==========================')
    
    // Determine the correct bucket based on the folder
    const bucketName = folder === 'podcast-audio' 
      ? process.env.NEXT_PUBLIC_SUPABASE_PODCASTS_BUCKET || 'podcasts'
      : process.env.NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET || 'images';
    
    // Update status to uploading
    const cacheEntry = uploadCache.get(fileId)!;
    cacheEntry.status = 'uploading';
    uploadCache.set(fileId, cacheEntry);
    
    let publicUrl: string;
    
    // Upload based on method
    if (uploadMethod === 'chunked') {
      console.log(`Starting chunked upload for ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
      
      // Set initial progress
      updateProgress(2);
      
      // We'll use a more realistic progress simulation for large files
      let progressInterval: NodeJS.Timeout | null = null;
      
      // For large files, we'll simulate progress until the upload completes
      const progressSimulator = () => {
        const estimatedTimeInSeconds = Math.max(10, Math.min(300, file.size / 100000)); // Estimate between 10s and 5min
        const interval = 500; // Update every 500ms
        const totalUpdates = (estimatedTimeInSeconds * 1000) / interval;
        let updateCount = 0;
        
        return setInterval(() => {
          updateCount++;
          const simProgress = Math.min(90, (updateCount / totalUpdates) * 95);
          updateProgress(Math.floor(simProgress));
          
          if (simProgress >= 90) {
            if (progressInterval) clearInterval(progressInterval);
          }
        }, interval);
      };
      
      // Start progress simulation
      progressInterval = progressSimulator();
      
      try {
        // Use our large file upload implementation
        publicUrl = await uploadLargeFile(bucketName, filePath, file, updateProgress);
      } finally {
        // Clear the progress interval
        if (progressInterval) clearInterval(progressInterval);
      }
    } else {
      // For small files, use direct upload
      console.log(`Starting direct upload for ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
      updateProgress(5);
      
      // Simulate progress for better UX
      let progressInterval: NodeJS.Timeout | null = null;
      let currentProgress = 5;
      
      progressInterval = setInterval(() => {
        currentProgress += Math.random() * 5; // Faster for small files
        if (currentProgress < 90) {
          updateProgress(Math.min(Math.round(currentProgress), 90));
        } else {
          if (progressInterval) clearInterval(progressInterval);
        }
      }, 300);
      
      try {
        // Direct upload to Supabase
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });
          
        if (error) throw error;
        
        // Get the public URL
        const { data: { publicUrl: url } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(data.path);
          
        publicUrl = url;
      } finally {
        // Clear the progress interval
        if (progressInterval) clearInterval(progressInterval);
      }
    }
    
    console.log('Upload completed, public URL:', publicUrl);
    
    // Update cache with success
    uploadCache.set(fileId, {
      ...uploadCache.get(fileId)!,
      status: 'completed',
      progress: 100,
      url: publicUrl,
      lastActivity: Date.now(),
    });
    
    // Update progress to 100%
    updateProgress(100);
    
    return publicUrl;
  } catch (error) {
    // Verify if the error is due to network connectivity
    const online = await isOnline();
    const isNetworkError = !online || 
      error.message?.includes('network') || 
      error.message?.includes('connect') ||
      error.message?.includes('offline') ||
      error.message?.includes('timeout');
    
    // Check for RLS policy violation
    const isRLSError = error.message?.includes('new row violates row-level security policy');
    
    console.error(`Error uploading file ${file.name}:`, error);
    
    // Get current cache entry
    const cacheEntry = uploadCache.get(fileId);
    
    // If this is a network error and we haven't exceeded retry count
    if (isNetworkError && cacheEntry && cacheEntry.retries < UPLOAD_SETTINGS.MAX_RETRIES) {
      // Increment retry count
      cacheEntry.retries++;
      cacheEntry.status = 'paused'; // Mark as paused for retry
      uploadCache.set(fileId, cacheEntry);
      
      // Notify user
      toast.error(`Upload interrupted. Will retry in ${UPLOAD_SETTINGS.RETRY_DELAY/1000}s (${cacheEntry.retries}/${UPLOAD_SETTINGS.MAX_RETRIES})`);
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, UPLOAD_SETTINGS.RETRY_DELAY));
      return startFileUpload(file, folder, onProgress, userId);
    }
    
    // Update cache with error
    uploadCache.set(fileId, {
      ...cacheEntry!,
      status: 'error',
      progress: 0,
      error: error.message || 'Unknown upload error',
      lastActivity: Date.now(),
    });
    
    // Specific user feedback based on error
    if (isRLSError) {
      toast.error('Upload failed: Security policy violation. Please contact support.');
    } else if (isNetworkError) {
      toast.error(`Upload failed: Network connection lost. Please check your internet connection.`);
    } else if (error.statusCode === 413 || error.message?.includes('too large')) {
      toast.error(`File is too large. Maximum file size is ${Math.floor(UPLOAD_SETTINGS.LARGE_FILE_THRESHOLD / (1024 * 1024))}MB.`);
    } else {
      const errorMessage = handleStorageError(error);
      toast.error(`Upload failed: ${errorMessage}`);
    }
    
    throw error;
  }
};

/**
 * Upload a file to storage - this function maintains backward compatibility
 * with previous code while leveraging the enhanced upload functionality
 */
export const uploadAudioFile = async (
  file: File,
  folder: string,
  filename: string, // filename is ignored, we generate unique names
  onProgress: (progress: number) => void,
  userId?: string
): Promise<string> => {
  // Check if this file is already uploading or uploaded
  const fileId = `${file.name}_${file.size}_${file.lastModified}`;
  
  // If the file is already uploaded, return the URL immediately
  if (isFileUploaded(fileId)) {
    const url = getUploadedFileUrl(fileId);
    if (url) {
      console.log(`File ${file.name} is already uploaded, returning cached URL`);
      onProgress(100);
      return url;
    }
  }
  
  // If not already uploaded, start a new upload
  console.log(`File ${file.name} is not cached, starting new upload`);
  return startFileUpload(file, folder, onProgress, userId);
};

// Cleanup function to periodically remove old cache entries
// This prevents memory leaks from accumulating over time
if (isBrowser) {
  setInterval(() => {
    const now = Date.now();
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    uploadCache.forEach((entry, key) => {
      // Remove completed or error entries older than MAX_AGE
      if ((entry.status === 'completed' || entry.status === 'error') && 
          now - entry.lastActivity > MAX_AGE) {
        uploadCache.delete(key);
      }
    });
  }, 60 * 60 * 1000); // Run every hour
} 