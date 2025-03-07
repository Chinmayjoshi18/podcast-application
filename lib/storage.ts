// Client-side wrapper for Prisma database operations
import prisma from './prismadb';

export interface Podcast {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  coverImage?: string;
  duration?: number;
  createdAt: string;
  updatedAt?: string;
  listens?: number;
  likes?: number;
  comments?: number;
  isPublic: boolean;
  userId: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  tags?: { id: string; name: string }[];
}

// Upload audio file directly to Cloudinary with chunking
export const uploadLargeFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // For extremely large files (over 50MB), use the server-side upload
  const EXTREMELY_LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB in bytes
  
  try {
    // For extremely large files, use our server-side API
    if (file.size > EXTREMELY_LARGE_FILE_THRESHOLD) {
      // Since we can't track progress with this method, simulate progress updates
      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        simulatedProgress += Math.floor(Math.random() * 5) + 1; // Increase by 1-5% each time
        if (simulatedProgress > 95) {
          simulatedProgress = 95; // Cap at 95% until actually complete
          clearInterval(progressInterval);
        }
        if (onProgress) onProgress(simulatedProgress);
      }, 1000);
      
      // Prepare the FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('resourceType', 'auto');
      formData.append('uploadPreset', 'podcast_uploads');
      
      // Send to our custom API endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      // Clear the interval once complete
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      if (onProgress) onProgress(100); // Set to 100% when complete
      return data.secure_url;
    }
    
    // For large but not extremely large files, use the Cloudinary direct upload API
    // Set up the upload parameters
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'podcast_uploads'); // Create this preset in your Cloudinary dashboard
    formData.append('resource_type', 'auto');
    
    // For large files, we'll use the Cloudinary Upload API which handles chunking automatically
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    
    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.onabort = () => reject(new Error('Upload aborted'));
      
      // Open and send the request
      xhr.open('POST', uploadUrl, true);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Error uploading large file:', error);
    throw error;
  }
};

// These functions can be used client-side to make fetch requests to the API

// Get all podcasts via API
export const getAllPodcasts = async (): Promise<Podcast[]> => {
  try {
    const response = await fetch('/api/podcasts');
    if (!response.ok) throw new Error('Failed to fetch podcasts');
    return response.json();
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    return [];
  }
};

// Get podcasts for a specific user
export const getUserPodcasts = async (userId: string): Promise<Podcast[]> => {
  try {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}/podcasts`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching user podcasts:', error);
    throw error;
  }
};

// Get public podcasts for the explore page
export const getPublicPodcasts = async (): Promise<Podcast[]> => {
  try {
    const response = await fetch('/api/podcasts?isPublic=true');
    if (!response.ok) throw new Error('Failed to fetch public podcasts');
    return response.json();
  } catch (error) {
    console.error('Error fetching public podcasts:', error);
    return [];
  }
};

// Add a new podcast
export const addPodcast = async (podcastData: Omit<Podcast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Podcast> => {
  try {
    const response = await fetch('/api/podcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(podcastData),
    });
    
    if (!response.ok) throw new Error('Failed to create podcast');
    return response.json();
  } catch (error) {
    console.error('Error creating podcast:', error);
    throw error;
  }
};

// Update an existing podcast
export const updatePodcast = async (podcastId: string, updates: Partial<Podcast>): Promise<Podcast | null> => {
  try {
    const response = await fetch(`/api/podcasts/${podcastId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) throw new Error('Failed to update podcast');
    return response.json();
  } catch (error) {
    console.error('Error updating podcast:', error);
    return null;
  }
};

// Delete a podcast
export const deletePodcast = async (podcastId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/podcasts/${podcastId}`, {
      method: 'DELETE',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error deleting podcast:', error);
    return false;
  }
};

// For backward compatibility with any existing code using the old synchronous functions
// these will be mocked with stub implementations that call the async versions
export const getAllPodcastsSync = (): Podcast[] => {
  console.warn('Using synchronous version of getAllPodcasts which returns empty array. Update to async version.');
  return [];
};

export const getUserPodcastsSync = (userId: string): Podcast[] => {
  console.warn('Using synchronous version of getUserPodcasts which returns empty array. Update to async version.');
  return [];
};

export const getPublicPodcastsSync = (): Podcast[] => {
  console.warn('Using synchronous version of getPublicPodcasts which returns empty array. Update to async version.');
  return [];
}; 