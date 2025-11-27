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

  // Touch-friendly hit area (44x44px minimum)
  const touchRadius = 22; // 44px diameter

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
      onTouchEnd={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className="marble"
    >
      {/* Touch target (invisible, larger area) */}
      {onClick && (
        <circle
          cx={0}
          cy={0}
          r={touchRadius}
          fill="transparent"
          className="touch-target"
        />
      )}

      {/* Marble shadow */}
      <circle
        cx={0}
        cy={2}
        r={12}
        fill="black"
        opacity="0.2"
        pointerEvents="none"
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
        pointerEvents="none"
      />

      {/* Marble highlight */}
      <circle
        cx={-3}
        cy={-3}
        r={4}
        fill="white"
        opacity="0.6"
        pointerEvents="none"
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
          pointerEvents="none"
        />
      )}
    </motion.g>
  );
}
