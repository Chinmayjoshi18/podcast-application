'use client';

import { useEffect } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
        <FiAlertTriangle className="mx-auto text-5xl text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded p-4 mb-6 overflow-auto max-h-32">
          <p className="text-red-700 dark:text-red-300 text-sm break-words">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          We apologize for the inconvenience. Please try again or contact support if the problem persists.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoHome}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Go Home
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
} 