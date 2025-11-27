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
  onMarbleDragEnd?: (marbleId: string, endPosition: { x: number; y: number }) => void;
  selectedMarbleId?: string | null;
  validMarbleIds?: string[];
  highlightedSpaces?: Array<{ type: string; index: number | null }>;
  isDragEnabled?: boolean;
}

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
  // Track positions - 68 total spaces
  const trackPositions: Array<{ cx: number; cy: number }> = [];
  for (let i = 0; i < 68; i++) {
    const coords = getMarbleCoordinates('track', i, 'red', 1); // Player/number don't matter for track
    trackPositions.push({ cx: coords.x, cy: coords.y });
  }

  // Base positions - 6 spots in each corner (empty space between arms)
  // Positioned near each player's starting track position (pot)
  // Red=51 (right), Yellow=0 (bottom), Green=17 (left), Blue=34 (top)
  const basePositions = {
    red: [ // Bottom-Right Corner (near position 51)
      { cx: 480, cy: 540 },
      { cx: 510, cy: 540 },
      { cx: 540, cy: 540 },
      { cx: 480, cy: 510 },
      { cx: 510, cy: 510 },
      { cx: 540, cy: 510 },
    ],
    yellow: [ // Bottom-Left Corner (near position 0)
      { cx: 60, cy: 540 },
      { cx: 90, cy: 540 },
      { cx: 120, cy: 540 },
      { cx: 60, cy: 510 },
      { cx: 90, cy: 510 },
      { cx: 120, cy: 510 },
    ],
    green: [ // Top-Left Corner (near position 17)
      { cx: 60, cy: 60 },
      { cx: 90, cy: 60 },
      { cx: 120, cy: 60 },
      { cx: 60, cy: 90 },
      { cx: 90, cy: 90 },
      { cx: 120, cy: 90 },
    ],
    blue: [ // Top-Right Corner (near position 34)
      { cx: 480, cy: 60 },
      { cx: 510, cy: 60 },
      { cx: 540, cy: 60 },
      { cx: 480, cy: 90 },
      { cx: 510, cy: 90 },
      { cx: 540, cy: 90 },
    ],
  };

  // Home positions - 5 spaces per player pointing toward center
  // Each player's home is to their RIGHT from their sitting perspective
  // Red sits at bottom, home is on RIGHT side of bottom arm
  // Blue sits at right, home is on TOP side of right arm (their right)
  // Green sits at top, home is on LEFT side of top arm (their right)
  // Yellow sits at left, home is on BOTTOM side of left arm (their right)
  const homePositions = {
    red: [ // Bottom Arm - middle, pointing UP toward center
      { cx: 300, cy: 545 },
      { cx: 300, cy: 510 },
      { cx: 300, cy: 475 },
      { cx: 300, cy: 440 },
      { cx: 300, cy: 405 },
    ],
    blue: [ // Right Arm - middle, pointing LEFT toward center
      { cx: 545, cy: 300 },
      { cx: 510, cy: 300 },
      { cx: 475, cy: 300 },
      { cx: 440, cy: 300 },
      { cx: 405, cy: 300 },
    ],
    green: [ // Top Arm - middle, pointing DOWN toward center
      { cx: 300, cy: 55 },
      { cx: 300, cy: 90 },
      { cx: 300, cy: 125 },
      { cx: 300, cy: 160 },
      { cx: 300, cy: 195 },
    ],
    yellow: [ // Left Arm - middle, pointing RIGHT toward center
      { cx: 55, cy: 300 },
      { cx: 90, cy: 300 },
      { cx: 125, cy: 300 },
      { cx: 160, cy: 300 },
      { cx: 195, cy: 300 },
    ],
  };

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
        
        {/* Board background */}
        <rect x="-50" y="-50" width="700" height="700" fill="#F5E6D3" />

        {/* Track spaces - 68 circles around perimeter */}
        {trackPositions.map((pos, i) => {
          const isHighlighted = highlightedSpaces.some(
            space => space.type === 'track' && space.index === i
          );

          // Determine special positions
          // Pot (starting positions): 0, 17, 34, 51
          // Fat City (corners, 6 spaces from each start): 6, 23, 40, 57
          const isStartPosition = i === 0 || i === 17 || i === 34 || i === 51;
          const isFatCity = i === 6 || i === 23 || i === 40 || i === 57;

          return (
            <g key={`track-${i}`}>
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={12}
                fill={isHighlighted ? '#FFD700' : 'white'}
                stroke={isStartPosition ? '#333' : isFatCity ? '#666' : '#999'}
                strokeWidth={isStartPosition ? '3' : isFatCity ? '2' : '1'}
                opacity={isHighlighted ? 1 : 1}
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

        {/* Labels for Pot (starting) positions - red=0, yellow=17, green=34, blue=51 */}
        <text x={trackPositions[0]?.cx - 25} y={trackPositions[0]?.cy + 4} fontSize="8" fill="#C41E3A" fontWeight="bold">Pot</text>
        <text x={trackPositions[17]?.cx + 4} y={trackPositions[17]?.cy - 18} fontSize="8" fill="#DAA520" fontWeight="bold">Pot</text>
        <text x={trackPositions[34]?.cx + 18} y={trackPositions[34]?.cy + 4} fontSize="8" fill="#228B22" fontWeight="bold">Pot</text>
        <text x={trackPositions[51]?.cx + 4} y={trackPositions[51]?.cy + 22} fontSize="8" fill="#1E90FF" fontWeight="bold">Pot</text>

        {/* Labels for Fat City positions - red=6, yellow=23, green=40, blue=57 */}
        <text x={trackPositions[6]?.cx + 4} y={trackPositions[6]?.cy - 16} fontSize="7" fill="#C41E3A" fontWeight="bold">Fat City</text>
        <text x={trackPositions[23]?.cx + 16} y={trackPositions[23]?.cy + 4} fontSize="7" fill="#DAA520" fontWeight="bold">Fat City</text>
        <text x={trackPositions[40]?.cx - 8} y={trackPositions[40]?.cy + 20} fontSize="7" fill="#228B22" fontWeight="bold">Fat City</text>
        <text x={trackPositions[57]?.cx - 35} y={trackPositions[57]?.cy + 4} fontSize="7" fill="#1E90FF" fontWeight="bold">Fat City</text>

        {/* Base areas - 6 spots each corner */}
        {Object.entries(basePositions).map(([color, positions]) => (
          <g key={`base-${color}`}>
            {/* Base Label - shifted counterclockwise */}
            <text
              x={color === 'red' ? 520 : color === 'blue' ? 520 : color === 'green' ? 80 : 80}
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

        {/* Home zones - 5 spaces per player (finish positions) */}
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
                  opacity={isHighlighted ? 1 : 0.6}
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
          fill={highlightedSpaces.some(space => space.type === 'center') ? '#FFD700' : 'white'}
          stroke="#333"
          strokeWidth="2"
        />
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

        {/* Render all marbles */}
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
