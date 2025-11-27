'use client';

/**
 * Game Lobby Page
 * 
 * Shows players waiting for game to start, with share link and auto-start
 */

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlayerList } from '@/components/lobby/PlayerList';
import { ShareLink } from '@/components/lobby/ShareLink';
import { AddBotButton } from '@/components/lobby/AddBotButton';
import { supabase } from '@/lib/supabase/client';
import { setupLobbyChannel, unsubscribeChannel } from '@/lib/supabase/realtime';
import type { Game, Player } from '@/types/game';

interface GameLobbyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GameLobbyPage({ params }: GameLobbyPageProps) {
  const router = useRouter();
  const { id: gameId } = use(params);

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load game data
  const loadGameData = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_game_state', {
        p_game_id: gameId,
      });

      if (rpcError) throw rpcError;

      if (!data) {
        throw new Error('Game not found');
      }

      if (data && typeof data === 'object' && data !== null) {
        // The RPC returns the game data directly with nested players array
        const gameData = data as any;
        const { players: playersData, ...gameInfo } = gameData;
        setGame(gameInfo as Game);
        setPlayers((playersData || []) as Player[]);
      }
    } catch (err) {
      console.error('Failed to load game:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));

      // Provide more specific error messages
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'PGRST116') {
        setError('Game not found. The game may have expired or the ID is incorrect.');
      } else if (errorObj?.message) {
        setError(`Failed to load game: ${errorObj.message}`);
      } else {
        setError('Failed to load game. Please check the game ID and ensure database migrations are applied.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Load game on mount
  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

  // Fallback: Poll game status if real-time doesn't trigger redirect
  useEffect(() => {
    if (!game) return;

    // If game is already active, redirect immediately
    if (game.status === 'active') {
      console.log('[Lobby] Game is active on mount, redirecting...');
      router.push(`/game/${gameId}/play`);
      return;
    }

    // Set up polling interval to check game status
    console.log('[Lobby] Setting up fallback polling interval');
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.rpc('get_game_state', {
          p_game_id: gameId,
        });

        if (!error && data) {
          const gameData = data as any;
          const currentStatus = gameData.status;
          console.log('[Lobby Polling] Current game status:', currentStatus);

          if (currentStatus === 'active') {
            console.log('[Lobby Polling] Game is ACTIVE! Redirecting...');
            clearInterval(pollInterval);
            router.push(`/game/${gameId}/play`);
          }
        }
      } catch (err) {
        console.error('[Lobby Polling] Error checking game status:', err);
      }
    }, 2000); // Poll every 2 seconds

    // Clean up interval
    return () => {
      console.log('[Lobby] Clearing fallback polling interval');
      clearInterval(pollInterval);
    };
  }, [game, gameId, router]);

  // Setup Realtime subscriptions
  useEffect(() => {
    console.log('[Lobby] Setting up real-time subscription for game:', gameId);

    const channel = setupLobbyChannel(gameId, {
      onGameUpdate: (updatedGame) => {
        console.log('[Lobby] Game update received:', {
          status: updatedGame.status,
          currentTurnPlayerId: updatedGame.current_turn_player_id,
          fullGameData: updatedGame
        });

        setGame(updatedGame as Game);

        // Auto-navigate to play page when game starts
        if (updatedGame.status === 'active') {
          console.log('[Lobby] Game is ACTIVE! Redirecting to play page...');
          router.push(`/game/${gameId}/play`);
        } else {
          console.log('[Lobby] Game status is still:', updatedGame.status);
        }
      },
      onPlayerJoin: (newPlayer) => {
        console.log('[Lobby] Player joined:', newPlayer.display_name, newPlayer.color);
        setPlayers((prev) => [...prev, newPlayer as Player]);
      },
      onPlayerUpdate: (updatedPlayer) => {
        console.log('[Lobby] Player updated:', updatedPlayer.display_name);
        setPlayers((prev) =>
          prev.map((p) => (p.id === updatedPlayer.id ? (updatedPlayer as Player) : p))
        );
      },
    });

    console.log('[Lobby] Real-time channel created, subscribing...');

    return () => {
      console.log('[Lobby] Unsubscribing from real-time channel');
      unsubscribeChannel(channel);
    };
  }, [gameId, router]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading lobby...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-red-600 mb-4">{error || 'Game not found'}</p>
          <Button onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  const isGameFull = players.length >= game.num_players;
  const isHost = players.length > 0 && players[0].user_id === currentUserId;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto py-8">
        <Card className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Game Lobby</h1>
            <p className="text-gray-600">
              {game.status === 'waiting' ? 'Waiting for players...' : 'Game starting...'}
            </p>
          </div>

          {/* Share Link */}
          <div className="mb-6">
            <ShareLink gameId={gameId} />
          </div>

          {/* Player List */}
          <div className="mb-6">
            <PlayerList players={players} maxPlayers={game.num_players} />
          </div>

          {/* Game Full Message */}
          {isGameFull && game.status === 'waiting' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 font-semibold text-center">
                ✓ All players ready! Game will start automatically...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <AddBotButton
              gameId={gameId}
              currentPlayerCount={players.length}
              maxPlayers={game.num_players}
              disabled={game.status !== 'waiting'}
              onBotAdded={loadGameData}
            />

            {/* Manual Start Game Button (for testing with bots) */}
            {players.length >= 2 && game.status === 'waiting' && isHost && (
              <Button
                onClick={async () => {
                  try {
                    const firstPlayer = players.find(p => p.position_order === 1);
                    if (!firstPlayer) return;

                    const { error } = await supabase
                      .from('game_sessions')
                      .update({
                        status: 'active',
                        current_turn_player_id: firstPlayer.id,
                        turn_started_at: new Date().toISOString(),
                      })
                      .eq('id', gameId);

                    if (error) throw error;
                  } catch (err) {
                    console.error('Failed to start game:', err);
                  }
                }}
                className="w-full"
              >
                Start Game ({players.length} Players)
              </Button>
            )}

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Leave Lobby
            </Button>
          </div>

          {/* Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Game ID: <span className="font-mono">{gameId.slice(0, 8)}</span>
            </p>
            {isHost && (
              <p className="mt-1 text-blue-600">You are the host</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
