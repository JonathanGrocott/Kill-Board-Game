'use client';

/**
 * Game Lobby Page
 * 
 * Shows players waiting for game to start, with share link and auto-start
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlayerList } from '@/components/lobby/PlayerList';
import { ShareLink } from '@/components/lobby/ShareLink';
import { supabase } from '@/lib/supabase/client';
import { setupLobbyChannel, unsubscribeChannel } from '@/lib/supabase/realtime';
import type { Game, Player } from '@/types/game';

interface GameLobbyPageProps {
  params: {
    id: string;
  };
}

export default function GameLobbyPage({ params }: GameLobbyPageProps) {
  const router = useRouter();
  const gameId = params.id;

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

      if (data) {
        setGame(data.game as Game);
        setPlayers(data.players as Player[]);
      }
    } catch (err) {
      console.error('Failed to load game:', err);
      setError('Failed to load game. Please check the game ID.');
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

  // Setup Realtime subscriptions
  useEffect(() => {
    const channel = setupLobbyChannel(gameId, {
      onGameUpdate: (updatedGame) => {
        setGame(updatedGame as Game);
        
        // Auto-navigate to play page when game starts
        if (updatedGame.status === 'active') {
          router.push(`/game/${gameId}/play`);
        }
      },
      onPlayerJoin: (newPlayer) => {
        setPlayers((prev) => [...prev, newPlayer as Player]);
      },
      onPlayerUpdate: (updatedPlayer) => {
        setPlayers((prev) =>
          prev.map((p) => (p.id === updatedPlayer.id ? (updatedPlayer as Player) : p))
        );
      },
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [gameId, router]);

  const handleAddBot = async () => {
    try {
      const { error: rpcError } = await supabase.rpc('add_bot_player', {
        p_game_id: gameId,
      });

      if (rpcError) throw rpcError;
    } catch (err) {
      console.error('Failed to add bot:', err);
      setError('Failed to add bot player');
    }
  };

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
  const canAddBot = !isGameFull && game.status === 'waiting';

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
            {canAddBot && (
              <Button
                onClick={handleAddBot}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Add Bot Player
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
