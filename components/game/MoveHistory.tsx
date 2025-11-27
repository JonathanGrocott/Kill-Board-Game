'use client';

/**
 * MoveHistory Component
 * 
 * Displays a scrollable log of recent moves, captures, and dice rolls
 */

import React from 'react';
import { Card } from '@/components/ui/card';

interface MoveEvent {
  id: string;
  type: 'dice_roll' | 'marble_move' | 'capture' | 'turn_change';
  playerId: string;
  playerName: string;
  playerColor: string;
  diceValue?: number;
  marbleNumber?: number;
  fromPosition?: string;
  toPosition?: string;
  capturedPlayerName?: string;
  timestamp: Date;
}

interface MoveHistoryProps {
  events: MoveEvent[];
  maxEvents?: number;
}

export function MoveHistory({ events, maxEvents = 20 }: MoveHistoryProps) {
  // Show most recent events first
  const recentEvents = events.slice(-maxEvents).reverse();

  const getEventMessage = (event: MoveEvent) => {
    switch (event.type) {
      case 'dice_roll':
        return `rolled a ${event.diceValue}`;
      case 'marble_move':
        return `moved marble #${event.marbleNumber} from ${event.fromPosition} to ${event.toPosition}`;
      case 'capture':
        return `captured ${event.capturedPlayerName}'s marble!`;
      case 'turn_change':
        return `'s turn`;
      default:
        return '';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'dice_roll':
        return '🎲';
      case 'marble_move':
        return '➡️';
      case 'capture':
        return '💥';
      case 'turn_change':
        return '👉';
      default:
        return '';
    }
  };

  if (events.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Move History</h3>
        <p className="text-sm text-gray-500">No moves yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Move History</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {recentEvents.map((event, index) => (
          <div
            key={`${event.id}-${index}`}
            className="flex items-start gap-2 text-sm p-2 rounded hover:bg-gray-50"
          >
            <span className="text-lg flex-shrink-0">
              {getEventIcon(event.type)}
            </span>
            <div className="flex-1 min-w-0">
              <span
                className="font-medium"
                style={{ color: `var(--color-player-${event.playerColor})` }}
              >
                {event.playerName}
              </span>
              {' '}
              <span className="text-gray-700">
                {getEventMessage(event)}
              </span>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {event.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
