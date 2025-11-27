'use client';

/**
 * Marble Component - Individual Game Marble
 * 
 * Renders a single marble with:
 * - Player color styling
 * - Position-based coordinates
 * - Framer Motion animations
 * - Click interactions
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { Marble as MarbleType, PlayerColor } from '@/types/game';
import { getMarbleCoordinates } from '@/lib/game/board';

interface MarbleProps {
  marble: MarbleType;
  playerColor: PlayerColor;
  isSelected?: boolean;
  onClick?: () => void;
}

export function Marble({ marble, playerColor, isSelected, onClick }: MarbleProps) {
  const coords = getMarbleCoordinates(
    marble.position_type,
    marble.position_index,
    playerColor,
    marble.marble_number
  );

  return (
    <motion.g
      initial={false}
      animate={{
        x: coords.x,
        y: coords.y,
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        duration: 0.5,
      }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className="marble"
    >
      {/* Marble shadow */}
      <circle
        cx={0}
        cy={2}
        r={12}
        fill="black"
        opacity="0.2"
      />

      {/* Main marble */}
      <circle
        cx={0}
        cy={0}
        r={12}
        fill={`var(--color-player-${playerColor})`}
        stroke={isSelected ? '#FFD700' : '#333'}
        strokeWidth={isSelected ? 3 : 2}
        className="transition-all"
      />

      {/* Marble highlight */}
      <circle
        cx={-3}
        cy={-3}
        r={4}
        fill="white"
        opacity="0.6"
      />

      {/* Selection ring */}
      {isSelected && (
        <motion.circle
          cx={0}
          cy={0}
          r={16}
          fill="none"
          stroke="#FFD700"
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.g>
  );
}
