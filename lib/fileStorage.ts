/**
 * File Storage Utilities
 * This module provides functions for uploading and managing files in Supabase Storage
 */

import toast from 'react-hot-toast';
import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Cache to store uploaded file URLs
interface UploadCache {
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  progress: number;
  error?: string;
}

// Global cache for file uploads
const uploadCache = new Map<string, UploadCache>();

/**
 * Get the current progress of a file upload by ID
 */
export const getUploadProgress = (uploadId: string): number => {
  const cache = uploadCache.get(uploadId);
  return cache?.progress || 0;
}

/**
 * Check if a file is already uploaded or uploading
 */
export const isFileUploading = (fileId: string): boolean => {
  const cache = uploadCache.get(fileId);
  return cache?.status === 'uploading';
}

/**
 * Check if a file upload is complete
 */
export const isFileUploaded = (fileId: string): boolean => {
  const cache = uploadCache.get(fileId);
  return cache?.status === 'completed' && !!cache.url;
}

/**
 * Get the URL of an already uploaded file
 */
export const getUploadedFileUrl = (fileId: string): string | null => {
  const cache = uploadCache.get(fileId);
  return (cache?.status === 'completed' && cache.url) ? cache.url : null;
}

/**
 * Start uploading a file immediately when it's selected
 * This will begin the upload process in the background while the user continues filling the form
 */
export const startFileUpload = async (
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Generate a unique file ID based on file name and last modified date
  const fileId = `${file.name}_${file.lastModified}`;
  
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
        // Poll for completion
        const checkInterval = setInterval(() => {
          const cache = uploadCache.get(fileId);
          if (cache?.status === 'completed' && cache.url) {
            clearInterval(checkInterval);
            onProgress?.(100);
            resolve(cache.url);
          } else if (cache?.status === 'error') {
            clearInterval(checkInterval);
            reject(new Error(cache.error || 'Unknown upload error'));
          }
        }, 1000);
      });
    }
  }
  
  // Initialize cache entry
  uploadCache.set(fileId, {
    status: 'uploading',
    progress: 0,
  });
  
  // Start the upload process
  try {
    // Set initial progress
    const updateProgress = (progress: number) => {
      const cache = uploadCache.get(fileId);
      if (cache) {
        cache.progress = progress;
        uploadCache.set(fileId, cache);
      }
      onProgress?.(progress);
    };
    
    // Start with 1% to indicate we're starting
    updateProgress(1);
    
    // Generate a unique filename to avoid collisions
    const fileExt = file.name.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExt}`;
    const filePath = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;
    
    console.log(`Starting upload for ${file.name} (${Math.round(file.size / 1024 / 1024)}MB) to ${filePath}`);
    
    // Determine the correct bucket based on the folder
    const bucketName = folder === 'podcast-audio' 
      ? process.env.NEXT_PUBLIC_SUPABASE_PODCASTS_BUCKET || 'podcasts'
      : process.env.NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET || 'images';
    
    // Setup for upload with progress monitoring
    // Supabase doesn't support progress natively, so we'll use simulated progress
    let progressInterval: NodeJS.Timeout | null = null;
    let currentProgress = 1;
    
    progressInterval = setInterval(() => {
      currentProgress += Math.random() * 2; // Increment by a random amount up to 2%
      if (currentProgress < 90) {
        updateProgress(Math.min(Math.round(currentProgress), 90));
      } else {
        if (progressInterval) clearInterval(progressInterval);
      }
    }, 500);
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    // Clear the progress interval
    if (progressInterval) clearInterval(progressInterval);
    
    if (error) {
      console.error('Error uploading file:', error);
      
      // Update cache with error
      uploadCache.set(fileId, {
        status: 'error',
        progress: 0,
        error: error.message,
      });
      
      throw error;
    }
    
    // Get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);
    
    console.log('Upload completed, public URL:', publicUrl);
    
    // Update cache with success
    uploadCache.set(fileId, {
      status: 'completed',
      progress: 100,
      url: publicUrl,
    });
    
    // Update progress to 100%
    updateProgress(100);
    
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading file ${file.name}:`, error);
    
    // Update cache with error
    uploadCache.set(fileId, {
      status: 'error',
      progress: 0,
      error: error.message || 'Unknown upload error',
    });
    
    toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
    throw error;
  }
}

/**
 * Upload a file to storage - this function maintains backward compatibility
 */
export const uploadAudioFile = async (
  file: File,
  folder: string,
  filename: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  // Check if this file is already uploading or uploaded
  const fileId = `${file.name}_${file.lastModified}`;
  
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
  return startFileUpload(file, folder, onProgress);
} 