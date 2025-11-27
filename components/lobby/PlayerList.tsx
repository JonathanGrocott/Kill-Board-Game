'use client';

/**
 * PlayerList Component
 * 
 * Displays all players in the lobby with colors, names, and bot badges
 */

import React from 'react';
import type { Player } from '@/types/game';

interface PlayerListProps {
  players: Player[];
  maxPlayers: number;
}

export function PlayerList({ players, maxPlayers }: PlayerListProps) {
  // Sort by position order
  const sortedPlayers = [...players].sort((a, b) => a.position_order - b.position_order);

  // Fill empty slots
  const emptySlots = maxPlayers - players.length;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
        Players ({players.length}/{maxPlayers})
      </h3>

      {/* Desktop: Vertical list */}
      <div className="hidden md:block space-y-2">
        {sortedPlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg border-2"
            style={{ borderColor: `var(--color-player-${player.color})` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: `var(--color-player-${player.color})` }}
              >
                {player.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{player.display_name}</p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: `var(--color-player-${player.color})` }}
                  >
                    {player.color.toUpperCase()}
                  </span>
                  {player.is_bot && (
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">
                      BOT
                    </span>
                  )}
                  {!player.is_connected && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                      Disconnected
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500">Player {player.position_order}</p>
            </div>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">?</span>
            </div>
            <p className="text-gray-400 text-sm">Waiting for player...</p>
          </div>
        ))}
      </div>

      {/* Mobile: Horizontal scroll with compact cards */}
      <div className="md:hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              className="flex-shrink-0 w-32 p-3 bg-white rounded-lg border-2 snap-start"
              style={{ borderColor: `var(--color-player-${player.color})` }}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: `var(--color-player-${player.color})` }}
                >
                  {player.display_name.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold text-sm text-center truncate w-full">
                  {player.display_name}
                </p>
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: `var(--color-player-${player.color})` }}
                  >
                    {player.color.toUpperCase()}
                  </span>
                  {player.is_bot && (
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">
                      🤖
                    </span>
                  )}
                  {!player.is_connected && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">
                      ⚠️
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex-shrink-0 w-32 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 snap-start"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-xl">?</span>
                </div>
                <p className="text-gray-400 text-xs text-center">
                  Waiting...
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
