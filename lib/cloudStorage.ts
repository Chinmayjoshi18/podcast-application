/**
 * Cloud Storage Utilities for handling large file uploads
 * This module provides functions for chunking and uploading large files to cloud storage
 */

import toast from 'react-hot-toast';

// Global state for tracking multiple file uploads
const uploadProgressMap = new Map<string, number>();

/**
 * Get the current progress of a file upload by ID
 */
export const getUploadProgress = (uploadId: string): number => {
  return uploadProgressMap.get(uploadId) || 0;
}

/**
 * Upload a file to cloud storage
 * 
 * @param file The file to upload
 * @param folder The destination folder in cloud storage
 * @param filename The filename to use in cloud storage
 * @param onProgress Progress callback function
 * @returns Promise resolving to the file URL when complete
 */
export const uploadAudioFile = async (
  file: File,
  folder: string,
  filename: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  // Immediately show some progress to indicate we're starting
  onProgress(1);
  console.log(`Starting upload for ${file.name} (${Math.round(file.size / (1024 * 1024))}MB)`);

  // We're going to use a simple, reliable approach with direct upload to Cloudinary
  const isAudio = folder === 'podcast-audio';
  const resourceType = isAudio ? 'video' : 'auto'; // Cloudinary uses 'video' for audio files
  
  // Cloudinary credentials
  const cloudName = "dbrso3dnr";
  const uploadPreset = "podcast_uploads";
  
  // Construct upload URL - critical to use the right endpoint for audio files
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  
  return new Promise((resolve, reject) => {
    // Set up an XMLHttpRequest for better progress tracking
    const xhr = new XMLHttpRequest();
    
    // Create form data with the file and parameters
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    formData.append('public_id', `podcast_${Date.now()}`);
    
    // Add additional parameters for audio files
    if (isAudio) {
      formData.append('resource_type', 'video');
      formData.append('audio_codec', 'aac');
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
    
    // Add additional event listeners for better debugging
    xhr.addEventListener('loadstart', () => {
      console.log('Upload started');
      // Ensure we show at least 2% progress when starting
      onProgress(2);
    });
    
    xhr.addEventListener('loadend', () => {
      console.log('Upload ended (success or error)');
    });
    
    xhr.addEventListener('error', (error) => {
      console.error('XHR error during upload:', error);
      reject(new Error('Network error during upload'));
    });
    
    xhr.addEventListener('abort', () => {
      console.warn('Upload aborted');
      reject(new Error('Upload was aborted'));
    });
    
    // Handle the response
    xhr.addEventListener('load', () => {
      // Log detailed information about the response
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
          reject(new Error(`Upload failed: ${errorResponse.error?.message || 'Unknown error'}`));
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
    
    // Add a fallback progress timer that ensures progress always increases
    // This helps to provide feedback even if the progress events are not firing
    let currentProgress = 0;
    const progressTimer = setInterval(() => {
      currentProgress += 1;
      if (currentProgress <= 90) {
        console.log(`Fallback progress update: ${currentProgress}%`);
        onProgress(currentProgress);
      } else {
        clearInterval(progressTimer);
      }
    }, 3000); // Update every 3 seconds
    
    // Execute the upload
    try {
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
      console.log('XHR request sent to Cloudinary');
    } catch (error) {
      clearInterval(progressTimer);
      console.error('Error initiating upload:', error);
      reject(error);
    }
    
    // Cleanup function to clear the progress timer when the upload is done
    const cleanup = () => {
      clearInterval(progressTimer);
    };
    
    // Ensure the timer is cleared regardless of success or failure
    xhr.addEventListener('loadend', cleanup);
    xhr.addEventListener('error', cleanup);
    xhr.addEventListener('abort', cleanup);
  });
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