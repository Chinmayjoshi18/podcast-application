/**
 * Cloud Storage Utilities for handling large file uploads
 * This module provides functions for chunking and uploading large files to cloud storage
 */

import toast from 'react-hot-toast';

// Define constants for upload
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
const MAX_RETRIES = 3;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`;
const CLOUDINARY_UPLOAD_PRESET = "podcast_uploads";

// Global state for tracking multiple file uploads
const uploadProgressMap = new Map<string, number>();

/**
 * Get the current progress of a file upload by ID
 */
export const getUploadProgress = (uploadId: string): number => {
  return uploadProgressMap.get(uploadId) || 0;
}

/**
 * Upload a large file to cloud storage with chunking support
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
  // Create unique ID for this upload
  const uploadId = `${folder}_${filename}_${Date.now()}`;
  uploadProgressMap.set(uploadId, 0);

  try {
    const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
    console.log(`Starting upload for ${file.name} (${fileSizeMB}MB)`);
    
    // For very large files (over 50MB), special handling is required
    const isLargeFile = file.size > 50 * 1024 * 1024;
    
    if (isLargeFile) {
      console.log(`Large file detected (${fileSizeMB}MB), using direct Cloudinary upload`);
      
      // First, check with our server for upload parameters
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: createFormData(file, folder),
      });
      
      if (!response.ok) {
        throw new Error(`Server rejected upload request: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // If server returns direct upload instructions
      if (data.success && data.directUpload) {
        console.log('Received direct upload parameters from server');
        
        // Use Cloudinary's direct upload
        return await directCloudinaryUpload(
          file,
          data.uploadParams,
          onProgress
        );
      } else if (data.success && data.url) {
        // If server handled the upload directly
        onProgress(100);
        return data.url;
      } else {
        throw new Error(data.error || 'Unknown error from server');
      }
    }
    
    // For smaller files (under 50MB), use server-side upload
    console.log(`Standard file size (${fileSizeMB}MB), using server upload`);
    
    // Use XMLHttpRequest for better progress tracking
    const url = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          // Cap progress at 95% until we get server confirmation
          const progress = Math.min(Math.round((event.loaded / event.total) * 100), 95);
          onProgress(progress);
          uploadProgressMap.set(uploadId, progress);
          console.log(`Upload progress: ${progress}%`);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.url) {
              // Set to 100% when complete
              onProgress(100);
              uploadProgressMap.set(uploadId, 100);
              resolve(response.url);
            } else {
              reject(new Error(response.error || 'Upload failed with unknown error'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse upload response: ${error.message}`));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });
      
      // Open and send the request
      xhr.open('POST', '/api/upload');
      xhr.send(createFormData(file, folder));
    });
    
    console.log(`Upload completed successfully: ${url}`);
    
    // Validate URL before returning
    if (!url || !url.startsWith('http')) {
      throw new Error(`Invalid URL returned from upload: ${url}`);
    }
    
    return url;
  } catch (error) {
    console.error(`Error uploading file ${file.name}:`, error);
    // Clean up progress tracking
    uploadProgressMap.delete(uploadId);
    throw error;
  }
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
  return new Promise<string>((resolve, reject) => {
    // Create a new FormData instance for the upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadParams.uploadPreset);
    formData.append('folder', uploadParams.folder);
    
    // Construct the Cloudinary upload URL
    const uploadUrl = `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/upload`;
    
    // Use XMLHttpRequest for better progress tracking
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        // Cap progress at 95% until we get final confirmation
        const progress = Math.min(Math.round((event.loaded / event.total) * 100), 95);
        onProgress(progress);
        console.log(`Direct upload progress: ${progress}%`);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('Direct upload complete, received response from Cloudinary');
          onProgress(100);
          resolve(response.secure_url);
        } catch (error) {
          reject(new Error(`Failed to parse Cloudinary response: ${error.message}`));
        }
      } else {
        reject(new Error(`Cloudinary upload failed with status: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Cloudinary upload failed due to network error'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Cloudinary upload was aborted'));
    });
    
    // Open and send the request
    xhr.open('POST', uploadUrl);
    xhr.send(formData);
    
    console.log('Started direct upload to Cloudinary');
  });
}

/**
 * Performs a simple upload for smaller files
 */
const simpleUpload = async (
  file: File,
  folder: string,
  filename: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);
  formData.append('public_id', filename.replace(/\.[^/.]+$/, "")); // Remove extension
  
  // Set up progress tracking with XMLHttpRequest
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });
    
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);
    xhr.send(formData);
  });
}

/**
 * Upload a file in chunks to handle large files
 */
const chunkedUpload = async (
  file: File,
  folder: string,
  filename: string,
  uploadId: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  // Calculate total chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  console.log(`Uploading ${file.name} in ${totalChunks} chunks`);
  
  // Prepare for chunked upload
  const uploadResults: Array<{ etag: string, url: string }> = [];
  let uploadedChunks = 0;
  
  // Create a unique multipart upload ID for this file
  // In a real implementation, you would create a multipart upload on your server or directly with the storage provider
  const multipartId = `${uploadId}_${Date.now()}`;
  
  // Process each chunk
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
    
    let attempts = 0;
    let success = false;
    
    // Retry logic for each chunk
    while (attempts < MAX_RETRIES && !success) {
      try {
        attempts++;
        const chunkResult = await uploadChunk(
          chunk, 
          folder, 
          `${filename}_part${chunkIndex}`, 
          chunkIndex, 
          totalChunks,
          multipartId
        );
        
        uploadResults.push(chunkResult);
        uploadedChunks++;
        
        // Update progress
        const progress = Math.round((uploadedChunks / totalChunks) * 100);
        onProgress(progress);
        uploadProgressMap.set(uploadId, progress);
        
        success = true;
      } catch (error) {
        console.warn(`Error uploading chunk ${chunkIndex}, attempt ${attempts}:`, error);
        
        if (attempts >= MAX_RETRIES) {
          throw new Error(`Failed to upload chunk ${chunkIndex} after ${MAX_RETRIES} attempts`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
      }
    }
  }
  
  // Complete the multipart upload by notifying your server
  // This would typically combine all the chunks into a final file
  // For this demo, we'll just use the URL of the last chunk
  
  // In a real implementation, you would call your server to complete the multipart upload
  // The server would then call the storage provider's API to complete it
  
  // Clean up progress tracking
  uploadProgressMap.delete(uploadId);
  
  // Simulate server-side processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For demo purposes, we'll return the URL of the last chunk
  // In a real implementation, you would return the URL of the combined file
  return uploadResults[uploadResults.length - 1].url;
}

/**
 * Upload a single chunk of a file
 */
const uploadChunk = async (
  chunk: Blob,
  folder: string,
  chunkName: string,
  partNumber: number,
  totalParts: number,
  multipartId: string
): Promise<{ etag: string, url: string }> => {
  const formData = new FormData();
  formData.append('file', chunk);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);
  formData.append('public_id', chunkName);
  
  // Add metadata for chunk tracking
  formData.append('context', JSON.stringify({
    custom: {
      multipartId,
      partNumber,
      totalParts
    }
  }));
  
  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Chunk upload failed with status: ${response.status}`);
  }
  
  const result = await response.json();
  return {
    etag: result.etag,
    url: result.secure_url
  };
} 