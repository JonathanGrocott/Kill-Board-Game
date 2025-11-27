/**
 * Realtime Channel Setup Helpers
 * 
 * Helper functions for setting up Supabase Realtime channels
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

export type GameSessionPayload = Database['public']['Tables']['game_sessions']['Row'];
export type PlayerPayload = Database['public']['Tables']['players']['Row'];
export type MarblePayload = Database['public']['Tables']['marbles']['Row'];

export interface DiceRollBroadcast {
  playerId: string;
  value: number;
  timestamp: number;
}

export interface MarbleMoveBroadcast {
  marbleId: string;
  playerId: string;
  fromPosition: { type: string; index: number | null };
  toPosition: { type: string; index: number | null };
  capturedMarbleId?: string;
}

/**
 * Setup lobby channel for pre-game updates
 */
export function setupLobbyChannel(
  gameId: string,
  callbacks: {
    onGameUpdate?: (game: GameSessionPayload) => void;
    onPlayerJoin?: (player: PlayerPayload) => void;
    onPlayerUpdate?: (player: PlayerPayload) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`lobby:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        callbacks.onGameUpdate?.(payload.new as GameSessionPayload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'players',
        filter: `game_session_id=eq.${gameId}`,
      },
      (payload) => {
        callbacks.onPlayerJoin?.(payload.new as PlayerPayload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'players',
        filter: `game_session_id=eq.${gameId}`,
      },
      (payload) => {
        callbacks.onPlayerUpdate?.(payload.new as PlayerPayload);
      }
    );

  channel.subscribe();
  return channel;
}

/**
 * Setup game channel for active game play
 */
export function setupGameChannel(
  gameId: string,
  currentPlayerId: string,
  callbacks: {
    onGameUpdate?: (game: GameSessionPayload) => void;
    onMarbleMove?: (marble: MarblePayload, oldPosition: { type: string; index: number | null }) => void;
    onPlayerUpdate?: (player: PlayerPayload) => void;
    onDiceRoll?: (data: DiceRollBroadcast) => void;
    onPresenceSync?: (state: Record<string, unknown>) => void;
    onPresenceJoin?: (presences: unknown[]) => void;
    onPresenceLeave?: (presences: unknown[]) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`game:${gameId}`)
    // Game state updates
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        callbacks.onGameUpdate?.(payload.new as GameSessionPayload);
      }
    )
    // Marble position updates
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'marbles',
      },
      (payload) => {
        const oldPosition = {
          type: (payload.old as MarblePayload).position_type,
          index: (payload.old as MarblePayload).position_index,
        };
        callbacks.onMarbleMove?.(payload.new as MarblePayload, oldPosition);
      }
    )
    // Player updates
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'players',
        filter: `game_session_id=eq.${gameId}`,
      },
      (payload) => {
        callbacks.onPlayerUpdate?.(payload.new as PlayerPayload);
      }
    )
    // Broadcast: Dice rolls
    .on('broadcast', { event: 'dice_rolled' }, ({ payload }) => {
      callbacks.onDiceRoll?.(payload as DiceRollBroadcast);
    })
    // Presence tracking
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      callbacks.onPresenceSync?.(state);
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
      callbacks.onPresenceJoin?.(newPresences);
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      callbacks.onPresenceLeave?.(leftPresences);
    });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Track presence
      await channel.track({
        player_id: currentPlayerId,
        online_at: new Date().toISOString(),
      });
    }
  });

  return channel;
}

/**
 * Broadcast dice roll event
 */
export async function broadcastDiceRoll(
  channel: RealtimeChannel,
  playerId: string,
  value: number
): Promise<void> {
  await channel.send({
    type: 'broadcast',
    event: 'dice_rolled',
    payload: {
      playerId,
      value,
      timestamp: Date.now(),
    } satisfies DiceRollBroadcast,
  });
}

/**
 * Broadcast marble move event
 */
export async function broadcastMarbleMove(
  channel: RealtimeChannel,
  data: MarbleMoveBroadcast
): Promise<void> {
  await channel.send({
    type: 'broadcast',
    event: 'marble_moved',
    payload: data,
  });
}

/**
 * Unsubscribe from channel
 */
export function unsubscribeChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
