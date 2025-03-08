/**
 * Cloud Storage Utilities for handling large file uploads
 * This module provides functions for chunking and uploading large files to cloud storage
 */

import toast from 'react-hot-toast';

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
  
  // Call the actual upload function
  try {
    // Create a progress handler that updates both the cache and calls the provided callback
    const progressHandler = (progress: number) => {
      const cache = uploadCache.get(fileId);
      if (cache) {
        cache.progress = progress;
        uploadCache.set(fileId, cache);
      }
      onProgress?.(progress);
    };
    
    // Start at 1% immediately
    progressHandler(1);
    
    // Generate a filename that won't conflict
    const filename = `${file.name.replace(/\.[^/.]+$/, '')}_${Date.now()}`;
    
    // Perform the actual upload
    console.log(`Starting background upload for ${file.name} (${Math.round(file.size / (1024 * 1024))}MB)`);
    const url = await uploadFileToCloudinary(file, folder, filename, progressHandler);
    
    // Update cache with the completed URL
    uploadCache.set(fileId, {
      status: 'completed',
      url,
      progress: 100,
    });
    
    // Ensure progress is set to 100%
    onProgress?.(100);
    
    console.log(`Background upload completed for ${file.name}`);
    return url;
  } catch (error) {
    console.error(`Error uploading file ${file.name}:`, error);
    
    // Update cache with the error
    uploadCache.set(fileId, {
      status: 'error',
      progress: 0,
      error: error.message || 'Unknown upload error',
    });
    
    throw error;
  }
}

/**
 * Upload a file to cloud storage - this function maintains backward compatibility
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

/**
 * Internal function that handles the actual upload to Cloudinary
 */
