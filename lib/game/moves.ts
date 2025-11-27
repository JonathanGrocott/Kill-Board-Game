/**
 * Move Validation Logic for Aggravation Game
 * 
 * Determines which marbles can legally move based on:
 * - Dice roll value (1-6)
 * - Marble current position
 * - Base exit rules (1 or 6)
 * - Exact home entry rules
 * - Collision with own marbles
 */

import type { Marble, Player, PlayerColor, PositionType } from '@/types/game';
import { calculateNewPosition, isSamePosition } from './board';

export interface MoveValidation {
  isValid: boolean;
  reason?: string;
  newPosition?: {
    positionType: PositionType;
    positionIndex: number | null;
  };
}

/**
 * Check if a marble can be moved with the current dice roll
 */
export function canMoveMarble(
  marble: Marble,
  diceRoll: number,
  playerColor: PlayerColor,
  allMarbles: Marble[],
  hasCompletedLap: boolean
): MoveValidation {
  // Calculate where the marble would move
  const calculatedMove = calculateNewPosition(
    marble.position_type,
    marble.position_index,
    diceRoll,
    playerColor,
    hasCompletedLap
  );

  // Check if move is geometrically valid
  if (!calculatedMove.isValidMove) {
    return {
      isValid: false,
      reason: 'Invalid move: would overshoot destination',
    };
  }

  // Check for collision with own marbles
  const ownMarbles = allMarbles.filter(m => m.player_id === marble.player_id && m.id !== marble.id);
  const wouldCollideWithOwn = ownMarbles.some(m =>
    isSamePosition(
      calculatedMove.positionType,
      calculatedMove.positionIndex,
      m.position_type,
      m.position_index
    )
  );

  if (wouldCollideWithOwn) {
    return {
      isValid: false,
      reason: 'Cannot land on your own marble',
    };
  }

  return {
    isValid: true,
    newPosition: {
      positionType: calculatedMove.positionType,
      positionIndex: calculatedMove.positionIndex,
    },
  };
}

/**
 * Get all marbles that can legally move with the current dice roll
 */
export function getValidMarbles(
  player: Player,
  allMarbles: Marble[],
  diceRoll: number
): Marble[] {
  const playerMarbles = allMarbles.filter(m => m.player_id === player.id);

  return playerMarbles.filter(marble => {
    // Check if marble has completed a lap (simplified: track if on shortcut or home)
    const hasCompletedLap = marble.position_type === 'shortcut' || marble.position_type === 'home';

    const validation = canMoveMarble(
      marble,
      diceRoll,
      player.color,
      allMarbles,
      hasCompletedLap
    );

    if (!validation.isValid) {
      console.log(`[Validation] Marble ${marble.id} (${marble.position_type}) invalid: ${validation.reason}`);
    } else {
      console.log(`[Validation] Marble ${marble.id} (${marble.position_type}) VALID`);
    }

    return validation.isValid;
  });
}

/**
 * Check if a marble can exit the base
 * Only allowed on rolls of 1 or 6
 */
export function canExitBase(diceRoll: number): boolean {
  return diceRoll === 1 || diceRoll === 6;
}

/**
 * Check if a player has any valid moves
 */
export function hasAnyValidMoves(
  player: Player,
  allMarbles: Marble[],
  diceRoll: number
): boolean {
  const validMarbles = getValidMarbles(player, allMarbles, diceRoll);
  return validMarbles.length > 0;
}

/**
 * Find opponent marble at a position (for capture detection)
 */
export function getOpponentMarbleAtPosition(
  positionType: PositionType,
  positionIndex: number | null,
  playerId: string,
  allMarbles: Marble[]
): Marble | null {
  // Can't capture in base, shortcut, or home zones
  if (positionType !== 'track') {
    return null;
  }

  const opponentMarble = allMarbles.find(
    m =>
      m.player_id !== playerId &&
      isSamePosition(positionType, positionIndex, m.position_type, m.position_index)
  );

  return opponentMarble || null;
}

/**
 * Check if a position is a safe space (no captures allowed)
 * In standard Aggravation, starting positions are safe
 */
export function isSafeSpace(positionType: PositionType, positionIndex: number | null): boolean {
  // Starting positions (0, 17, 34, 51) are safe spaces
  if (positionType === 'track' && positionIndex !== null) {
    return positionIndex % 17 === 0;
  }

  // Base, shortcut, and home are always safe
  return positionType !== 'track';
}

/**
 * Validate a complete move including all game rules
 */
export function validateMove(
  marble: Marble,
  diceRoll: number,
  player: Player,
  allMarbles: Marble[]
): MoveValidation {
  // Check if it's a base exit move
  if (marble.position_type === 'base' && !canExitBase(diceRoll)) {
    return {
      isValid: false,
      reason: `Need to roll 1 or 6 to exit base (rolled ${diceRoll})`,
    };
  }

  // Check if marble has completed a lap
  const hasCompletedLap = marble.position_type === 'shortcut' || marble.position_type === 'home';

  // Validate the move
  return canMoveMarble(marble, diceRoll, player.color, allMarbles, hasCompletedLap);
}
