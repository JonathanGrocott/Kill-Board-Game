/**
 * Move Validation Logic for Aggravation Game
 * 
 * Determines which marbles can legally move based on:
 * - Dice roll value (1-6)
 * - Marble current position
 * - Base exit rules (1 or 6)
 * - Exact home entry rules
 * - Collision with own marbles
 * - Cannot pass own marbles on track
 */

import type { Marble, Player, PlayerColor, PositionType } from '@/types/game';
import { calculateNewPosition, isSamePosition, TRACK_LENGTH } from './board';

export interface MoveValidation {
  isValid: boolean;
  reason?: string;
  newPosition?: {
    positionType: PositionType;
    positionIndex: number | null;
  };
}

/**
 * Check if moving from startPos to endPos would pass through any of the given positions
 * Handles wrap-around on the circular track (68 spaces)
 */
function wouldPassPosition(startPos: number, endPos: number, checkPos: number): boolean {
  // Normalize positions to handle wrap-around
  // If endPos < startPos, we've wrapped around
  if (endPos >= startPos) {
    // Simple case: no wrap-around
    // Check if checkPos is strictly between start and end (exclusive of both)
    return checkPos > startPos && checkPos < endPos;
  } else {
    // Wrap-around case: moving from e.g., 65 to 3
    // checkPos is passed if it's > startPos OR < endPos
    return checkPos > startPos || checkPos < endPos;
  }
}

/**
 * Check if a marble would pass any of its own marbles during movement on track
 */
function wouldPassOwnMarble(
  marble: Marble,
  diceRoll: number,
  ownMarbles: Marble[]
): { wouldPass: boolean; passedMarblePos?: number } {
  // Only applies to track movement
  if (marble.position_type !== 'track' || marble.position_index === null) {
    return { wouldPass: false };
  }

  const startPos = marble.position_index;
  const endPos = (startPos + diceRoll) % TRACK_LENGTH;

  // Check each own marble on the track
  for (const otherMarble of ownMarbles) {
    if (otherMarble.position_type === 'track' && otherMarble.position_index !== null) {
      if (wouldPassPosition(startPos, endPos, otherMarble.position_index)) {
        return { wouldPass: true, passedMarblePos: otherMarble.position_index };
      }
    }
  }

  return { wouldPass: false };
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

  // Get own marbles (excluding the moving marble)
  const ownMarbles = allMarbles.filter(m => m.player_id === marble.player_id && m.id !== marble.id);

  // Check if would pass own marble on track (not allowed)
  const passCheck = wouldPassOwnMarble(marble, diceRoll, ownMarbles);
  if (passCheck.wouldPass) {
    return {
      isValid: false,
      reason: `Cannot pass your own marble at position ${passCheck.passedMarblePos}`,
    };
  }

  // Check for collision with own marbles (landing on same spot)
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
    // Special case: marbles in center can only exit with roll of 1
    if (marble.position_type === 'center') {
      if (diceRoll !== 1) {
        console.log(`[Validation] Marble ${marble.id} (center) invalid: Need 1 to exit center`);
        return false;
      }
      console.log(`[Validation] Marble ${marble.id} (center) VALID - can exit with 1`);
      return true;
    }

    // Check if marble has completed a lap (simplified: if on home or has passed start position)
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
 * UPDATED: Can capture on track and center (not in base or home)
 */
export function getOpponentMarbleAtPosition(
  positionType: PositionType,
  positionIndex: number | null,
  playerId: string,
  allMarbles: Marble[]
): Marble | null {
  // Can't capture in base or home zones
  if (positionType === 'base' || positionType === 'home') {
    return null;
  }

  // Can capture on track or center
  const opponentMarble = allMarbles.find(
    m =>
      m.player_id !== playerId &&
      isSamePosition(positionType, positionIndex, m.position_type, m.position_index)
  );

  return opponentMarble || null;
}

/**
 * Check if a position is a safe space (no captures allowed)
 * UPDATED: Only Home Zone is safe - Pot, Fat City, Center are all capturable
 */
export function isSafeSpace(positionType: PositionType, positionIndex: number | null): boolean {
  // Only home zone is safe from captures
  return positionType === 'home';
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
