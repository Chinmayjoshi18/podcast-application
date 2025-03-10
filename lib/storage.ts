// Client-side wrapper for Prisma database operations
import prisma from './prismadb';
import { uploadAudioFile } from './fileStorage';

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

// Upload audio file to Supabase Storage
export const uploadLargeFile = async (
  file: File,
  onProgress?: (progress: number) => void,
  fileType: string = 'auto',
): Promise<string> => {
  if (!file) throw new Error('No file provided');
  
  // Determine folder based on file type
  const folder = fileType === 'audio' ? 'podcast-audio' : 'images';
  
  // Use our file storage implementation
  return uploadAudioFile(
    file,
    folder,
    file.name,
    onProgress || (() => {})
  );
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

// Create a new podcast in the database
export const addPodcast = async (podcast: Omit<Podcast, 'id' | 'createdAt' | 'updatedAt'>): Promise<Podcast> => {
  const response = await fetch('/api/podcasts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(podcast),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create podcast');
  }

  return response.json();
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