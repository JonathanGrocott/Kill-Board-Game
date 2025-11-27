'use client';

/**
 * useGameState Hook
 * 
 * Manages local game state and provides methods to interact with game via RPC calls
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { GameState, MoveResult, DiceRollResult, Game, Player, Marble } from '@/types/game';
import { getErrorMessage } from '@/lib/utils/errors';

export function useGameState(gameId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedMarbleId, setSelectedMarbleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current game state from database
   */
  const refreshGameState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useGameState] Fetching game state for:', gameId);

      const { data, error: rpcError } = await supabase.rpc('get_game_state', {
        p_game_id: gameId,
      });

      console.log('[useGameState] RPC response:', { data, error: rpcError });

      if (rpcError) {
        console.error('[useGameState] RPC error:', rpcError);
        throw rpcError;
      }

      if (data) {
        // RPC returns flat structure: { id, status, players, marbles, ... }
        // We need to restructure it to: { game: {...}, players: [...], marbles: [...] }
        const rawData = data as Record<string, unknown>;
        const { players, marbles, ...gameProps } = rawData;
        
        console.log('[useGameState] Setting game state:', { gameProps, players, marbles });
        
        setGameState({
          game: gameProps as unknown as Game,
          players: (players || []) as unknown as Player[],
          marbles: (marbles || []) as unknown as Marble[],
        });
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Failed to refresh game state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  /**
   * Roll dice for current turn
   */
  const rollDice = useCallback(async (): Promise<DiceRollResult | null> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Rolling dice for game:', gameId);

      const { data, error: rpcError } = await supabase.rpc('roll_dice', {
        p_game_id: gameId,
      });

      console.log('Roll dice response:', { data, error: rpcError });

      if (rpcError) {
        console.error('RPC Error details:', {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint,
        });
        throw rpcError;
      }

      if (!data) {
        throw new Error('No data returned from roll_dice');
      }

      return data as unknown as DiceRollResult;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Failed to roll dice:', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', err ? Object.keys(err) : 'null');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  /**
   * Move a marble
   */
  const moveMarble = useCallback(
    async (marbleId: string): Promise<MoveResult | null> => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('[moveMarble] Calling RPC with:', { gameId, marbleId });

        const { data, error: rpcError } = await supabase.rpc('move_marble', {
          p_game_id: gameId,
          p_marble_id: marbleId,
        });

        console.log('[moveMarble] RPC response:', { data, error: rpcError });

        if (rpcError) {
          console.error('[moveMarble] RPC error details:', JSON.stringify(rpcError, null, 2));
          throw rpcError;
        }

        // Clear selected marble after successful move
        setSelectedMarbleId(null);

        return data as unknown as MoveResult;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        // Log all error properties for debugging
        console.error('Failed to move marble:', err);
        if (err && typeof err === 'object') {
          console.error('Error properties:', Object.entries(err));
          console.error('Error JSON:', JSON.stringify(err, null, 2));
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [gameId]
  );

  /**
   * Pass turn (when no valid moves or timeout)
   */
  const passTurn = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: rpcError } = await supabase.rpc('pass_turn', {
        p_game_id: gameId,
      });

      if (rpcError) {
        throw rpcError;
      }

      setSelectedMarbleId(null);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Failed to pass turn:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  /**
   * Update player presence (heartbeat)
   */
  const updatePresence = useCallback(async (playerId: string): Promise<void> => {
    try {
      await supabase.rpc('update_player_presence', {
        p_player_id: playerId,
      });
    } catch (err) {
      console.error('Failed to update presence:', err);
      // Don't set error state for heartbeat failures
    }
  }, []);

  /**
   * Select a marble for movement
   */
  const selectMarble = useCallback((marbleId: string | null) => {
    setSelectedMarbleId(marbleId);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    gameState,
    selectedMarbleId,
    isLoading,
    error,

    // Actions
    refreshGameState,
    rollDice,
    moveMarble,
    passTurn,
    updatePresence,
    selectMarble,
    clearError,

    // Helpers
    setGameState,
  };
}
