'use client';

/**
 * Dice Component - Animated Dice Roll
 * 
 * Shows current dice value and handles roll interactions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface DiceProps {
  value: number | null;
  onRoll?: () => void;
  disabled?: boolean;
  isRolling?: boolean;
}

export function Dice({ value, onRoll, disabled, isRolling }: DiceProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className="w-24 h-24 md:w-28 md:h-28 bg-white border-4 border-gray-800 rounded-xl shadow-lg flex items-center justify-center touch-target"
        animate={
          isRolling
            ? {
                rotate: [0, 90, 180, 270, 360],
                scale: [1, 1.1, 1, 1.1, 1],
              }
            : { rotate: 0, scale: 1 }
        }
        transition={{
          duration: 0.6,
          ease: 'easeInOut',
        }}
        style={{ touchAction: 'manipulation' }}
      >
        {value !== null ? (
          <DiceFace value={value} />
        ) : (
          <span className="text-4xl font-bold text-gray-400">?</span>
        )}
      </motion.div>

      {onRoll && (
        <Button
          onClick={onRoll}
          disabled={disabled || isRolling}
          size="lg"
          className="w-full max-w-xs min-h-[44px] text-base md:text-lg game-controls"
        >
          {isRolling ? 'Rolling...' : 'Roll Dice'}
        </Button>
      )}
    </div>
  );
}

/**
 * Render dice face with dots
 */
function DiceFace({ value }: { value: number }) {
  const dotPositions: Record<number, Array<{ x: number; y: number }>> = {
    1: [{ x: 50, y: 50 }],
    2: [
      { x: 30, y: 30 },
      { x: 70, y: 70 },
    ],
    3: [
      { x: 30, y: 30 },
      { x: 50, y: 50 },
      { x: 70, y: 70 },
    ],
    4: [
      { x: 30, y: 30 },
      { x: 70, y: 30 },
      { x: 30, y: 70 },
      { x: 70, y: 70 },
    ],
    5: [
      { x: 30, y: 30 },
      { x: 70, y: 30 },
      { x: 50, y: 50 },
      { x: 30, y: 70 },
      { x: 70, y: 70 },
    ],
    6: [
      { x: 30, y: 25 },
      { x: 70, y: 25 },
      { x: 30, y: 50 },
      { x: 70, y: 50 },
      { x: 30, y: 75 },
      { x: 70, y: 75 },
    ],
  };

  const dots = dotPositions[value] || [];

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16">
      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={8}
          fill="#1f2937"
          className="dice-dot"
        />
      ))}
    </svg>
  );
}
