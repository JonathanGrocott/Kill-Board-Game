'use client';

/**
 * TurnTimer Component - 60-Second Countdown
 * 
 * Shows remaining time for current turn with warning animation
 */

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { getTurnTimeRemaining, shouldShowTimeoutWarning } from '@/lib/game/rules';
import type { Game } from '@/types/game';

interface TurnTimerProps {
  game: Game;
  isYourTurn: boolean;
}

export function TurnTimer({ game, isYourTurn }: TurnTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Update timer every second
    const interval = setInterval(() => {
      const remaining = getTurnTimeRemaining(game);
      setTimeRemaining(remaining);
      setShowWarning(shouldShowTimeoutWarning(game));
    }, 1000);

    return () => clearInterval(interval);
  }, [game]);

  const percentage = (timeRemaining / 60) * 100;

  return (
    <Card className={`p-4 ${showWarning && isYourTurn ? 'animate-pulse border-red-500 border-2' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Turn Timer</span>
        <span className={`text-2xl font-bold ${showWarning ? 'text-red-600' : 'text-gray-800'}`}>
          {timeRemaining}s
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            showWarning ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showWarning && isYourTurn && (
        <p className="text-xs text-red-600 mt-2 font-semibold">
          ⚠️ 10 seconds remaining!
        </p>
      )}
    </Card>
  );
}
