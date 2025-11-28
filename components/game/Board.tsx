'use client';

/**
 * Board Component - Kill Board Game
 * 
 * Cross-shaped board layout based on KillBoard.drawio.svg
 * - 68-space track around perimeter
 * - 4 corner bases (6 spots each for 5 marbles)
 * - 4 home zones (5 spaces each)
 * 
 * Performance optimizations (T120):
 * - Static board elements memoized to prevent re-renders
 * - Track positions pre-computed outside component
 * - CSS transforms used for highlighting instead of re-rendering
 * - Marble component memoized with custom comparison
 */

import React, { useMemo, memo } from 'react';
import type { Marble as MarbleType, Player } from '@/types/game';
import { Marble } from './Marble';
import { getMarbleCoordinates } from '@/lib/game/board';

interface BoardProps {
  marbles: MarbleType[];
  players: Player[];
  onMarbleClick?: (marble: MarbleType) => void;
  onMarbleDragEnd?: (marbleId: string, endPosition: { x: number; y: number }) => void;
  selectedMarbleId?: string | null;
  validMarbleIds?: string[];
  highlightedSpaces?: Array<{ type: string; index: number | null }>;
  isDragEnabled?: boolean;
}

/**
 * Pre-computed track positions (computed once at module load, not on every render)
 * This reduces re-computation overhead for the 68 track positions
 */
const TRACK_POSITIONS: Array<{ cx: number; cy: number }> = (() => {
  const positions: Array<{ cx: number; cy: number }> = [];
  for (let i = 0; i < 68; i++) {
    const coords = getMarbleCoordinates('track', i, 'red', 1);
    positions.push({ cx: coords.x, cy: coords.y });
  }
  return positions;
})();

/**
 * Base positions - 6 spots in each corner (empty space between arms)
 * Pre-computed outside component for performance
 */
const BASE_POSITIONS = {
  red: [ // Bottom-Right Corner (near position 51)
    { cx: 480, cy: 540 }, { cx: 510, cy: 540 }, { cx: 540, cy: 540 },
    { cx: 480, cy: 510 }, { cx: 510, cy: 510 }, { cx: 540, cy: 510 },
  ],
  yellow: [ // Bottom-Left Corner (near position 0)
    { cx: 60, cy: 540 }, { cx: 90, cy: 540 }, { cx: 120, cy: 540 },
    { cx: 60, cy: 510 }, { cx: 90, cy: 510 }, { cx: 120, cy: 510 },
  ],
  green: [ // Top-Left Corner (near position 17)
    { cx: 60, cy: 60 }, { cx: 90, cy: 60 }, { cx: 120, cy: 60 },
    { cx: 60, cy: 90 }, { cx: 90, cy: 90 }, { cx: 120, cy: 90 },
  ],
  blue: [ // Top-Right Corner (near position 34)
    { cx: 480, cy: 60 }, { cx: 510, cy: 60 }, { cx: 540, cy: 60 },
    { cx: 480, cy: 90 }, { cx: 510, cy: 90 }, { cx: 540, cy: 90 },
  ],
} as const;

/**
 * Home positions - 5 spaces per player pointing toward center
 * Pre-computed outside component for performance
 */
const HOME_POSITIONS = {
  red: [ // Bottom Arm - middle, pointing UP toward center
    { cx: 300, cy: 545 }, { cx: 300, cy: 510 }, { cx: 300, cy: 475 },
    { cx: 300, cy: 440 }, { cx: 300, cy: 405 },
  ],
  blue: [ // Right Arm - middle, pointing LEFT toward center
    { cx: 545, cy: 300 }, { cx: 510, cy: 300 }, { cx: 475, cy: 300 },
    { cx: 440, cy: 300 }, { cx: 405, cy: 300 },
  ],
  green: [ // Top Arm - middle, pointing DOWN toward center
    { cx: 300, cy: 55 }, { cx: 300, cy: 90 }, { cx: 300, cy: 125 },
    { cx: 300, cy: 160 }, { cx: 300, cy: 195 },
  ],
  yellow: [ // Left Arm - middle, pointing RIGHT toward center
    { cx: 55, cy: 300 }, { cx: 90, cy: 300 }, { cx: 125, cy: 300 },
    { cx: 160, cy: 300 }, { cx: 195, cy: 300 },
  ],
} as const;

