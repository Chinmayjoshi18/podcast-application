'use client';

import React, { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { createClientComponent } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function Signup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const [supabase] = useState(() => createClientComponent());
  const [isLoading, setIsLoading] = useState(true);

  // Check for auth errors in URL parameters
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(
        errorParam === 'auth-error' 
          ? 'Authentication failed. Please try again.' 
          : 'An error occurred. Please try again.'
      );
    }
  }, [searchParams]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      } else {
        setIsLoading(false);
      }
    };
    checkUser();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={80}
            height={80}
            className="mx-auto"
          />
          <h1 className="mt-4 text-3xl font-bold">Create an Account</h1>
          <p className="mt-2 text-gray-600">Sign up to start podcasting</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          providers={['google', 'github']}
          redirectTo={`${window.location.origin}/auth/callback`}
          view="sign_up"
        />
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <span>Already have an account? </span>
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}