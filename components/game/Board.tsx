'use client';

/**
 * Board Component - Aggravation Game Board
 * 
 * Renders the game board with:
 * - 68-space circular track
 * - 4 starting bases (red, blue, green, yellow)
 * - 4 home zones
 * - Shortcut paths
 */

import React from 'react';
import type { Marble as MarbleType, Player } from '@/types/game';
import { Marble } from './Marble';

interface BoardProps {
  marbles: MarbleType[];
  players: Player[];
  onMarbleClick?: (marble: MarbleType) => void;
  selectedMarbleId?: string | null;
  highlightedSpaces?: Array<{ type: string; index: number | null }>;
}

export function Board({ 
  marbles, 
  players, 
  onMarbleClick, 
  selectedMarbleId,
  highlightedSpaces = []
}: BoardProps) {
  const boardSize = 800;
  const centerX = boardSize / 2;
  const centerY = boardSize / 2;

  return (
    <div className="relative w-full mx-auto aspect-square max-w-4xl game-board">
      <svg
        viewBox={`0 0 ${boardSize} ${boardSize}`}
        className="w-full h-full touch-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Board background */}
        <rect width={boardSize} height={boardSize} fill="#F5F5DC" />

        {/* Main circular track */}
        <circle
          cx={centerX}
          cy={centerY}
          r={280}
          fill="none"
          stroke="#333"
          strokeWidth="40"
          opacity="0.1"
        />

        {/* Track spaces (68 total) */}
        {Array.from({ length: 68 }).map((_, i) => {
          const angle = (i / 68) * 2 * Math.PI - Math.PI / 2;
          const x = centerX + 280 * Math.cos(angle);
          const y = centerY + 280 * Math.sin(angle);
          
          const isHighlighted = highlightedSpaces.some(
            space => space.type === 'track' && space.index === i
          );

          return (
            <circle
              key={`track-${i}`}
              cx={x}
              cy={y}
              r={15}
              fill={isHighlighted ? '#FFD700' : 'white'}
              stroke="#333"
              strokeWidth="2"
              opacity={isHighlighted ? 1 : 0.5}
            />
          );
        })}

        {/* Starting positions for each color */}
        {[
          { color: 'red', angle: -Math.PI / 2 },
          { color: 'blue', angle: 0 },
          { color: 'green', angle: Math.PI / 2 },
          { color: 'yellow', angle: Math.PI },
        ].map(({ color, angle }) => {
          const x = centerX + 280 * Math.cos(angle);
          const y = centerY + 280 * Math.sin(angle);

          return (
            <circle
              key={`start-${color}`}
              cx={x}
              cy={y}
              r={18}
              fill={`var(--color-player-${color})`}
              stroke="#333"
              strokeWidth="3"
              opacity="0.3"
            />
          );
        })}

        {/* Base zones - 4 corners */}
        {[
          { color: 'red', x: 100, y: 700, label: 'R' },
          { color: 'blue', x: 700, y: 700, label: 'B' },
          { color: 'green', x: 700, y: 100, label: 'G' },
          { color: 'yellow', x: 100, y: 100, label: 'Y' },
        ].map(({ color, x, y, label }) => (
          <g key={`base-${color}`}>
            <rect
              x={x - 50}
              y={y - 50}
              width={100}
              height={100}
              fill={`var(--color-player-${color})`}
              stroke="#333"
              strokeWidth="2"
              opacity="0.2"
              rx="10"
            />
            <text
              x={x}
              y={y - 60}
              textAnchor="middle"
              fontSize="20"
              fontWeight="bold"
              fill="#333"
            >
              {label} BASE
            </text>
          </g>
        ))}

        {/* Home zones - near center */}
        {[
          { color: 'red', angle: -Math.PI / 2 },
          { color: 'blue', angle: 0 },
          { color: 'green', angle: Math.PI / 2 },
          { color: 'yellow', angle: Math.PI },
        ].map(({ color, angle }) => {
          return (
            <g key={`home-${color}`}>
              {/* Home path (4 spaces) */}
              {Array.from({ length: 4 }).map((_, i) => {
                const distance = 120 + i * 30;
                const x = centerX + distance * Math.cos(angle);
                const y = centerY + distance * Math.sin(angle);
                
                const isHighlighted = highlightedSpaces.some(
                  space => space.type === 'home' && space.index === i
                );

                return (
                  <circle
                    key={`home-${color}-${i}`}
                    cx={x}
                    cy={y}
                    r={12}
                    fill={isHighlighted ? '#FFD700' : `var(--color-player-${color})`}
                    stroke="#333"
                    strokeWidth="2"
                    opacity={isHighlighted ? 1 : 0.3}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Center decoration */}
        <circle
          cx={centerX}
          cy={centerY}
          r={80}
          fill="#FFD700"
          stroke="#333"
          strokeWidth="2"
          opacity="0.2"
        />
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill="#333"
        >
          AGGRAVATION
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
              onClick={() => onMarbleClick?.(marble)}
            />
          );
        })}
      </svg>
    </div>
  );
}
