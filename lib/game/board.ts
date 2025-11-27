/**
 * Board Position Calculations for Aggravation Game
 * 
 * Board Layout:
 * - Main circular track: 68 spaces (0-67)
 * - Each player has 4 starting positions in their base
 * - Each player has 4 home spaces (0-3, where 3 is the goal)
 * - Shortcut paths available after completing 1 lap
 * 
 * Player Colors & Starting Positions:
 * - Red: starts at track position 0
 * - Blue: starts at track position 17
 * - Green: starts at track position 34
 * - Yellow: starts at track position 51
 */

import type { PlayerColor, PositionType } from '@/types/game';

export const TRACK_LENGTH = 68;
export const MARBLES_PER_PLAYER = 4;
export const HOME_SPACES = 4;

/**
 * Track starting positions for each player color
 */
export const STARTING_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  blue: 17,
  green: 34,
  yellow: 51,
};

/**
 * Shortcut entry positions (after completing 1 lap)
 * Players enter the shortcut after passing their starting position
 */
export const SHORTCUT_ENTRY: Record<PlayerColor, number> = {
  red: 0,
  blue: 17,
  green: 34,
  yellow: 51,
};

/**
 * SVG coordinates for rendering marbles on the board
 * These are placeholder values - will be refined based on actual SVG board design
 */
export interface BoardCoordinates {
  x: number;
  y: number;
}

/**
 * Get SVG coordinates for a marble based on its position
 */
export function getMarbleCoordinates(
  positionType: PositionType,
  positionIndex: number | null,
  color: PlayerColor,
  marbleNumber: number
): BoardCoordinates {
  // Base positions - 4 marbles in starting zone
  if (positionType === 'base') {
    return getBaseCoordinates(color, marbleNumber);
  }

  // Track positions - main circular track (0-67)
  if (positionType === 'track' && positionIndex !== null) {
    return getTrackCoordinates(positionIndex);
  }

  // Shortcut positions - center shortcut path
  if (positionType === 'shortcut' && positionIndex !== null) {
    return getShortcutCoordinates(color, positionIndex);
  }

  // Home positions - final 4 spaces
  if (positionType === 'home' && positionIndex !== null) {
    return getHomeCoordinates(color, positionIndex);
  }

  // Fallback to center
  return { x: 400, y: 400 };
}

/**
 * Get base coordinates for a marble in starting position
 */
function getBaseCoordinates(color: PlayerColor, marbleNumber: number): BoardCoordinates {
  const baseOffsets: Record<PlayerColor, { x: number; y: number }> = {
    red: { x: 100, y: 700 },    // Bottom-left corner
    blue: { x: 700, y: 700 },   // Bottom-right corner
    green: { x: 700, y: 100 },  // Top-right corner
    yellow: { x: 100, y: 100 }, // Top-left corner
  };

  const offset = baseOffsets[color];
  const spacing = 30;

  // Arrange 4 marbles in 2x2 grid
  const row = Math.floor((marbleNumber - 1) / 2);
  const col = (marbleNumber - 1) % 2;

  return {
    x: offset.x + col * spacing,
    y: offset.y + row * spacing,
  };
}

/**
 * Get track coordinates for main circular track positions
 * Track is a circular path with 68 positions
 */
