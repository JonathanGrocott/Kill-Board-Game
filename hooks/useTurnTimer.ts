import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Game } from '@/types/game';

const TURN_DURATION = 60; // seconds
const WARNING_THRESHOLD = 50; // seconds - show warning when 10s remaining

interface UseTurnTimerOptions {
  game: Game;
  isYourTurn: boolean;
}

export function useTurnTimer({ game, isYourTurn }: UseTurnTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(TURN_DURATION);
  const [showWarning, setShowWarning] = useState(false);
  const timeoutHandledRef = useRef(false);

  // Calculate time remaining based on turn_started_at
  useEffect(() => {
    if (game.status !== 'active' || !game.turn_started_at) {
      timeoutHandledRef.current = false;
      return;
    }

    // Auto-pass turn when timer expires
    const handleAutoPass = async () => {
      if (game.status !== 'active') return;

      try {
        const { error } = await supabase.rpc('pass_turn', {
          p_game_id: game.id,
        });

        if (error) {
          console.error('Failed to auto-pass turn:', error);
        }
      } catch (err) {
        console.error('Turn timeout error:', err);
      }
    };

    const calculateTimeRemaining = () => {
      const turnStarted = new Date(game.turn_started_at!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - turnStarted) / 1000);
      const remaining = Math.max(0, TURN_DURATION - elapsed);

      setTimeRemaining(remaining);
      setShowWarning(remaining <= (TURN_DURATION - WARNING_THRESHOLD) && remaining > 0);

      // Call auto-pass if timer expires
      if (remaining === 0 && isYourTurn && !timeoutHandledRef.current) {
        timeoutHandledRef.current = true;
        void handleAutoPass();
      }

      return remaining;
    };

    // Initial calculation
    const remaining = calculateTimeRemaining();

    // Only start interval if there's time remaining
    if (remaining > 0) {
      const interval = setInterval(calculateTimeRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [game.status, game.turn_started_at, game.current_turn_player_id, game.id, isYourTurn]);

  return {
    timeRemaining,
    showWarning,
  };
}
