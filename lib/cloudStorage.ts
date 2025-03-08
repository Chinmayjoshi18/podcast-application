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
      console.log('Requesting upload parameters from server...');
      
      // Create a fixed set of parameters if server is unreachable
      const fallbackParams = {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'podcast_uploads',
        folder: folder,
        resourceType: folder === 'podcast-audio' ? 'video' : 'auto'
      };
      
      // Log what we're using for debugging
      console.log('Using upload preset:', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
      console.log('Using cloud name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: createFormData(file, folder),
        });
        
        if (!response.ok) {
          console.warn(`Server rejected upload request with status ${response.status}, using fallback`);
          // Use fallback for direct upload instead of failing
          onProgress(1); // Show a small amount of progress
          return await directCloudinaryUpload(file, fallbackParams, onProgress);
        }
        
        const data = await response.json();
        console.log('Server response:', data);
        
        // If server returns direct upload instructions
        if (data.success && data.directUpload) {
          console.log('Received direct upload parameters from server');
          onProgress(1); // Show a small amount of progress
          
          // Validate required fields
          const params = data.uploadParams;
          if (!params.cloudName || !params.uploadPreset) {
            console.warn('Missing required upload parameters, using fallback');
            return await directCloudinaryUpload(file, fallbackParams, onProgress);
          }
          
          // Use Cloudinary's direct upload
          return await directCloudinaryUpload(file, params, onProgress);
        } else if (data.success && data.url) {
          // If server handled the upload directly
          onProgress(100);
          return data.url;
        } else {
          console.warn('Server returned unexpected response, using fallback');
          onProgress(1); // Show a small amount of progress
          return await directCloudinaryUpload(file, fallbackParams, onProgress);
        }
      } catch (error) {
        console.error('Error communicating with server:', error);
        console.log('Using fallback upload parameters');
        onProgress(1); // Show a small amount of progress
        return await directCloudinaryUpload(file, fallbackParams, onProgress);
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
  console.log('Starting direct Cloudinary upload with params:', uploadParams);
  
  // Ensure we have the required parameters
  if (!uploadParams.cloudName || !uploadParams.uploadPreset) {
    console.error('Missing required Cloudinary parameters');
    throw new Error('Missing required Cloudinary parameters');
  }
  
  return new Promise<string>((resolve, reject) => {
    // Create a new FormData instance for the upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadParams.uploadPreset);
    formData.append('folder', uploadParams.folder);
    
    // For audio files, use the right resource type
    const isAudio = uploadParams.resourceType === 'video';
    if (isAudio) {
      // Audio files are uploaded as 'video' type in Cloudinary
      console.log('Configuring for audio file upload (using video resource type)');
    }
    
    // Construct the Cloudinary upload URL with the correct resource type
    const uploadUrl = `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/${uploadParams.resourceType}/upload`;
    console.log('Using Cloudinary upload URL:', uploadUrl);
    
    // Use XMLHttpRequest for better progress tracking
    const xhr = new XMLHttpRequest();
    
    let lastLoggedProgress = 0;
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        // Cap progress at 95% until we get final confirmation
        const progress = Math.min(Math.round((event.loaded / event.total) * 100), 95);
        onProgress(progress);
        
        // Don't log every tiny change, only log when progress changes by at least 5%
        if (progress >= lastLoggedProgress + 5 || progress === 95) {
          console.log(`Direct upload progress: ${progress}%`);
          lastLoggedProgress = progress;
        }
      }
    });
    
    xhr.addEventListener('load', () => {
      console.log(`XHR load event fired with status: ${xhr.status}`);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('Direct upload complete, received response from Cloudinary:', response);
          onProgress(100);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error('Cloudinary response missing secure_url'));
          }
        } catch (error) {
          console.error('Failed to parse Cloudinary response:', error);
          console.error('Response text:', xhr.responseText);
          reject(new Error(`Failed to parse Cloudinary response: ${error.message}`));
        }
      } else {
        console.error('Cloudinary upload failed with status:', xhr.status);
        console.error('Response text:', xhr.responseText);
        reject(new Error(`Cloudinary upload failed with status: ${xhr.status}`));
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
    
    console.log('Opening XHR request to Cloudinary...');
    xhr.open('POST', uploadUrl);
    
    console.log('Sending file to Cloudinary:', {
      fileName: file.name,
      fileSize: `${Math.round((file.size / (1024 * 1024)) * 100) / 100}MB`,
      fileType: file.type
    });
    
    try {
      xhr.send(formData);
      console.log('XHR request sent successfully');
    } catch (error) {
      console.error('Error sending XHR request:', error);
      reject(error);
    }
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