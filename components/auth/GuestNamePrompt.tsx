'use client';

/**
 * GuestNamePrompt Component
 * 
 * Modal prompting for display name (2-50 chars) before game creation/joining
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface GuestNamePromptProps {
  onSubmit: (displayName: string) => void;
  onSignIn?: () => void;
  isLoading?: boolean;
}

export function GuestNamePrompt({ onSubmit, onSignIn, isLoading }: GuestNamePromptProps) {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'guest' | 'signin'>('guest');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate display name
    if (!displayName || displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (displayName.trim().length > 50) {
      setError('Display name must be 50 characters or less');
      return;
    }

    onSubmit(displayName.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="p-6 max-w-md w-full">
        {mode === 'guest' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Enter Your Name</h2>
              <p className="text-gray-600 text-sm">
                Choose a display name to play as a guest
              </p>
            </div>

            <div>
              <Input
                type="text"
                placeholder="Your display name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError('');
                }}
                maxLength={50}
                disabled={isLoading}
                autoFocus
                className="w-full"
              />
              {error && (
                <p className="text-red-600 text-sm mt-1">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !displayName.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Please wait...' : 'Play as Guest'}
            </Button>

            {onSignIn && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode('signin')}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Sign In
                </Button>
              </>
            )}

            <p className="text-xs text-gray-500 text-center">
              Your display name is temporary and will only be used for this game session.
              Guest data is automatically deleted after 24 hours.
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Sign In</h2>
              <p className="text-gray-600 text-sm">
                Sign in to save your progress and stats
              </p>
            </div>

            <Button
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              Continue with Sign In
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setMode('guest')}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              Back to Guest Mode
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Signing in allows you to keep your stats and game history
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
