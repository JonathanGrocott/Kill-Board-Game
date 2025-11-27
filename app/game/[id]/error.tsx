'use client';

/**
 * Error Boundary for Game Pages
 * 
 * Catches and displays errors with recovery options
 */

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Game error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center space-y-4">
          <div className="text-6xl">😕</div>
          <h2 className="text-2xl font-bold">Something Went Wrong</h2>
          
          <p className="text-gray-600">
            {error.message || 'An unexpected error occurred while loading the game.'}
          </p>

          {error.digest && (
            <p className="text-xs text-gray-500 font-mono">
              Error ID: {error.digest}
            </p>
          )}

          <div className="space-y-2 pt-4">
            <Button onClick={reset} className="w-full">
              Try Again
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              Back to Home
            </Button>
          </div>

          <div className="text-sm text-gray-500 pt-4">
            <p>If this problem persists:</p>
            <ul className="list-disc list-inside text-left mt-2 space-y-1">
              <li>Check your internet connection</li>
              <li>Try refreshing the page</li>
              <li>Clear your browser cache</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
