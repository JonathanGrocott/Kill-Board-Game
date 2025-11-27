'use client';

/**
 * useRealtimeSync Hook
 * 
 * Manages Realtime subscriptions for game state synchronization
 * Optimized for <200ms latency with batching and debouncing
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Game, Player, Marble } from '@/types/game';
import { supabase } from '@/lib/supabase/client';
import {
  setupGameChannel,
  unsubscribeChannel,
  broadcastDiceRoll,
  broadcastMarbleMove,
  type DiceRollBroadcast,
  type MarbleMoveBroadcast,
} from '@/lib/supabase/realtime';

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

interface UseRealtimeSyncProps {
  gameId: string;
  currentPlayerId: string;
  onGameUpdate?: (game: Game) => void;
  onMarbleMove?: (marble: Marble, oldPosition: { type: string; index: number | null }) => void;
  onPlayerUpdate?: (player: Player) => void;
  onDiceRoll?: (data: DiceRollBroadcast) => void;
  onPresenceChange?: (state: Record<string, unknown>) => void;
  onReconnect?: () => void;
}

export function useRealtimeSync({
  gameId,
  currentPlayerId,
  onGameUpdate,
  onMarbleMove,
  onPlayerUpdate,
  onDiceRoll,
  onPresenceChange,
  onReconnect,
}: UseRealtimeSyncProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  /**
   * Update player presence in database
   */
  const updatePresence = useCallback(async (isConnected: boolean) => {
    if (!currentPlayerId) return;

    try {
      await supabase.rpc('update_player_presence', {
        p_player_id: currentPlayerId,
        p_is_connected: isConnected,
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, [currentPlayerId]);

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
    if (!currentPlayerId) return;

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

    // Listen to channel status for connection state
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('connected');
        await updatePresence(true);
        // Call reconnect callback to sync state
        onReconnect?.();
      } else if (status === 'CHANNEL_ERROR') {
        setConnectionState('disconnected');
      } else if (status === 'TIMED_OUT') {
        setConnectionState('reconnecting');
      }
    });

    // Setup presence heartbeat (every 10 seconds)
    presenceIntervalRef.current = setInterval(async () => {
      if (channelRef.current) {
        // Track presence in Realtime
        channelRef.current.track({
          player_id: currentPlayerId,
          online_at: new Date().toISOString(),
        });

        // Update database presence
        await updatePresence(true);
      }
    }, 10000);

    // Cleanup on unmount
    return () => {
      // Mark as disconnected
      updatePresence(false);
      
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current);
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [gameId, currentPlayerId, onGameUpdate, onMarbleMove, onPlayerUpdate, onDiceRoll, onPresenceChange, onReconnect, updatePresence]);

  return {
    sendDiceRoll,
    sendMarbleMove,
    connectionState,
  };
}