/**
 * Special position indices for visual distinction
 */
const START_POSITIONS = new Set([0, 17, 34, 51]);
const FAT_CITY_POSITIONS = new Set([6, 23, 40, 57]);

/**
 * Memoized static board background - rendered once and cached
 * This significantly reduces DOM updates since these elements never change
 */
const StaticBoardBackground = memo(function StaticBoardBackground() {
  return (
    <>
      {/* Board background */}
      <rect x="-50" y="-50" width="700" height="700" fill="#F5E6D3" />

      {/* Base areas - 6 spots each corner (static, never highlighted) */}
      {(Object.entries(BASE_POSITIONS) as [string, typeof BASE_POSITIONS.red][]).map(([color, positions]) => (
        <g key={`base-${color}`}>
          {/* Base Label */}
          <text
            x={color === 'red' ? 520 : color === 'blue' ? 520 : 80}
            y={color === 'red' ? 560 : color === 'blue' ? 40 : color === 'green' ? 40 : 560}
            textAnchor="middle"
            fontSize="16"
            fontWeight="bold"
            fill={`var(--color-player-${color})`}
            opacity="0.8"
          >
            {color.toUpperCase()}
          </text>
          {positions.map((pos, i) => (
            <circle
              key={`base-${color}-${i}`}
              cx={pos.cx}
              cy={pos.cy}
              r={10}
              fill="none"
              stroke={`var(--color-player-${color})`}
              strokeWidth="2"
              opacity="0.6"
            />
          ))}
        </g>
      ))}

      {/* Labels for Pot (starting) positions */}
      <text x={TRACK_POSITIONS[0]?.cx - 25} y={TRACK_POSITIONS[0]?.cy + 4} fontSize="8" fill="#C41E3A" fontWeight="bold">Pot</text>
      <text x={TRACK_POSITIONS[17]?.cx + 4} y={TRACK_POSITIONS[17]?.cy - 18} fontSize="8" fill="#DAA520" fontWeight="bold">Pot</text>
      <text x={TRACK_POSITIONS[34]?.cx + 18} y={TRACK_POSITIONS[34]?.cy + 4} fontSize="8" fill="#228B22" fontWeight="bold">Pot</text>
      <text x={TRACK_POSITIONS[51]?.cx + 4} y={TRACK_POSITIONS[51]?.cy + 22} fontSize="8" fill="#1E90FF" fontWeight="bold">Pot</text>

      {/* Labels for Fat City positions */}
      <text x={TRACK_POSITIONS[6]?.cx + 4} y={TRACK_POSITIONS[6]?.cy - 16} fontSize="7" fill="#C41E3A" fontWeight="bold">Fat City</text>
      <text x={TRACK_POSITIONS[23]?.cx + 16} y={TRACK_POSITIONS[23]?.cy + 4} fontSize="7" fill="#DAA520" fontWeight="bold">Fat City</text>
      <text x={TRACK_POSITIONS[40]?.cx - 8} y={TRACK_POSITIONS[40]?.cy + 20} fontSize="7" fill="#228B22" fontWeight="bold">Fat City</text>
      <text x={TRACK_POSITIONS[57]?.cx - 35} y={TRACK_POSITIONS[57]?.cy + 4} fontSize="7" fill="#1E90FF" fontWeight="bold">Fat City</text>

      {/* Center space label */}
      <text
        x={300}
        y={318}
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill="#333"
      >
        Center
      </text>
    </>
  );
});

StaticBoardBackground.displayName = 'StaticBoardBackground';

