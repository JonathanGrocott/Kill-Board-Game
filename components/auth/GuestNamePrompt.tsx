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
  isLoading?: boolean;
}

export function GuestNamePrompt({ onSubmit, isLoading }: GuestNamePromptProps) {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4">
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
            {isLoading ? 'Please wait...' : 'Continue'}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your display name is temporary and will only be used for this game session
          </p>
        </form>
      </Card>
    </div>
  );
}
