'use client';

/**
 * Game Play Page
 * 
 * Main game interface with board, dice, turn indicators, and real-time sync
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Board } from '@/components/game/Board';
import { Dice } from '@/components/game/Dice';
import { TurnIndicator } from '@/components/game/TurnIndicator';
import { TurnTimer } from '@/components/game/TurnTimer';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { useGameState } from '@/hooks/useGameState';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import type { Marble } from '@/types/game';
import { canRollDice, canMoveMarble as canMoveMarbleRule } from '@/lib/game/rules';
import { getValidMarbles } from '@/lib/game/moves';

interface GamePlayPageProps {
  params: {
    id: string;
  };
}

export default function GamePlayPage({ params }: GamePlayPageProps) {
  const router = useRouter();
  const gameId = params.id;

  const {
    gameState,
    selectedMarbleId,
    isLoading,
    error,
    refreshGameState,
    rollDice,
    moveMarble,
    selectMarble,
    setGameState,
  } = useGameState(gameId);

  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [isRolling, setIsRolling] = useState(false);
  const [validMarbleIds, setValidMarbleIds] = useState<string[]>([]);

  // Setup Realtime sync
  const { sendDiceRoll } = useRealtimeSync({
    gameId,
    currentPlayerId,
    onGameUpdate: (game) => {
      if (gameState) {
        setGameState({
          ...gameState,
          game,
        });
      }
    },
    onMarbleMove: (marble) => {
      if (gameState) {
        const updatedMarbles = gameState.marbles.map((m) =>
          m.id === marble.id ? marble : m
        );
        setGameState({
          ...gameState,
          marbles: updatedMarbles,
        });
      }
    },
    onPlayerUpdate: (player) => {
      if (gameState) {
        const updatedPlayers = gameState.players.map((p) =>
          p.id === player.id ? player : p
        );
        setGameState({
          ...gameState,
          players: updatedPlayers,
        });
      }
    },
    onDiceRoll: (data) => {
      // Show dice animation for other players
      console.log('Dice rolled:', data);
    },
  });

  // Load game state on mount
  useEffect(() => {
    refreshGameState();
  }, [refreshGameState]);

  // Get current player ID from session
  useEffect(() => {
    const getCurrentPlayer = async () => {
      const { data: { user } } = await import('@/lib/supabase/client').then(m => m.supabase.auth.getUser());
      if (user && gameState) {
        const player = gameState.players.find(p => p.user_id === user.id);
        if (player) {
          setCurrentPlayerId(player.id);
        }
      }
    };
    getCurrentPlayer();
  }, [gameState]);

  // Handle dice roll
  const handleRollDice = useCallback(async () => {
    if (!gameState || !currentPlayerId) return;

    // Check if player can roll
    if (!canRollDice(gameState.game, currentPlayerId)) {
      return;
    }

    setIsRolling(true);
    const result = await rollDice();
    setIsRolling(false);

    if (result) {
      // Broadcast dice roll
      await sendDiceRoll(result.dice_value);

      // Get valid marbles for this roll
      const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
      if (currentPlayer) {
        const validMarbles = getValidMarbles(
          currentPlayer,
          gameState.marbles,
          result.dice_value
        );
        setValidMarbleIds(validMarbles.map(m => m.id));

        // Auto-select if only one valid marble
        if (validMarbles.length === 1) {
          selectMarble(validMarbles[0].id);
        }
      }
    }
  }, [gameState, currentPlayerId, rollDice, sendDiceRoll, selectMarble]);

  // Handle marble move
  const handleMarbleMove = useCallback(
    async (marbleId: string) => {
      const result = await moveMarble(marbleId);
      if (result) {
        // Clear valid marbles
        setValidMarbleIds([]);
        
        // Check if game is won
        if (result.player_won) {
          console.log('Game won!');
        }
      }
    },
    [moveMarble]
  );

  // Handle marble selection
  const handleMarbleClick = useCallback(
    (marble: Marble) => {
      if (!gameState || !currentPlayerId) return;

      // Check if it's player's turn and dice is rolled
      if (!canMoveMarbleRule(gameState.game, currentPlayerId)) {
        return;
      }

      // Check if marble is valid for current dice roll
      if (!validMarbleIds.includes(marble.id)) {
        return;
      }

      // If marble already selected, move it
      if (selectedMarbleId === marble.id && gameState.game.current_dice_roll) {
        handleMarbleMove(marble.id);
      } else {
        // Select marble
        selectMarble(marble.id);
      }
    },
    [gameState, currentPlayerId, selectedMarbleId, validMarbleIds, selectMarble, handleMarbleMove]
  );

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading game...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(
    p => p.id === gameState.game.current_turn_player_id
  );
  const isYourTurn = currentPlayer?.id === currentPlayerId;
  const winner = gameState.players.find(p => p.id === gameState.game.winner_player_id);

  // Show victory screen if game is completed
  if (gameState.game.status === 'completed' && winner) {
    return (
      <VictoryScreen
        winner={winner}
        onNewGame={() => router.push('/')}
        onBackToLobby={() => router.push('/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main game board */}
          <div className="lg:col-span-2">
            <Board
              marbles={gameState.marbles}
              players={gameState.players}
              onMarbleClick={handleMarbleClick}
              selectedMarbleId={selectedMarbleId}
              highlightedSpaces={[]}
            />
          </div>

          {/* Game controls sidebar */}
          <div className="space-y-4">
            {/* Turn indicator */}
            <TurnIndicator
              currentPlayer={currentPlayer || null}
              isYourTurn={isYourTurn}
            />

            {/* Turn timer */}
            {gameState.game.status === 'active' && (
              <TurnTimer
                game={gameState.game}
                isYourTurn={isYourTurn}
              />
            )}

            {/* Dice */}
            <Dice
              value={gameState.game.current_dice_roll}
              onRoll={isYourTurn ? handleRollDice : undefined}
              disabled={!isYourTurn || isLoading || !!gameState.game.current_dice_roll}
              isRolling={isRolling}
            />

            {/* Player status */}
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-semibold mb-3">Players</h3>
              <div className="space-y-2">
                {gameState.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 rounded"
                    style={{
                      backgroundColor: player.id === currentPlayer?.id
                        ? `var(--color-player-${player.color})`
                        : 'transparent',
                      opacity: player.id === currentPlayer?.id ? 0.2 : 1,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: `var(--color-player-${player.color})` }}
                      />
                      <span className="text-sm font-medium">
                        {player.display_name}
                        {player.is_bot && ' (Bot)'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {player.marbles_home}/4 home
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
