'use client';

/**
 * TurnIndicator Component - Shows Current Player
 * 
 * Displays whose turn it is with color highlighting
 */

import React from 'react';
import type { Player } from '@/types/game';
import { Card } from '@/components/ui/card';

interface TurnIndicatorProps {
  currentPlayer: Player | null;
  isYourTurn: boolean;
}

export function TurnIndicator({ currentPlayer, isYourTurn }: TurnIndicatorProps) {
  if (!currentPlayer) {
    return (
      <Card className="p-4">
        <p className="text-center text-gray-500">Waiting for game to start...</p>
      </Card>
    );
  }

  return (
    <Card
      className="p-4 border-2"
      style={{
        borderColor: `var(--color-player-${currentPlayer.color})`,
        backgroundColor: isYourTurn ? `var(--color-player-${currentPlayer.color})` : 'transparent',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-gray-800"
            style={{ backgroundColor: `var(--color-player-${currentPlayer.color})` }}
          />
          <div>
            <p className="font-semibold text-lg">{currentPlayer.display_name}</p>
            {currentPlayer.is_bot && (
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">BOT</span>
            )}
          </div>
        </div>

        {isYourTurn && (
          <div className="bg-white px-4 py-2 rounded-full font-bold text-gray-800 animate-pulse">
            YOUR TURN
          </div>
        )}
      </div>
    </Card>
  );
}
