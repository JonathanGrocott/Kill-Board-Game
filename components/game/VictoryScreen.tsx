'use client';

/**
 * VictoryScreen Component
 * 
 * Shows winner announcement with confetti animation
 */

import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Player } from '@/types/game';

interface VictoryScreenProps {
  winner: Player;
  onNewGame?: () => void;
  onBackToLobby?: () => void;
}

export function VictoryScreen({ winner, onNewGame, onBackToLobby }: VictoryScreenProps) {
  // Generate deterministic confetti positions based on index
  const confetti = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      // Use index-based pseudo-random values for deterministic animation
      const seed = i * 137.508; // Prime number multiplier for good distribution
      return {
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3'][i % 4],
        left: (seed % 100),
        xOffset: ((i * 17) % 100) - 50,
        rotateDirection: i % 2 === 0 ? 1 : -1,
        duration: 2 + (i % 4) * 0.5,
        delay: (i % 10) * 0.05,
      };
    });
  }, []);

  useEffect(() => {
    // Play victory sound/animation here
    console.log('Victory!', winner);
  }, [winner]);

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <Card className="p-8 max-w-md w-full mx-4">
          {/* Confetti effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confetti.map((particle, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: particle.color,
                  left: `${particle.left}%`,
                  top: '-10%',
                }}
                animate={{
                  y: ['0vh', '110vh'],
                  x: [0, particle.xOffset],
                  rotate: [0, 360 * particle.rotateDirection],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          <div className="text-center space-y-6 relative z-10">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <span className="text-6xl">🏆</span>
            </motion.div>

            <div>
              <h2 className="text-3xl font-bold mb-2">Victory!</h2>
              <p className="text-gray-600 text-lg">
                <span
                  className="font-bold px-3 py-1 rounded"
                  style={{
                    backgroundColor: `var(--color-player-${winner.color})`,
                    color: 'white',
                  }}
                >
                  {winner.display_name}
                </span>{' '}
                wins the game!
              </p>
              {winner.is_bot && (
                <p className="text-sm text-gray-500 mt-2">
                  (Bot player)
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {onNewGame && (
                <Button onClick={onNewGame} size="lg" className="w-full">
                  New Game
                </Button>
              )}
              {onBackToLobby && (
                <Button
                  onClick={onBackToLobby}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Back to Lobby
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
