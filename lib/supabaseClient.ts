import { createClient } from '@supabase/supabase-js';
import { StorageClient } from '@supabase/storage-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing! Please check your environment variables.');
}

// Create the Supabase client with enhanced storage options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: customFetch
  }
});

// Function to get a server-side client with service role (for admin operations)
export const getServiceSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing. Server-side operations may fail.');
    return null;
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: customFetch
    }
  });
};

/**
 * Custom fetch implementation with timeout and retry capabilities
 * This enhances all network requests made by the Supabase client
 */
function customFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Default timeout of 30 seconds
  const timeout = 30000;
  
  return new Promise((resolve, reject) => {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    // Add the signal to the fetch options
    const fetchOptions: RequestInit = {
      ...init,
      signal: controller.signal
    };
    
    // Execute the fetch
    fetch(url, fetchOptions)
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        
        // Handle network errors more gracefully
        if (error.name === 'AbortError') {
          console.error(`Request to ${url.toString()} timed out after ${timeout}ms`);
          reject(new Error(`Request timed out. Please check your internet connection.`));
        } else if (error.message?.includes('Failed to fetch')) {
          console.error(`Network error for ${url.toString()}: ${error.message}`);
          reject(new Error(`Network error. Please check your internet connection.`));
        } else {
          reject(error);
        }
      });
  });
}

// For direct access to storage API with extended methods
export const storageClient = new StorageClient(supabaseUrl, {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
});

// Helper for handling storage errors
export function handleStorageError(error: any): string {
  if (!error) return 'Unknown error';
  
  // Common storage errors
  if (error.statusCode === 413) {
    return 'File too large. Please upload a smaller file.';
  } else if (error.statusCode === 401 || error.statusCode === 403) {
    return 'Unauthorized. Please sign in again.';
  } else if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
    return 'Network error. Please check your internet connection.';
  } else if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
    return 'Upload timed out. Please try again with a better connection.';
  }
  
  return error.message || 'Storage operation failed';
} 