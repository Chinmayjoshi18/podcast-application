import { createClient } from '@supabase/supabase-js';
import { StorageClient } from '@supabase/storage-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Initialize the Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Initialize the Supabase storage client
export const storage = new StorageClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
  }
);

// Get the current user ID from the session
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

// Synchronize authentication with the Supabase client
export const syncSupabaseAuth = async (accessToken: string) => {
  try {
    // Set the auth cookie
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    });
    
    // Return the session
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (error) {
    console.error('Error synchronizing auth with Supabase:', error);
    return null;
  }
};

// Get the service Supabase client for server-side operations
export const getServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  return createClient(supabaseUrl, serviceRoleKey);
};

// Custom fetch implementation for handling additional headers
function customFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      'Cache-Control': 'no-store',
    },
  });
}

// Error handling function for storage operations
export function handleStorageError(error: any): string {
  console.error('Storage error:', error);
  
  if (error && error.message) {
    return `Error: ${error.message}`;
  }
  
  return 'An unknown error occurred with file storage';
}

// Client component client (for use in client components)
export const createClientComponent = () => {
  return createClientComponentClient<Database>()
} 