async function uploadFileToCloudinary(
  file: File,
  folder: string,
  filename: string,
  onProgress: (progress: number) => void
): Promise<string> {
  // We're going to use a reliable XHR approach with signed URLs for Cloudinary
  const isAudio = folder === 'podcast-audio';
  const resourceType = isAudio ? 'video' : 'auto'; // Cloudinary uses 'video' for audio files
  
  try {
    console.log(`Requesting signed upload URL for ${filename} in folder ${folder}`);
    
    // First, request a signed upload URL from our backend
    const signatureResponse = await fetch('/api/uploads/signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        folder,
        fileType: file.type,
        fileSize: file.size,
        isAudio,
      }),
    });
    
    if (!signatureResponse.ok) {
      let errorMessage = 'Failed to get upload signature';
      try {
        const errorData = await signatureResponse.json();
        errorMessage = `Failed to get upload signature: ${errorData.error || signatureResponse.statusText}`;
      } catch (e) {
        // If we can't parse the JSON, just use the status text
      }
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    const signatureData = await signatureResponse.json();
    console.log('Received signature data:', { 
      ...signatureData,
      // Don't log the signature itself for security
      hasSignature: !!signatureData.signature 
    });
    
    if (!signatureData.signature || !signatureData.timestamp || !signatureData.apiKey) {
      console.error('Missing required signature data');
      throw new Error('Invalid signature data received from server');
    }
    
    const { signature, timestamp, cloudName, apiKey, publicId } = signatureData;
    
    // Now we can upload directly to Cloudinary with the signature
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Create form data with the file and signature parameters
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      
      // Use the provided public_id from the server
      if (publicId) {
        formData.append('public_id', publicId);
      } else {
        formData.append('public_id', `podcast_${Date.now()}`);
      }
      
      // Add additional parameters for audio files
      if (isAudio) {
        formData.append('resource_type', 'video');
      }
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          // Calculate progress percentage (limit to 95% until complete)
          const progressPercent = Math.min(Math.round((event.loaded / event.total) * 100), 95);
          console.log(`Upload progress: ${progressPercent}%`);
          onProgress(progressPercent);
        }
      });
      
      // Additional events for better tracking
      xhr.addEventListener('loadstart', () => {
        console.log('Upload started');
        onProgress(2);
      });
      
      xhr.addEventListener('error', (error) => {
        console.error('XHR error during upload:', error);
        reject(new Error('Network error during upload'));
      });
      
      // Handle the response
      xhr.addEventListener('load', () => {
        console.log(`Upload completed with status: ${xhr.status}`);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Cloudinary response:', response);
            
            if (response && response.secure_url) {
              onProgress(100);
              resolve(response.secure_url);
            } else {
              console.error('Missing secure_url in response:', response);
              reject(new Error('Invalid response from Cloudinary (missing URL)'));
            }
          } catch (error) {
            console.error('Error parsing response:', error, 'Response text:', xhr.responseText);
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          console.error('Error status:', xhr.status, 'Response:', xhr.responseText);
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            const errorMessage = errorResponse.error?.message || 'Unknown error';
            console.error('Cloudinary error details:', errorResponse);
            toast.error(`Upload failed: ${errorMessage}`);
            reject(new Error(`Upload failed: ${errorMessage}`));
          } catch (e) {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        }
      });
      
      // Set timeout to 30 minutes for large uploads
      xhr.timeout = 30 * 60 * 1000;
      xhr.ontimeout = () => {
        console.error('Upload timed out');
        reject(new Error('Upload timed out after 30 minutes'));
      };
      
      // Construct the upload URL
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
      console.log(`Uploading to ${uploadUrl}`);
      
      // Add a fallback progress timer
      let currentProgress = 2;
      const progressTimer = setInterval(() => {
        currentProgress += 1;
        if (currentProgress <= 90) {
          onProgress(currentProgress);
        } else {
          clearInterval(progressTimer);
        }
      }, 3000);
      
      // Execute the upload
      try {
        xhr.open('POST', uploadUrl);
        xhr.send(formData);
        console.log('XHR request sent to Cloudinary with signed parameters');
      } catch (error) {
        clearInterval(progressTimer);
        console.error('Error initiating upload:', error);
        reject(error);
      }
      
      // Cleanup function
      const cleanup = () => {
        clearInterval(progressTimer);
      };
      
      // Ensure the timer is cleared
      xhr.addEventListener('loadend', cleanup);
      xhr.addEventListener('error', cleanup);
      xhr.addEventListener('abort', cleanup);
    });
  } catch (error) {
    console.error('Error in uploadFileToCloudinary:', error);
    toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
    throw error;
  }
}

/**
 * Upload a file directly to Cloudinary (for small files)
 */
async function simpleDirectUpload(
  file: File,
  folder: string,
  onProgress: (progress: number) => void
): Promise<string> {
  const isAudio = folder === 'podcast-audio';
  const resourceType = isAudio ? 'video' : 'auto';
  const cloudName = "dbrso3dnr";
  const uploadPreset = "podcast_uploads";
  
  // Create upload URL
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    // Add file and upload params
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    formData.append('public_id', `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`);
    
    // Track progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.min(Math.round((event.loaded / event.total) * 100), 95);
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            onProgress(100);
            resolve(response.secure_url);
          } else {
            reject(new Error('Missing secure_url in response'));
          }
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

/**
 * Upload a file in chunks with multiple concurrent uploads for speed
 */
