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
export const MARBLES_PER_PLAYER = 5;
export const HOME_SPACES = 5;

/**
 * Track starting positions for each player color
 * red=0, yellow=17, green=34, blue=51
 */
export const STARTING_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  yellow: 17,
  green: 34,
  blue: 51,
};

/**
 * Shortcut entry positions (after completing 1 lap)
 * Players enter the shortcut after passing their starting position
 */
export const SHORTCUT_ENTRY: Record<PlayerColor, number> = {
  red: 0,
  yellow: 17,
  green: 34,
  blue: 51,
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

  // Shortcut positions - center shortcut path (legacy, now using center)
  if (positionType === 'shortcut' && positionIndex !== null) {
    return getShortcutCoordinates(color, positionIndex);
  }

  // Center position - the center space shortcut
  if (positionType === 'center') {
    return { x: 300, y: 300 };
  }

  // Home positions - final 5 spaces
  if (positionType === 'home' && positionIndex !== null) {
    return getHomeCoordinates(color, positionIndex);
  }

  // Fallback to center
  return { x: 400, y: 400 };
}

/**
 * Get base coordinates for a marble in starting position
 * 6 spots available per base (for 5 marbles)
 * Coordinates match Board.tsx basePositions
 */
function getBaseCoordinates(color: PlayerColor, marbleNumber: number): BoardCoordinates {
  // Base positions - near each player's starting track position (pot)
  // Red=51 (right), Yellow=0 (bottom), Green=17 (left), Blue=34 (top)
  const basePositions: Record<PlayerColor, Array<{ x: number; y: number }>> = {
    red: [ // Bottom-Right Corner (near position 51)
      { x: 480, y: 540 },
      { x: 510, y: 540 },
      { x: 540, y: 540 },
      { x: 480, y: 510 },
      { x: 510, y: 510 },
      { x: 540, y: 510 },
    ],
    yellow: [ // Bottom-Left Corner (near position 0)
      { x: 60, y: 540 },
      { x: 90, y: 540 },
      { x: 120, y: 540 },
      { x: 60, y: 510 },
      { x: 90, y: 510 },
      { x: 120, y: 510 },
    ],
    green: [ // Top-Left Corner (near position 17)
      { x: 60, y: 60 },
      { x: 90, y: 60 },
      { x: 120, y: 60 },
      { x: 60, y: 90 },
      { x: 90, y: 90 },
      { x: 120, y: 90 },
    ],
    blue: [ // Top-Right Corner (near position 34)
      { x: 480, y: 60 },
      { x: 510, y: 60 },
      { x: 540, y: 60 },
      { x: 480, y: 90 },
      { x: 510, y: 90 },
      { x: 540, y: 510 },
    ],
  };

  const positions = basePositions[color];
  const index = Math.min(marbleNumber - 1, positions.length - 1);

  return positions[index];
}

/**
 * Get track coordinates for a specific position index (0-67)
 * Generates a perfectly symmetrical cross-shaped track path
 * Dimensions: 7 spaces on side, 6 spaces on end
 */
export function getTrackCoordinates(positionIndex: number): BoardCoordinates {
  const CENTER = 300;
  const STEP = 35;
  const points: BoardCoordinates[] = [];

  // Helper to add point
  // Uses half-steps for perfect symmetry around center
  const p = (x: number, y: number) => {
    points.push({ x: CENTER + x * STEP, y: CENTER + y * STEP });
  };

  // Dimensions (in steps from center)
  // Width = 6 circles -> +/- 2.5 steps
  // Side Length = 7 circles -> 6 steps
  // Tip = 2.5 + 6 = 8.5 steps
  const INNER = 2.5;
  const TIP = 8.5;

  // Generate 68 points clockwise starting from Red Start (Bottom-Left Tip)
  // Index 0: (-2.5, 8.5)
  
  // 1. Bottom Arm, Left Edge (Up): (-2.5, 8.5) -> (-2.5, 2.5)
  // 7 circles
  for (let y = TIP; y >= INNER; y--) p(-INNER, y);

  // 2. Left Arm, Bottom Edge (Left): (-3.5, 2.5) -> (-8.5, 2.5)
  // 6 circles (Inner corner shared with prev)
  for (let x = -INNER - 1; x >= -TIP; x--) p(x, INNER);

  // 3. Left Arm, End (Up): (-8.5, 1.5) -> (-8.5, -2.5)
  // 5 circles (Corner shared)
  for (let y = INNER - 1; y >= -INNER; y--) p(-TIP, y);

  // 4. Left Arm, Top Edge (Right): (-8.5, -2.5) -> (-2.5, -2.5)
  // 6 circles (Corner shared) -> Wait, (-8.5, -2.5) is corner.
  // Start from (-7.5, -2.5)
  for (let x = -TIP + 1; x <= -INNER; x++) p(x, -INNER);

  // 5. Top Arm, Left Edge (Up): (-2.5, -3.5) -> (-2.5, -8.5)
  // 6 circles (Inner shared)
  for (let y = -INNER - 1; y >= -TIP; y--) p(-INNER, y);

  // 6. Top Arm, End (Right): (-1.5, -8.5) -> (2.5, -8.5)
  // 5 circles
  for (let x = -INNER + 1; x <= INNER; x++) p(x, -TIP);

  // 7. Top Arm, Right Edge (Down): (2.5, -8.5) -> (2.5, -2.5)
  // 6 circles (Corner shared) -> Start (2.5, -7.5)
  // Wait, (2.5, -8.5) is corner.
  // Start (2.5, -7.5) -> (2.5, -2.5)
  for (let y = -TIP + 1; y <= -INNER; y++) p(INNER, y);

  // 8. Right Arm, Top Edge (Right): (3.5, -2.5) -> (8.5, -2.5)
  // 6 circles (Inner shared)
  for (let x = INNER + 1; x <= TIP; x++) p(x, -INNER);

  // 9. Right Arm, End (Down): (8.5, -1.5) -> (8.5, 2.5)
  // 5 circles
  for (let y = -INNER + 1; y <= INNER; y++) p(TIP, y);

  // 10. Right Arm, Bottom Edge (Left): (7.5, 2.5) -> (2.5, 2.5)
  // 6 circles
  for (let x = TIP - 1; x >= INNER; x--) p(x, INNER);

  // 11. Bottom Arm, Right Edge (Down): (2.5, 3.5) -> (2.5, 8.5)
  // 6 circles (Inner shared)
  for (let y = INNER + 1; y <= TIP; y++) p(INNER, y);

  // 12. Bottom Arm, End (Left): (1.5, 8.5) -> (-1.5, 8.5)
  // 4 circles? Wait.
  // End has 6 circles.
  // (-2.5, 8.5) is Start (Index 0).
  // (2.5, 8.5) is Corner.
  // Between them: (-1.5, 8.5), (-0.5, 8.5), (0.5, 8.5), (1.5, 8.5).
  // 4 circles.
  // Loop should be from 1.5 down to -1.5.
  for (let x = INNER - 1; x >= -INNER + 1; x--) p(x, TIP);

  return points[positionIndex % 68];
}

