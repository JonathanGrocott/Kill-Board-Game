'use client';

/**
 * ShareLink Component
 * 
 * Copy game URL to clipboard with visual feedback
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ShareLinkProps {
  gameId: string;
}

export function ShareLink({ gameId }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const gameUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/game/${gameId}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
        Share Game Link
      </h3>

      <div className="flex gap-2">
        <Input
          type="text"
          value={gameUrl}
          readOnly
          className="flex-1 font-mono text-sm"
          onClick={(e) => e.currentTarget.select()}
        />
        <Button
          onClick={handleCopy}
          variant={copied ? 'default' : 'outline'}
          className="shrink-0"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Share this link with friends to invite them to your game
      </p>
    </div>
  );
}
