'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaGoogle, FaGithub } from 'react-icons/fa';

const SignUp = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create user account
      await axios.post('/api/register', formData);
      toast.success('Account created!');
      
      // Sign in the user
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error('Failed to sign in after registration');
        return;
      }

      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    
    try {
      await signIn(provider, { 
        callbackUrl: '/dashboard',
        redirect: true 
      });
    } catch (error) {
      toast.error('Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input"
                placeholder="Your name"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                style={{ color: 'black' }}
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                style={{ color: 'black' }}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                style={{ color: 'black' }}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full flex justify-center py-2 px-4"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
              className="btn btn-outline w-full flex items-center justify-center"
            >
              <FaGoogle className="mr-2" />
              Google
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('github')}
              disabled={isLoading}
              className="btn btn-outline w-full flex items-center justify-center"
            >
              <FaGithub className="mr-2" />
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;