/**
 * Get shortcut coordinates for center shortcut path
 * Shortcuts go from entry point toward center
 * These should align with the home track positions
 */
function getShortcutCoordinates(color: PlayerColor, positionIndex: number): BoardCoordinates {
  // Shortcut paths mirror the home paths but start from entry positions
  // Using the same spacing as home positions (35px apart)
  const shortcutPositions: Record<PlayerColor, Array<{ x: number; y: number }>> = {
    red: [ // Bottom entry -> toward center
      { x: 300, y: 580 }, // Entry from track
      { x: 300, y: 545 },
      { x: 300, y: 510 },
      { x: 300, y: 475 },
    ],
    blue: [ // Right entry -> toward center
      { x: 580, y: 300 },
      { x: 545, y: 300 },
      { x: 510, y: 300 },
      { x: 475, y: 300 },
    ],
    green: [ // Top entry -> toward center
      { x: 300, y: 20 },
      { x: 300, y: 55 },
      { x: 300, y: 90 },
      { x: 300, y: 125 },
    ],
    yellow: [ // Left entry -> toward center
      { x: 20, y: 300 },
      { x: 55, y: 300 },
      { x: 90, y: 300 },
      { x: 125, y: 300 },
    ],
  };

  const positions = shortcutPositions[color];
  const index = Math.min(positionIndex, positions.length - 1);

  return positions[index];
}

/**
 * Get home zone coordinates for final 5 spaces
 * Each player has a path pointing toward center
 * Coordinates match Board.tsx homePositions
 */
function getHomeCoordinates(color: PlayerColor, positionIndex: number): BoardCoordinates {
  // Home positions - 5 spaces per player (shifted counterclockwise from original)
  // Red home is on the RIGHT arm (top side)
  // Blue home is on the TOP arm (left side)
  // Green home is on the LEFT arm (bottom side)
  // Yellow home is on the BOTTOM arm (right side)
  const homePositions: Record<PlayerColor, Array<{ x: number; y: number }>> = {
    red: [ // Bottom Arm - middle, pointing UP toward center
      { x: 300, y: 545 },
      { x: 300, y: 510 },
      { x: 300, y: 475 },
      { x: 300, y: 440 },
      { x: 300, y: 405 },
    ],
    blue: [ // Right Arm - middle, pointing LEFT toward center
      { x: 545, y: 300 },
      { x: 510, y: 300 },
      { x: 475, y: 300 },
      { x: 440, y: 300 },
      { x: 405, y: 300 },
    ],
    green: [ // Top Arm - middle, pointing DOWN toward center
      { x: 300, y: 55 },
      { x: 300, y: 90 },
      { x: 300, y: 125 },
      { x: 300, y: 160 },
      { x: 300, y: 195 },
    ],
    yellow: [ // Left Arm - middle, pointing RIGHT toward center
      { x: 55, y: 300 },
      { x: 90, y: 300 },
      { x: 125, y: 300 },
      { x: 160, y: 300 },
      { x: 195, y: 300 },
    ],
  };

  const positions = homePositions[color];
  const index = Math.min(positionIndex, positions.length - 1);

  return positions[index];
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

  // Moving in home - must land exactly on final space (index 4)
  if (currentPositionType === 'home' && currentPositionIndex !== null) {
    const newPosition = currentPositionIndex + diceRoll;
    
    if (newPosition < 5) {  // Changed from 4 to 5 (HOME_SPACES)
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
