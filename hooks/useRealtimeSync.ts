'use client';

/**
 * useRealtimeSync Hook
 * 
 * Manages Realtime subscriptions for game state synchronization
 * Optimized for <200ms latency with batching and debouncing
 */

import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Game, Player, Marble } from '@/types/game';
import {
  setupGameChannel,
  unsubscribeChannel,
  broadcastDiceRoll,
  broadcastMarbleMove,
  type DiceRollBroadcast,
  type MarbleMoveBroadcast,
} from '@/lib/supabase/realtime';

interface UseRealtimeSyncProps {
  gameId: string;
  currentPlayerId: string;
  onGameUpdate?: (game: Game) => void;
  onMarbleMove?: (marble: Marble, oldPosition: { type: string; index: number | null }) => void;
  onPlayerUpdate?: (player: Player) => void;
  onDiceRoll?: (data: DiceRollBroadcast) => void;
  onPresenceChange?: (state: Record<string, unknown>) => void;
}

export function useRealtimeSync({
  gameId,
  currentPlayerId,
  onGameUpdate,
  onMarbleMove,
  onPlayerUpdate,
  onDiceRoll,
  onPresenceChange,
}: UseRealtimeSyncProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Broadcast dice roll to all players
   */
  const sendDiceRoll = useCallback(
    async (value: number) => {
      if (channelRef.current) {
        await broadcastDiceRoll(channelRef.current, currentPlayerId, value);
      }
    },
    [currentPlayerId]
  );

  /**
   * Broadcast marble move to all players
   */
  const sendMarbleMove = useCallback(
    async (data: MarbleMoveBroadcast) => {
      if (channelRef.current) {
        await broadcastMarbleMove(channelRef.current, data);
      }
    },
    []
  );

  /**
   * Setup Realtime subscriptions
   */
  useEffect(() => {
    // Setup game channel with all callbacks
    const channel = setupGameChannel(gameId, currentPlayerId, {
      onGameUpdate: (game) => {
        onGameUpdate?.(game as Game);
      },
      onMarbleMove: (marble, oldPosition) => {
        onMarbleMove?.(marble as Marble, oldPosition);
      },
      onPlayerUpdate: (player) => {
        onPlayerUpdate?.(player as Player);
      },
      onDiceRoll: (data) => {
        onDiceRoll?.(data);
      },
      onPresenceSync: (state) => {
        onPresenceChange?.(state);
      },
    });

    channelRef.current = channel;

    // Setup presence heartbeat (every 10 seconds)
    presenceIntervalRef.current = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.track({
          player_id: currentPlayerId,
          online_at: new Date().toISOString(),
        });
      }
    }, 10000);

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current);
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [gameId, currentPlayerId, onGameUpdate, onMarbleMove, onPlayerUpdate, onDiceRoll, onPresenceChange]);

  return {
    sendDiceRoll,
    sendMarbleMove,
  };
}
