'use client';

/**
 * Game Play Page
 * 
 * Main game interface with board, dice, turn indicators, and real-time sync
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Board } from '@/components/game/Board';
import { Dice } from '@/components/game/Dice';
import { TurnIndicator } from '@/components/game/TurnIndicator';
import { TurnTimer } from '@/components/game/TurnTimer';
import { ConnectionStatus } from '@/components/game/ConnectionStatus';
import { useGameState } from '@/hooks/useGameState';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { supabase } from '@/lib/supabase/client';
import type { Marble } from '@/types/game';
import { canRollDice, canMoveMarble as canMoveMarbleRule } from '@/lib/game/rules';
import { getValidMarbles } from '@/lib/game/moves';

// Dynamic import for VictoryScreen - only loaded when game is completed
const VictoryScreen = dynamic(
  () => import('@/components/game/VictoryScreen').then(mod => ({ default: mod.VictoryScreen })),
  { 
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }
);

interface GamePlayPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GamePlayPage({ params }: GamePlayPageProps) {
  const router = useRouter();
  const { id: gameId } = React.use(params);

  const {
    gameState,
    selectedMarbleId,
    isLoading,
    error,
    refreshGameState,
    rollDice,
    moveMarble,
    passTurn,
    selectMarble,
    setGameState,
  } = useGameState(gameId);

  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [isRolling, setIsRolling] = useState(false);
  const [validMarbleIds, setValidMarbleIds] = useState<string[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [hasExtraTurn, setHasExtraTurn] = useState(false);
  const lastProcessedTurnRef = useRef<string | null>(null);

  // Setup Realtime sync
  const { sendDiceRoll, sendMarbleMove, connectionState } = useRealtimeSync({
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
    onReconnect: () => {
      // Refresh game state on reconnect to sync missed updates
      refreshGameState();
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

  // Bot turn automation - use refs to avoid dependency issues with consecutive bots
  const currentTurnPlayerId = gameState?.game?.current_turn_player_id;
  const currentDiceRoll = gameState?.game?.current_dice_roll;
  
  // Store bot dice roll for display
  const [botDiceRoll, setBotDiceRoll] = useState<number | null>(null);
  
  // Counter to force re-check after bot turn completes
  const [botTurnCounter, setBotTurnCounter] = useState(0);
  
  useEffect(() => {
    console.log('[Bot Effect] Running with:', {
      currentTurnPlayerId,
      botTurnCounter,
      hasGameState: !!gameState?.game
    });

    if (!gameState?.game || !currentTurnPlayerId) {
      console.log('[Bot Check] No game state yet');
      return;
    }

    const currentTurnPlayer = gameState.players.find(
      p => p.id === currentTurnPlayerId
    );

    console.log('[Bot Check] Current turn player:', {
      playerId: currentTurnPlayer?.id,
      displayName: currentTurnPlayer?.display_name,
      isBot: currentTurnPlayer?.is_bot,
      lastProcessedTurn: lastProcessedTurnRef.current,
      currentDiceRoll
    });

    // Check if it's a bot's turn and we haven't processed this specific player yet
    const isNewBotTurn = currentTurnPlayer?.is_bot && 
      lastProcessedTurnRef.current !== currentTurnPlayerId;

    if (isNewBotTurn) {
      console.log('[Bot] New bot turn detected:', currentTurnPlayer.display_name);
      lastProcessedTurnRef.current = currentTurnPlayerId;
      setIsBotThinking(true);
      setBotDiceRoll(null);

      // Add delay for natural feel (1.5 seconds)
      const botTimer = setTimeout(async () => {
        try {
          console.log('[Bot] Executing bot turn for player:', currentTurnPlayer.id);
          // Execute bot turn via RPC
          const { data, error: botError } = await supabase.rpc('execute_bot_turn', {
            p_game_id: gameId,
          });

          if (botError) {
            console.error('[Bot] Bot turn failed:', botError);
            setIsBotThinking(false);
            return;
          }
          
          console.log('[Bot] Bot turn completed:', data);
          
          // Show the dice roll result
          const result = data as { dice_value?: number; action?: string; } | null;
          console.log('[Bot] Dice value from RPC:', result?.dice_value);
          if (result?.dice_value) {
            setBotDiceRoll(result.dice_value);
          }
          
          // Wait for dice display before refreshing (longer to show the roll)
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Refresh game state to get the updated turn
          console.log('[Bot] Refreshing game state...');
          await refreshGameState();
          console.log('[Bot] Game state refreshed, new currentTurnPlayerId will trigger effect');
          
          // Reset bot dice roll first, then thinking state
          setBotDiceRoll(null);
          setIsBotThinking(false);
          setBotTurnCounter(c => c + 1);
        } catch (err) {
          console.error('[Bot] Failed to execute bot turn:', err);
          setIsBotThinking(false);
        }
      }, 1500);

      return () => {
        clearTimeout(botTimer);
      };
    } else if (!currentTurnPlayer?.is_bot) {
      // Reset when it's a human's turn
      lastProcessedTurnRef.current = null;
      setIsBotThinking(false);
      setBotDiceRoll(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurnPlayerId, gameState?.game, gameState?.players, gameId, refreshGameState, botTurnCounter]);

  // Handle dice roll
  const handleDiceRoll = useCallback(async () => {
    if (!gameState?.game || !currentPlayerId) {
      return;
    }

    // Check if player can roll
    if (!canRollDice(gameState.game, currentPlayerId)) {
      return;
    }

    setIsRolling(true);
    const result = await rollDice();
    setIsRolling(false);

    if (result) {
      // Update local game state with dice value immediately so it displays
      setGameState({
        ...gameState,
        game: {
          ...gameState.game,
          current_dice_roll: result.dice_value,
        },
      });

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
        } else if (validMarbles.length === 0) {
          // No valid moves - auto pass turn
          console.log('No valid moves, passing turn...');
          setTimeout(async () => {
            await passTurn();
            // Refresh game state to trigger bot turn detection
            await refreshGameState();
          }, 1500); // Small delay so user sees the dice roll
        }
      }
    }
  }, [gameState, currentPlayerId, rollDice, sendDiceRoll, selectMarble, setGameState, passTurn, refreshGameState]);

  // Handle marble move
  const handleMarbleMove = useCallback(
    async (marbleId: string) => {
      if (!gameState?.marbles) return;

      const marble = gameState.marbles.find(m => m.id === marbleId);
      if (!marble) return;

      // Store old position for broadcast
      const oldPosition = {
        type: marble.position_type,
        index: marble.position_index,
      };

      const result = await moveMarble(marbleId);
      if (result) {
        // Broadcast marble move
        await sendMarbleMove({
          marbleId,
          playerId: currentPlayerId,
          fromPosition: oldPosition,
          toPosition: {
            type: result.new_position_type,
            index: result.new_position_index,
          },
          capturedMarbleId: result.captured_marble_id || undefined,
        });

        // Clear valid marbles
        setValidMarbleIds([]);

        // Check if player gets extra turn (rolled 6)
        if (result.extra_turn) {
          console.log('Extra turn granted! Rolling again...');
          setHasExtraTurn(true);
          // Refresh game state to get cleared dice roll (so Roll button shows)
          await refreshGameState();
          // Show notification briefly then clear
          setTimeout(() => {
            setHasExtraTurn(false);
          }, 2000);
        } else {
          // Refresh game state to get updated turn (triggers bot if next player is bot)
          await refreshGameState();
        }

        // Check if game is won
        if (result.player_won) {
          console.log('Game won!');
          await refreshGameState();
        }
      }
    },
    [moveMarble, sendMarbleMove, gameState, currentPlayerId, refreshGameState]
  );

  // Handle marble selection
  const handleMarbleClick = useCallback(
    (marble: Marble) => {
      console.log('[Click] Marble clicked:', marble.id, marble.position_type);

      if (!gameState?.game || !currentPlayerId) {
        console.log('[Click] No game or player ID');
        return;
      }

      // Check if it's player's turn and dice is rolled
      if (!canMoveMarbleRule(gameState.game, currentPlayerId)) {
        console.log('[Click] Cannot move rule failed');
        return;
      }

      // Check if marble is valid for current dice roll
      if (!validMarbleIds.includes(marble.id)) {
        console.log('[Click] Marble not in valid list:', validMarbleIds);
        return;
      }

      console.log('[Click] Marble valid, proceeding to move/select');

      // If marble already selected, move it
      if (selectedMarbleId === marble.id && gameState.game.current_dice_roll) {
        console.log('[Click] Executing move...');
        handleMarbleMove(marble.id);
      } else {
        // Select marble
        console.log('[Click] Selecting marble...');
        selectMarble(marble.id);
      }
    },
    [gameState, currentPlayerId, selectedMarbleId, validMarbleIds, selectMarble, handleMarbleMove]
  );

  // Handle marble drag end - execute move when valid marble is dragged
  const handleMarbleDragEnd = useCallback(
    (marbleId: string, endPosition: { x: number; y: number }) => {
      console.log('[Drag] Marble drag ended:', marbleId, endPosition);
      
      if (!gameState?.game || !currentPlayerId) {
        console.log('[Drag] No game or player ID');
        return;
      }

      // Check if it's player's turn and dice is rolled
      if (!canMoveMarbleRule(gameState.game, currentPlayerId)) {
        console.log('[Drag] Cannot move rule failed');
        return;
      }

      // Check if marble is valid for current dice roll
      if (!validMarbleIds.includes(marbleId)) {
        console.log('[Drag] Marble not in valid list');
        return;
      }

      // Execute the move (the destination is determined by dice roll, not drag position)
      console.log('[Drag] Executing move for marble:', marbleId);
      handleMarbleMove(marbleId);
    },
    [gameState, currentPlayerId, validMarbleIds, handleMarbleMove]
  );

  if (!gameState?.game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading game...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players?.find(
    p => p.id === gameState.game.current_turn_player_id
  );
  const isYourTurn = currentPlayer?.id === currentPlayerId;
  const winner = gameState.players?.find(p => p.id === gameState.game.winner_player_id);
  
  // Determine if drag should be enabled (it's your turn and dice is rolled)
  const isDragEnabled = isYourTurn && gameState.game.current_dice_roll !== null;

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        {/* Header with connection status */}
        <div className="game-header p-4 flex justify-between items-center border-b bg-white">
          <h1 className="text-xl md:text-2xl font-bold">Game in Progress</h1>
          <ConnectionStatus status={connectionState} />
        </div>

        {/* Mobile layout: Board fills screen, controls at bottom */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-3 lg:gap-6 lg:p-6">
          {/* Main game board */}
          <div className="game-board-container flex-1 lg:col-span-2 flex items-center justify-center p-2 md:p-4">
            <Board
              marbles={gameState.marbles || []}
              players={gameState.players || []}
              onMarbleClick={handleMarbleClick}
              onMarbleDragEnd={handleMarbleDragEnd}
              selectedMarbleId={selectedMarbleId}
              validMarbleIds={validMarbleIds}
              highlightedSpaces={[]}
              isDragEnabled={isDragEnabled}
            />
          </div>

          {/* Game controls - bottom on mobile, sidebar on desktop */}
          <div className="game-controls lg:space-y-4 bg-white border-t lg:border-t-0 lg:border-none">
            <div className="p-4 space-y-3 lg:space-y-4">
              {/* Extra turn notification */}
              {hasExtraTurn && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎲</span>
                    <div>
                      <p className="text-yellow-800 font-medium">
                        You rolled a 6! Roll again!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bot thinking indicator */}
              {isBotThinking && currentPlayer?.is_bot && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className={botDiceRoll ? "" : "animate-pulse"}>🤖</div>
                    <div>
                      {botDiceRoll ? (
                        <p className="text-blue-800 font-medium">
                          {currentPlayer.display_name} rolled a {botDiceRoll}!
                        </p>
                      ) : (
                        <p className="text-blue-800 font-medium">
                          {currentPlayer.display_name} is thinking...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

              {/* Dice - show bot's roll when a bot is taking its turn */}
              <Dice
                value={botDiceRoll !== null ? botDiceRoll : gameState.game.current_dice_roll}
                onRoll={isYourTurn && !gameState.game.current_dice_roll ? handleDiceRoll : undefined}
                disabled={!isYourTurn || isLoading || !!gameState.game.current_dice_roll || isBotThinking}
                isRolling={isRolling || (isBotThinking && botDiceRoll === null)}
              />

              {/* Player status */}
              <div className="bg-white rounded-lg p-4 shadow hidden lg:block">
                <h3 className="font-semibold mb-3">Players</h3>
                <div className="space-y-2">
                  {(gameState.players || []).map((player) => (
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

            {/* Mobile player status - compact horizontal */}
            <div className="lg:hidden px-4 pb-3 bg-white border-t border-gray-200">
              <div className="flex gap-3 overflow-x-auto py-2">
                {(gameState.players || []).map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap"
                    style={{
                      backgroundColor: player.id === currentPlayer?.id
                        ? `var(--color-player-${player.color})`
                        : '#f3f4f6',
                      opacity: player.id === currentPlayer?.id ? 0.3 : 1,
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `var(--color-player-${player.color})` }}
                    />
                    <span className="text-sm font-medium">
                      {player.display_name.split(' ')[0]}
                      {player.is_bot && ' 🤖'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {player.marbles_home}/4
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
