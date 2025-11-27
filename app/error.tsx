'use client';

/**
 * Root Error Boundary
 * 
 * Catches errors at the application root level
 */

import React, { useEffect } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center space-y-4">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold">Application Error</h2>
            
            <p className="text-gray-600">
              {error.message || 'Something went wrong with the application.'}
            </p>

            {error.digest && (
              <p className="text-xs text-gray-500 font-mono">
                Error ID: {error.digest}
              </p>
            )}

            <div className="space-y-2 pt-4">
              <button
                onClick={reset}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