async function uploadWithChunks(
  file: File,
  folder: string,
  filename: string,
  chunkSize: number,
  maxConcurrent: number,
  onProgress: (progress: number) => void
): Promise<string> {
  const cloudName = "dbrso3dnr";
  const uploadPreset = "podcast_uploads";
  const isAudio = folder === 'podcast-audio';
  const resourceType = isAudio ? 'video' : 'auto';
  
  // Create a unique tag for this upload to identify all chunks
  const uniqueUploadTag = `upload_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  
  // Calculate total chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  console.log(`Splitting ${file.name} into ${totalChunks} chunks of ${chunkSize/1024}KB each`);
  
  // Keep track of progress
  let completedChunks = 0;
  let activeUploads = 0;
  let uploadedChunks: number[] = [];
  let failed = false;
  
  // Process all chunks with throttling
  return new Promise<string>(async (resolve, reject) => {
    // Create a queue of chunks to process
    const chunkQueue: number[] = Array.from({ length: totalChunks }, (_, i) => i);
    
    // Function to process the next chunk in the queue
    const processNextChunk = async () => {
      if (failed) return;
      
      if (chunkQueue.length === 0) {
        if (activeUploads === 0 && !failed) {
          // All chunks uploaded, now finalize
          try {
            if (completedChunks === totalChunks) {
              onProgress(96); // Show 96% after all chunks are done
              const result = await finalizeChunkedUpload(
                uniqueUploadTag, 
                filename, 
                totalChunks, 
                cloudName, 
                folder, 
                resourceType
              );
              onProgress(100);
              resolve(result.secure_url);
            }
          } catch (error) {
            console.error("Error finalizing upload:", error);
            failed = true;
            reject(error);
          }
        }
        return;
      }
      
      // Get next chunk and start upload
      const chunkIndex = chunkQueue.shift()!;
      activeUploads++;
      
      const start = chunkIndex * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      
      try {
        await uploadChunk(
          chunk,
          chunkIndex,
          totalChunks,
          uniqueUploadTag,
          cloudName,
          uploadPreset,
          folder,
          resourceType
        );
        
        completedChunks++;
        uploadedChunks.push(chunkIndex);
        
        // Update progress (cap at 95% until final step)
        const newProgress = Math.min(Math.floor((completedChunks / totalChunks) * 95), 95);
        onProgress(newProgress);
        
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${completedChunks} total)`);
      } catch (error) {
        console.error(`Error uploading chunk ${chunkIndex}:`, error);
        // Put chunk back in queue for retry
        chunkQueue.push(chunkIndex);
      } finally {
        activeUploads--;
        // Process next chunk
        processNextChunk();
      }
      
      // If we have capacity for more uploads, start more
      if (activeUploads < maxConcurrent && chunkQueue.length > 0) {
        processNextChunk();
      }
    };
    
    // Start initial batch of uploads
    const initialBatch = Math.min(maxConcurrent, chunkQueue.length);
    for (let i = 0; i < initialBatch; i++) {
      processNextChunk();
    }
  });
}

/**
 * Upload a single chunk to Cloudinary
 */
