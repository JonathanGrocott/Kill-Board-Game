'use client';

/**
 * AddBotButton Component
 * 
 * Button to add bot players to the lobby
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

interface AddBotButtonProps {
  gameId: string;
  currentPlayerCount: number;
  maxPlayers: number;
  disabled?: boolean;
  onBotAdded?: () => void;
}

export function AddBotButton({
  gameId,
  currentPlayerCount,
  maxPlayers,
  disabled,
  onBotAdded,
}: AddBotButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canAddBot = currentPlayerCount < maxPlayers;

  const handleAddBot = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { error: rpcError } = await supabase.rpc('add_bot_player', {
        p_game_id: gameId,
      });

      if (rpcError) {
        throw rpcError;
      }

      // Trigger callback to refresh game state
      if (onBotAdded) {
        onBotAdded();
      }
    } catch (err) {
      console.error('Failed to add bot:', err);
      setError(err instanceof Error ? err.message : 'Failed to add bot');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canAddBot) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleAddBot}
        disabled={disabled || isLoading || !canAddBot}
        variant="outline"
        className="w-full"
      >
        {isLoading ? 'Adding Bot...' : '🤖 Add Bot Player'}
      </Button>
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}
