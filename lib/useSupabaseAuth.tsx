'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { supabase } from './supabaseClient';

/**
 * SupabaseAuthSync Component
 * This component synchronizes the NextAuth session with Supabase Auth
 * Place it high in your component tree to ensure Supabase auth is always in sync
 */
export const SupabaseAuthSync = () => {
  const { data: session } = useSession();

  useEffect(() => {
    const syncAuth = async () => {
      if (!session?.user) return;
      
      try {
        // Check if we have a JWT token
        // This assumes you've customized NextAuth to include a JWT token
        // that's compatible with Supabase
        const token = (session as any)?.token;
        
        if (token) {
          // Sign in to Supabase with the custom token
          const { error } = await supabase.auth.signInWithPassword({
            email: session.user.email!,
            password: token
          });
          
          if (error) {
            console.error('Error signing in to Supabase:', error);
          } else {
            console.log('Successfully synchronized auth with Supabase');
          }
        } else {
          console.warn('No auth token available for Supabase sync');
        }
      } catch (error) {
        console.error('Failed to sync auth with Supabase:', error);
      }
    };
    
    syncAuth();
  }, [session]);
  
  return null; // This component doesn't render anything
};

/**
 * Custom hook to access Supabase authentication state
 */
export const useSupabaseAuth = () => {
  const { data: session } = useSession();
  
  // Other Supabase auth related utilities can be added here
  
  return {
    isSupabaseAuthenticated: !!session?.user,
    user: session?.user,
  };
}; 