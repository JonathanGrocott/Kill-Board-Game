/**
 * Game Rules Engine for Aggravation
 * 
 * Implements core game rules:
 * - Turn order management
 * - Capture logic (send opponent to base)
 * - Shortcut eligibility (after 1 lap)
 * - Win condition (4 marbles home)
 * - Turn timeout handling
 */

import type { Game, Player, Marble } from '@/types/game';
import { getOpponentMarbleAtPosition, isSafeSpace } from './moves';

/**
 * Get the next player in turn order
 */
export function getNextPlayer(
  currentPlayer: Player,
  allPlayers: Player[]
): Player | null {
  // Sort players by position_order
  const sortedPlayers = allPlayers
    .filter(p => !p.is_eliminated)
    .sort((a, b) => a.position_order - b.position_order);

  // Find current player index
  const currentIndex = sortedPlayers.findIndex(p => p.id === currentPlayer.id);

  if (currentIndex === -1) {
    return null;
  }

  // Get next player (wrap around)
  const nextIndex = (currentIndex + 1) % sortedPlayers.length;
  return sortedPlayers[nextIndex];
}

/**
 * Check if a player has won (all 4 marbles in home)
 */
export function hasPlayerWon(player: Player): boolean {
  return player.marbles_home === 4;
}

/**
 * Check if a marble should be sent back to base (captured)
 */
export function shouldCapture(
  newPositionType: 'base' | 'track' | 'shortcut' | 'home',
  newPositionIndex: number | null,
  playerId: string,
  allMarbles: Marble[]
): Marble | null {
  // No captures in safe spaces
  if (isSafeSpace(newPositionType, newPositionIndex)) {
    return null;
  }

  // Find opponent marble at destination
  return getOpponentMarbleAtPosition(
    newPositionType,
    newPositionIndex,
    playerId,
    allMarbles
  );
}

/**
 * Check if a move would result in winning the game
 */
export function wouldWinGame(
  player: Player,
  isHomeEntry: boolean
): boolean {
  // Player wins when they get their 4th marble home
  return isHomeEntry && player.marbles_home === 3; // Will become 4 after this move
}

/**
 * Check if a marble is eligible for shortcut
 * Marble must have completed at least one lap around the track
 */
export function isEligibleForShortcut(
  marble: Marble,
  moveHistory?: { completedLaps: number }
): boolean {
  // Simplified logic: if marble is on shortcut or home, it has completed a lap
  // In a full implementation, track lap completion in move_history or marble metadata
  if (marble.position_type === 'shortcut' || marble.position_type === 'home') {
    return true;
  }

  // If we have move history, check lap count
  if (moveHistory && moveHistory.completedLaps >= 1) {
    return true;
  }

  return false;
}

/**
 * Calculate turn time remaining (in seconds)
 */
export function getTurnTimeRemaining(game: Game): number {
  if (!game.turn_started_at) {
    return 60; // Full time if turn hasn't started
  }

  const turnStartTime = new Date(game.turn_started_at).getTime();
  const currentTime = Date.now();
  const elapsed = Math.floor((currentTime - turnStartTime) / 1000);
  const remaining = Math.max(0, 60 - elapsed);

  return remaining;
}

/**
 * Check if turn has timed out (>60 seconds)
 */
export function hasTurnTimedOut(game: Game): boolean {
  return getTurnTimeRemaining(game) === 0;
}

/**
 * Should show turn timeout warning (10 seconds remaining)
 */
export function shouldShowTimeoutWarning(game: Game): boolean {
  const remaining = getTurnTimeRemaining(game);
  return remaining <= 10 && remaining > 0;
}

/**
 * Get game status based on current state
 */
export function getGameStatus(game: Game, players: Player[]): Game['status'] {
  // Check if any player has won
  const winner = players.find(p => hasPlayerWon(p));
  if (winner) {
    return 'completed';
  }

  // Check if all players disconnected
  const connectedPlayers = players.filter(p => p.is_connected);
  if (connectedPlayers.length === 0) {
    return 'abandoned';
  }

  // Check if game is active (has started)
  if (game.current_turn_player_id) {
    return 'active';
  }

  // Still waiting for players
  return 'waiting';
}

/**
 * Check if a game can start
 * Requires at least 2 players
 */
export function canStartGame(players: Player[], numPlayers: number): boolean {
  return players.length >= 2 && players.length === numPlayers;
}

/**
 * Assign turn order to players based on color
 */
export function getDefaultTurnOrder(): Record<string, number> {
  return {
    red: 1,
    blue: 2,
    green: 3,
    yellow: 4,
  };
}

/**
 * Get player color based on position order
 */
export function getPlayerColor(positionOrder: number): 'red' | 'blue' | 'green' | 'yellow' {
  const colors: Array<'red' | 'blue' | 'green' | 'yellow'> = ['red', 'blue', 'green', 'yellow'];
  return colors[positionOrder - 1] || 'red';
}

/**
 * Check if current player can roll dice
 */
export function canRollDice(game: Game, playerId: string): boolean {
  // Must be player's turn
  if (game.current_turn_player_id !== playerId) {
    return false;
  }

  // Must be active game
  if (game.status !== 'active') {
    return false;
  }

  // Can't roll if already rolled this turn
  if (game.current_dice_roll !== null) {
    return false;
  }

  return true;
}

/**
 * Check if current player can move a marble
 */
export function canMoveMarble(game: Game, playerId: string): boolean {
  // Must be player's turn
  if (game.current_turn_player_id !== playerId) {
    return false;
  }

  // Must be active game
  if (game.status !== 'active') {
    return false;
  }

  // Must have rolled dice
  if (game.current_dice_roll === null) {
    return false;
  }

  return true;
}
