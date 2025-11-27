'use client';

/**
 * Marble Component - Individual Game Marble
 * 
 * Renders a single marble with:
 * - Player color styling
 * - Position-based coordinates
 * - Framer Motion animations
 * - Click and drag interactions
 */

import React, { memo, useState, useRef } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import type { Marble as MarbleType, PlayerColor } from '@/types/game';
import { getMarbleCoordinates } from '@/lib/game/board';

interface MarbleProps {
  marble: MarbleType;
  playerColor: PlayerColor;
  isSelected?: boolean;
  isValid?: boolean;
  onClick?: () => void;
  onDragEnd?: (marbleId: string, endPosition: { x: number; y: number }) => void;
  isDraggable?: boolean;
}

function MarbleComponent({ marble, playerColor, isSelected, isValid, onClick, onDragEnd, isDraggable = false }: MarbleProps) {
  const coords = getMarbleCoordinates(
    marble.position_type,
    marble.position_index,
    playerColor,
    marble.marble_number
  );

  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();
  const startPosRef = useRef({ x: 0, y: 0 });

  // Touch-friendly hit area (44x44px minimum)
  const touchRadius = 22; // 44px diameter

  const handleDragStart = () => {
    if (!isDraggable || !isValid) return;
    setIsDragging(true);
    startPosRef.current = { x: coords.x, y: coords.y };
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isDraggable || !isValid) {
      // Snap back to original position
      controls.start({ x: coords.x, y: coords.y });
      setIsDragging(false);
      return;
    }

    // Calculate the end position in SVG coordinates
    const endX = coords.x + info.offset.x;
    const endY = coords.y + info.offset.y;
    
    setIsDragging(false);
    
    // Notify parent of drag end with the end position
    if (onDragEnd) {
      onDragEnd(marble.id, { x: endX, y: endY });
    }
  };

  const handleClick = () => {
    if (!isDragging && onClick) {
      onClick();
    }
  };

  return (
    <motion.g
      initial={false}
      animate={controls}
      style={{
        x: coords.x,
        y: coords.y,
        cursor: isDraggable && isValid ? 'grab' : onClick ? 'pointer' : 'default',
      }}
      drag={isDraggable && isValid}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTouchEnd={(e) => {
        if (!isDragging && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      whileDrag={{ scale: 1.2, zIndex: 100 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        duration: 0.5,
      }}
      className="marble"
    >
      {/* Touch target (invisible, larger area) */}
      {(onClick || isDraggable) && (
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
        opacity={isDragging ? 0.4 : 0.2}
        pointerEvents="none"
      />

      {/* Main marble - uses player color */}
      <circle
        cx={0}
        cy={0}
        r={12}
        fill={`var(--color-player-${playerColor})`}
        stroke={isSelected ? '#FFD700' : isDragging ? '#fff' : '#333'}
        strokeWidth={isSelected || isDragging ? 3 : 2}
        className="transition-all"
        pointerEvents="none"
      />

      {/* Marble highlight (gloss effect) */}
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

      {/* Valid move indicator (pulse) */}
      {isValid && !isSelected && (
        <motion.circle
          cx={0}
          cy={0}
          r={16}
          fill="none"
          stroke="white"
          strokeWidth={2}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          pointerEvents="none"
        />
      )}
      
      {/* Drag indicator when draggable and valid */}
      {isDraggable && isValid && !isDragging && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <circle
            cx={0}
            cy={0}
            r={20}
            fill="none"
            stroke="#FFD700"
            strokeWidth={1}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        </motion.g>
      )}
    </motion.g>
  );
}

// Memoize to prevent unnecessary re-renders when position unchanged
export const Marble = memo(MarbleComponent, (prevProps, nextProps) => {
  return (
    prevProps.marble.id === nextProps.marble.id &&
    prevProps.marble.position_type === nextProps.marble.position_type &&
    prevProps.marble.position_index === nextProps.marble.position_index &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isValid === nextProps.isValid &&
    prevProps.playerColor === nextProps.playerColor &&
    prevProps.isDraggable === nextProps.isDraggable
  );
});

Marble.displayName = 'Marble';
