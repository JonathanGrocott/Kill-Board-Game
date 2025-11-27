'use client';

/**
 * Home Page
 * 
 * Entry point with Create Game and Join Game options
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { GuestNamePrompt } from '@/components/auth/GuestNamePrompt';
import { supabase } from '@/lib/supabase/client';
import { signInAsGuest } from '@/lib/auth/guest';

export default function HomePage() {
  const router = useRouter();
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [promptAction, setPromptAction] = useState<'create' | 'join'>('create');
  const [gameId, setGameId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateGame = () => {
    setPromptAction('create');
    setShowNamePrompt(true);
  };

  const handleJoinGame = () => {
    if (!gameId.trim()) {
      setError('Please enter a game ID');
      return;
    }
    setPromptAction('join');
    setShowNamePrompt(true);
  };

  const handleNameSubmit = async (displayName: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Sign in as guest
      const { user, error: authError } = await signInAsGuest(displayName);
      
      if (authError || !user) {
        throw new Error(authError || 'Failed to sign in');
      }

      if (promptAction === 'create') {
        // Create new game
        const { data, error: rpcError } = await supabase.rpc('create_game_session', {
          p_display_name: displayName,
          p_num_players: 4,
          p_enable_shortcuts: true,
        });

        if (rpcError) throw rpcError;

        if (data && data.game_id) {
          router.push(`/game/${data.game_id}`);
        }
      } else {
        // Join existing game
        const { data, error: rpcError } = await supabase.rpc('join_game_session', {
          p_game_id: gameId,
          p_display_name: displayName,
        });

        if (rpcError) {
          // Check for game full error
          if (rpcError.message?.includes('GAME_FULL')) {
            throw new Error('This game is full. Please create a new game or join a different one.');
          }
          if (rpcError.message?.includes('GAME_STARTED')) {
            throw new Error('This game has already started. Please create a new game or join a different one.');
          }
          if (rpcError.message?.includes('GAME_NOT_FOUND')) {
            throw new Error('Game not found. Please check the game ID and try again.');
          }
          throw rpcError;
        }

        router.push(`/game/${gameId}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
      setShowNamePrompt(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3">🎲 Aggravation</h1>
          <p className="text-xl text-gray-600 mb-2">
            The Classic Board Game - Online Multiplayer
          </p>
          <p className="text-gray-500">
            Race your marbles home, capture opponents, and use shortcuts to victory!
          </p>
        </div>

        {/* How to Play */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-2">How to Play:</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Roll the dice and move your marbles around the board</li>
            <li>• Get all 4 marbles to your home zone to win</li>
            <li>• Land on opponents to send them back to start</li>
            <li>• Take shortcuts after completing one lap</li>
            <li>• Play with 2-4 players</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Create Game */}
          <div>
            <Button
              onClick={handleCreateGame}
              size="lg"
              className="w-full text-lg h-14"
              disabled={isLoading}
            >
              Create New Game
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Join Game */}
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter Game ID"
              value={gameId}
              onChange={(e) => {
                setGameId(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              className="text-center font-mono"
            />
            <Button
              onClick={handleJoinGame}
              size="lg"
              variant="outline"
              className="w-full text-lg h-14"
              disabled={isLoading || !gameId.trim()}
            >
              Join Game
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>No account needed • Guest mode • Free to play</p>
        </div>
      </Card>

      {/* Name prompt modal */}
      {showNamePrompt && (
        <GuestNamePrompt
          onSubmit={handleNameSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