function getTrackCoordinates(positionIndex: number): BoardCoordinates {
  const centerX = 400;
  const centerY = 400;
  const radius = 280;

  // Convert position to angle (clockwise from top)
  const angle = (positionIndex / TRACK_LENGTH) * 2 * Math.PI - Math.PI / 2;

  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

/**
 * Get shortcut coordinates for center shortcut path
 * Shortcuts go from outer track to home zone
 */
function getShortcutCoordinates(color: PlayerColor, positionIndex: number): BoardCoordinates {
  const centerX = 400;
  const centerY = 400;

  // Each player's shortcut goes from their starting position toward center
  const angles: Record<PlayerColor, number> = {
    red: -Math.PI / 2,     // From bottom
    blue: 0,               // From right
    green: Math.PI / 2,    // From top
    yellow: Math.PI,       // From left
  };

  const angle = angles[color];
  const distance = 280 - (positionIndex * 40); // Move toward center

  return {
    x: centerX + distance * Math.cos(angle),
    y: centerY + distance * Math.sin(angle),
  };
}

/**
 * Get home zone coordinates for final 4 spaces
 */
function getHomeCoordinates(color: PlayerColor, positionIndex: number): BoardCoordinates {
  const centerX = 400;
  const centerY = 400;

  const angles: Record<PlayerColor, number> = {
    red: -Math.PI / 2,
    blue: 0,
    green: Math.PI / 2,
    yellow: Math.PI,
  };

  const angle = angles[color];
  const distance = 120 + (positionIndex * 20); // Closer to center

  return {
    x: centerX + distance * Math.cos(angle),
    y: centerY + distance * Math.sin(angle),
  };
}

/**
 * Calculate new position after moving a marble
 */
export function calculateNewPosition(
  currentPositionType: PositionType,
  currentPositionIndex: number | null,
  diceRoll: number,
  playerColor: PlayerColor,
  hasCompletedLap: boolean
): {
  positionType: PositionType;
  positionIndex: number | null;
  isValidMove: boolean;
  isShortcutEntry: boolean;
} {
  // Moving from base - can only exit with 1 or 6
  if (currentPositionType === 'base') {
    if (diceRoll === 1 || diceRoll === 6) {
      return {
        positionType: 'track',
        positionIndex: STARTING_POSITIONS[playerColor],
        isValidMove: true,
        isShortcutEntry: false,
      };
    }
    return {
      positionType: 'base',
      positionIndex: null,
      isValidMove: false,
      isShortcutEntry: false,
    };
  }

  // Moving on track
  if (currentPositionType === 'track' && currentPositionIndex !== null) {
    const newPosition = (currentPositionIndex + diceRoll) % TRACK_LENGTH;
    
    // If completed a lap and at shortcut entry, can take shortcut
    const startPos = STARTING_POSITIONS[playerColor];
    if (hasCompletedLap && newPosition === startPos) {
      return {
        positionType: 'shortcut',
        positionIndex: 0,
        isValidMove: true,
        isShortcutEntry: true,
      };
    }

    return {
      positionType: 'track',
      positionIndex: newPosition,
      isValidMove: true,
      isShortcutEntry: false,
    };
  }

  // Moving on shortcut toward home
  if (currentPositionType === 'shortcut' && currentPositionIndex !== null) {
    const newPosition = currentPositionIndex + diceRoll;

    // Shortcut has 6 spaces before entering home
    if (newPosition < 6) {
      return {
        positionType: 'shortcut',
        positionIndex: newPosition,
        isValidMove: true,
        isShortcutEntry: false,
      };
    }

    // Entering home zone
    const homeIndex = newPosition - 6;
    if (homeIndex < HOME_SPACES) {
      return {
        positionType: 'home',
        positionIndex: homeIndex,
        isValidMove: true,
        isShortcutEntry: false,
      };
    }

    // Overshoot - invalid move
    return {
      positionType: currentPositionType,
      positionIndex: currentPositionIndex,
      isValidMove: false,
      isShortcutEntry: false,
    };
  }

  // Moving in home - must land exactly on final space (index 3)
  if (currentPositionType === 'home' && currentPositionIndex !== null) {
    const newPosition = currentPositionIndex + diceRoll;
    
    if (newPosition < HOME_SPACES) {
      return {
        positionType: 'home',
        positionIndex: newPosition,
        isValidMove: true,
        isShortcutEntry: false,
      };
    }

    // Overshoot - invalid move
    return {
      positionType: currentPositionType,
      positionIndex: currentPositionIndex,
      isValidMove: false,
      isShortcutEntry: false,
    };
  }

  // Invalid state
  return {
    positionType: currentPositionType,
    positionIndex: currentPositionIndex,
    isValidMove: false,
    isShortcutEntry: false,
  };
}

/**
 * Check if two marbles are at the same position (collision detection)
 */
export function isSamePosition(
  pos1Type: PositionType,
  pos1Index: number | null,
  pos2Type: PositionType,
  pos2Index: number | null
): boolean {
  if (pos1Type === 'base' || pos2Type === 'base') {
    return false; // Marbles in base can't collide
  }

  return pos1Type === pos2Type && pos1Index === pos2Index;
}

/**
 * Get display name for a position
 */
export function getPositionDisplayName(
  positionType: PositionType,
  positionIndex: number | null
): string {
  if (positionType === 'base') return 'Base';
  if (positionType === 'track' && positionIndex !== null) {
    return `Track ${positionIndex}`;
  }
  if (positionType === 'shortcut' && positionIndex !== null) {
    return `Shortcut ${positionIndex}`;
  }
  if (positionType === 'home' && positionIndex !== null) {
    return `Home ${positionIndex + 1}`;
  }
  return 'Unknown';
}
