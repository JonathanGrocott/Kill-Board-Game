'use client';

/**
 * Board Component - Kill Board Game
 * 
 * Cross-shaped board layout based on KillBoard.drawio.svg
 * - 68-space track around perimeter
 * - 4 corner bases (6 spots each for 5 marbles)
 * - 4 home zones (5 spaces each)
 */

import React from 'react';
import type { Marble as MarbleType, Player } from '@/types/game';
import { Marble } from './Marble';
import { getMarbleCoordinates } from '@/lib/game/board';

interface BoardProps {
  marbles: MarbleType[];
  players: Player[];
  onMarbleClick?: (marble: MarbleType) => void;
  selectedMarbleId?: string | null;
  validMarbleIds?: string[];
  highlightedSpaces?: Array<{ type: string; index: number | null }>;
}

export function Board({
  marbles,
  players,
  onMarbleClick,
  selectedMarbleId,
  validMarbleIds = [],
  highlightedSpaces = []
}: BoardProps) {
  // Board dimensions matching the SVG template
  const boardSize = 600;

  // Track positions - 68 total spaces
  const trackPositions: Array<{ cx: number; cy: number }> = [];
  for (let i = 0; i < 68; i++) {
    const coords = getMarbleCoordinates('track', i, 'red', 1); // Player/number don't matter for track
    trackPositions.push({ cx: coords.x, cy: coords.y });
  }

  // Base positions - 6 spots in each corner (empty space between arms)
  // Adjusted for new geometry (Inner corner at +/- 2.5 steps = +/- 87.5px from center)
  // Corner space is large.
  const basePositions = {
    red: [ // Bottom-Left Corner
      { cx: 60, cy: 540 },
      { cx: 90, cy: 540 },
      { cx: 120, cy: 540 },
      { cx: 60, cy: 510 },
      { cx: 90, cy: 510 },
      { cx: 120, cy: 510 },
    ],
    blue: [ // Bottom-Right Corner
      { cx: 480, cy: 540 },
      { cx: 510, cy: 540 },
      { cx: 540, cy: 540 },
      { cx: 480, cy: 510 },
      { cx: 510, cy: 510 },
      { cx: 540, cy: 510 },
    ],
    green: [ // Top-Right Corner
      { cx: 480, cy: 60 },
      { cx: 510, cy: 60 },
      { cx: 540, cy: 60 },
      { cx: 480, cy: 90 },
      { cx: 510, cy: 90 },
      { cx: 540, cy: 90 },
    ],
    yellow: [ // Top-Left Corner
      { cx: 60, cy: 60 },
      { cx: 90, cy: 60 },
      { cx: 120, cy: 60 },
      { cx: 60, cy: 90 },
      { cx: 90, cy: 90 },
      { cx: 120, cy: 90 },
    ],
  };

  // Home positions - 5 spaces per player pointing toward center
  // Centered in arm (width 6 -> centered between index 2 and 3? No, centered on 0)
  // Arm center is at 0 offset.
  const homePositions = {
    red: [ // Bottom Arm -> Up
      { cx: 300, cy: 545 },
      { cx: 300, cy: 510 },
      { cx: 300, cy: 475 },
      { cx: 300, cy: 440 },
      { cx: 300, cy: 405 },
    ],
    blue: [ // Right Arm -> Left
      { cx: 545, cy: 300 },
      { cx: 510, cy: 300 },
      { cx: 475, cy: 300 },
      { cx: 440, cy: 300 },
      { cx: 405, cy: 300 },
    ],
    green: [ // Top Arm -> Down
      { cx: 300, cy: 55 },
      { cx: 300, cy: 90 },
      { cx: 300, cy: 125 },
      { cx: 300, cy: 160 },
      { cx: 300, cy: 195 },
    ],
    yellow: [ // Left Arm -> Right
      { cx: 55, cy: 300 },
      { cx: 90, cy: 300 },
      { cx: 125, cy: 300 },
      { cx: 160, cy: 300 },
      { cx: 195, cy: 300 },
    ],
  };

  return (
    <div className="relative w-full mx-auto aspect-square max-w-4xl game-board">
      <svg
        viewBox="-50 -50 700 700"
        className="w-full h-full touch-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Board background */}
        <rect x="-50" y="-50" width="700" height="700" fill="#F5E6D3" />

        {/* Track spaces - 68 circles around perimeter */}
        {trackPositions.map((pos, i) => {
          const isHighlighted = highlightedSpaces.some(
            space => space.type === 'track' && space.index === i
          );

          // Determine which starting position this is
          const isStartPosition = i === 0 || i === 17 || i === 34 || i === 51;

          return (
            <circle
              key={`track-${i}`}
              cx={pos.cx}
              cy={pos.cy}
              r={12}
              fill={isHighlighted ? '#FFD700' : 'white'}
              stroke={isStartPosition ? '#333' : '#999'}
              strokeWidth={isStartPosition ? '3' : '1'}
              opacity={isHighlighted ? 1 : 1}
            />
          );
        })}

        {/* Base areas - 6 spots each corner */}
        {Object.entries(basePositions).map(([color, positions]) => (
          <g key={`base-${color}`}>
            {/* Base Label */}
            <text
              x={color === 'red' ? 80 : color === 'blue' ? 520 : color === 'green' ? 520 : 80}
              y={color === 'red' ? 560 : color === 'blue' ? 560 : color === 'green' ? 40 : 40}
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

        {/* Home zones - 5 spaces per player */}
        {Object.entries(homePositions).map(([color, positions]) => (
          <g key={`home-${color}`}>
            {positions.map((pos, i) => {
              const isHighlighted = highlightedSpaces.some(
                space => space.type === 'home' && space.index === i
              );

              return (
                <circle
                  key={`home-${color}-${i}`}
                  cx={pos.cx}
                  cy={pos.cy}
                  r={10}
                  fill={isHighlighted ? '#FFD700' : `var(--color-player-${color})`}
                  stroke="#333"
                  strokeWidth="2"
                  opacity={isHighlighted ? 1 : 0.4}
                />
              );
            })}
          </g>
        ))}

        {/* Center decoration */}
        <circle
          cx={300}
          cy={270}
          r={40}
          fill="#FFD700"
          stroke="#333"
          strokeWidth="2"
          opacity="0.2"
        />
        <text
          x={300}
          y={280}
          textAnchor="middle"
          fontSize="20"
          fontWeight="bold"
          fill="#333"
        >
          KILL
        </text>

        {/* Render all marbles */}
        {marbles.map((marble) => {
          const player = players.find(p => p.id === marble.player_id);
          if (!player) return null;

          return (
            <Marble
              key={marble.id}
              marble={marble}
              playerColor={player.color}
              isSelected={selectedMarbleId === marble.id}
              isValid={validMarbleIds.includes(marble.id)}
              onClick={() => onMarbleClick?.(marble)}
            />
          );
        })}
      </svg>
    </div>
  );
}