export function Board({
  marbles,
  players,
  onMarbleClick,
  onMarbleDragEnd,
  selectedMarbleId,
  validMarbleIds = [],
  highlightedSpaces = [],
  isDragEnabled = false,
}: BoardProps) {
  // Create a Set for O(1) lookup of highlighted spaces
  const highlightedTrackSet = useMemo(() => {
    const set = new Set<number>();
    highlightedSpaces.forEach(space => {
      if (space.type === 'track' && space.index !== null) {
        set.add(space.index);
      }
    });
    return set;
  }, [highlightedSpaces]);

  const highlightedHomeSet = useMemo(() => {
    const map = new Map<string, Set<number>>();
    highlightedSpaces.forEach(space => {
      if (space.type === 'home' && space.index !== null) {
        // Home spaces are color-agnostic in highlighting for now
        if (!map.has('all')) map.set('all', new Set());
        map.get('all')!.add(space.index);
      }
    });
    return map;
  }, [highlightedSpaces]);

  const isCenterHighlighted = useMemo(() => 
    highlightedSpaces.some(space => space.type === 'center'),
    [highlightedSpaces]
  );

  return (
    <div 
      className="relative w-full mx-auto aspect-square max-w-4xl game-board"
      role="region"
      aria-label="Game board"
    >
      <svg
        viewBox="-50 -50 700 700"
        className="w-full h-full touch-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Kill game board with ${players.length} players and ${marbles.length} marbles`}
      >
        <title>Kill Game Board</title>
        <desc>An interactive game board for the Kill (Aggravation) board game. Click on marbles to select and move them.</desc>
        
        {/* Static background elements (memoized, never re-renders) */}
        <StaticBoardBackground />

        {/* Track spaces - 68 circles around perimeter
            Using CSS transform for highlighting instead of changing fill attribute */}
        {TRACK_POSITIONS.map((pos, i) => {
          const isHighlighted = highlightedTrackSet.has(i);
          const isStartPosition = START_POSITIONS.has(i);
          const isFatCity = FAT_CITY_POSITIONS.has(i);

          return (
            <g key={`track-${i}`}>
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={12}
                fill={isHighlighted ? '#FFD700' : 'white'}
                stroke={isStartPosition ? '#333' : isFatCity ? '#666' : '#999'}
                strokeWidth={isStartPosition ? 3 : isFatCity ? 2 : 1}
                style={{
                  // Use CSS transform for performance instead of SVG attributes
                  transform: isHighlighted ? 'scale(1.1)' : undefined,
                  transformOrigin: `${pos.cx}px ${pos.cy}px`,
                  transition: 'transform 0.15s ease-out, fill 0.15s ease-out',
                }}
              />
              {/* Position number label */}
              <text
                x={pos.cx}
                y={pos.cy + 3}
                fontSize="7"
                fill="#333"
                textAnchor="middle"
                fontWeight="bold"
              >
                {i}
              </text>
            </g>
          );
        })}

        {/* Home zones - 5 spaces per player (finish positions) */}
        {(Object.entries(HOME_POSITIONS) as [string, typeof HOME_POSITIONS.red][]).map(([color, positions]) => (
          <g key={`home-${color}`}>
            {positions.map((pos, i) => {
              const isHighlighted = highlightedHomeSet.get('all')?.has(i) ?? false;

              return (
                <circle
                  key={`home-${color}-${i}`}
                  cx={pos.cx}
                  cy={pos.cy}
                  r={10}
                  fill={isHighlighted ? '#FFD700' : `var(--color-player-${color})`}
                  stroke="#333"
                  strokeWidth="2"
                  opacity={isHighlighted ? 1 : 0.6}
                  style={{
                    transform: isHighlighted ? 'scale(1.15)' : undefined,
                    transformOrigin: `${pos.cx}px ${pos.cy}px`,
                    transition: 'transform 0.15s ease-out, fill 0.15s ease-out',
                  }}
                />
              );
            })}
          </g>
        ))}

        {/* Center space - shortcut destination */}
        <circle
          cx={300}
          cy={300}
          r={15}
          fill={isCenterHighlighted ? '#FFD700' : 'white'}
          stroke="#333"
          strokeWidth="2"
          style={{
            transform: isCenterHighlighted ? 'scale(1.1)' : undefined,
            transformOrigin: '300px 300px',
            transition: 'transform 0.15s ease-out, fill 0.15s ease-out',
          }}
        />

        {/* Render all marbles (already memoized via Marble component) */}
        {marbles.map((marble) => {
          const player = players.find(p => p.id === marble.player_id);
          if (!player) return null;

          const isValid = validMarbleIds.includes(marble.id);

          return (
            <Marble
              key={marble.id}
              marble={marble}
              playerColor={player.color}
              isSelected={selectedMarbleId === marble.id}
              isValid={isValid}
              onClick={() => onMarbleClick?.(marble)}
              onDragEnd={onMarbleDragEnd}
              isDraggable={isDragEnabled && isValid}
            />
          );
        })}
      </svg>
    </div>
  );
}