async function uploadChunk(
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  uniqueTag: string,
  cloudName: string,
  uploadPreset: string,
  folder: string,
  resourceType: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    // Add chunk data
    formData.append('file', chunk);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    formData.append('public_id', `${uniqueTag}_chunk_${chunkIndex}`);
    
    // Add metadata for chunked upload
    formData.append('tags', uniqueTag);
    formData.append('context', `chunkIndex=${chunkIndex}|totalChunks=${totalChunks}`);
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`Chunk upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

/**
 * Finalize a chunked upload by calling Cloudinary's create_zip endpoint
 * to combine all chunks into a single file
 */
async function finalizeChunkedUpload(
  uniqueTag: string, 
  filename: string,
  totalChunks: number,
  cloudName: string,
  folder: string,
  resourceType: string
): Promise<any> {
  // For finalization, we need to use our server as we need API credentials
  console.log(`Finalizing upload of ${totalChunks} chunks with tag ${uniqueTag}`);
  
  // Send finalization request to our server
  const response = await fetch('/api/upload/finalize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tag: uniqueTag,
      filename: filename,
      totalChunks: totalChunks,
      folder: folder,
      resourceType: resourceType
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to finalize upload: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Helper to create form data for upload
 */
function createFormData(file: File, folder: string): FormData {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', folder === 'podcast-audio' ? 'audio' : 'image');
  formData.append('folder', folder);
  return formData;
}

/**
 * Direct upload to Cloudinary, bypassing our server size limits
 */
async function directCloudinaryUpload(
  file: File, 
  uploadParams: {
    cloudName: string;
    uploadPreset: string;
    folder: string;
    resourceType: string;
  },
  onProgress: (progress: number) => void
): Promise<string> {
  console.log('Starting direct Cloudinary upload with params:', uploadParams);
  
  // Double-check we have the required parameters
  if (!uploadParams.cloudName || !uploadParams.uploadPreset) {
    console.error('Missing required Cloudinary parameters');
    throw new Error('Missing required Cloudinary parameters for direct upload');
  }
  
  const isAudio = uploadParams.resourceType === 'video';
  if (isAudio) {
    console.log('Configuring for audio file upload (using video resource type in Cloudinary)');
  }
  
  // Create upload endpoint URL - this is critical
  // For audio files, we need to use /video/upload not /upload
  const uploadUrl = `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/${uploadParams.resourceType}/upload`;
  console.log('Using Cloudinary upload URL:', uploadUrl);
  
  // Create a new FormData instance for the upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadParams.uploadPreset);
  formData.append('folder', uploadParams.folder);
  
  // Add some metadata to help with debugging
  formData.append('context', 'source=podcast_app|env=production');
  formData.append('public_id', `${Date.now()}_${file.name.replace(/\.[^/.]+$/, "")}`);
  
  return new Promise<string>((resolve, reject) => {
    // Use XMLHttpRequest for better progress tracking
    const xhr = new XMLHttpRequest();
    
    let lastLoggedProgress = 0;
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        // Cap progress at 95% until we get final confirmation
        const progress = Math.min(Math.round((event.loaded / event.total) * 100), 95);
        onProgress(progress);
        
        // Log progress at meaningful intervals for debugging
        if (progress >= lastLoggedProgress + 5 || progress === 95) {
          console.log(`Direct upload progress: ${progress}%`);
          lastLoggedProgress = progress;
        }
      }
    });
    
    xhr.addEventListener('readystatechange', () => {
      console.log(`XHR ready state changed: ${xhr.readyState}`);
    });
    
    xhr.addEventListener('load', () => {
      console.log(`XHR load event fired with status: ${xhr.status}`);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('Direct upload complete, received response from Cloudinary:', response);
          
          // Verify we received a secure_url
          if (response.secure_url) {
            onProgress(100);
            resolve(response.secure_url);
          } else {
            console.error('Cloudinary response missing secure_url:', response);
            reject(new Error('Cloudinary response missing secure_url'));
          }
        } catch (error) {
          console.error('Failed to parse Cloudinary response:', error);
          console.error('Response text:', xhr.responseText);
          reject(new Error(`Failed to parse Cloudinary response: ${error.message}`));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          console.error('Cloudinary upload failed with error:', errorResponse);
          reject(new Error(`Cloudinary upload failed: ${errorResponse.error?.message || 'Unknown error'}`));
        } catch (e) {
          console.error('Cloudinary upload failed with status:', xhr.status);
          console.error('Response text:', xhr.responseText);
          reject(new Error(`Cloudinary upload failed with status: ${xhr.status}`));
        }
      }
    });
    
    xhr.addEventListener('error', (e) => {
      console.error('XHR error event:', e);
      reject(new Error('Cloudinary upload failed due to network error'));
    });
    
    xhr.addEventListener('abort', () => {
      console.warn('XHR abort event fired');
      reject(new Error('Cloudinary upload was aborted'));
    });
    
    // Add timeout handling
    xhr.timeout = 30 * 60 * 1000; // 30 minutes timeout for large files
    xhr.ontimeout = () => {
      console.error('XHR timeout event fired');
      reject(new Error('Upload timed out after 30 minutes'));
    };
    
    try {
      xhr.open('POST', uploadUrl);
      
      console.log('Sending file to Cloudinary:', {
        fileName: file.name,
        fileSize: `${Math.round((file.size / (1024 * 1024)) * 100) / 100}MB`,
        fileType: file.type
      });
      
      xhr.send(formData);
      console.log('XHR request sent successfully');
    } catch (error) {
      console.error('Error sending XHR request:', error);
      reject(error);
    }
  });
} 