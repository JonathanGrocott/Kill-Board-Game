-- Turn Functions Migration for Aggravation Board Game
-- Created: 2025-11-26
-- Purpose: Functions for turn timer validation and bot move generation

-- ============================================================================
-- TURN TIMER CHECK FUNCTION
-- ============================================================================

-- Check if current turn has exceeded 60-second timeout (FR-004)
CREATE OR REPLACE FUNCTION check_turn_timeout(session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  timeout_threshold TIMESTAMPTZ := now() - INTERVAL '60 seconds';
  turn_started TIMESTAMPTZ;
BEGIN
  SELECT turn_started_at INTO turn_started
  FROM game_sessions
  WHERE id = session_id AND status = 'active';
  
  RETURN turn_started IS NOT NULL AND turn_started < timeout_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BOT MOVE GENERATION FUNCTION
-- ============================================================================

-- Generate a random valid marble move for a bot player (FR-007, FR-008)
CREATE OR REPLACE FUNCTION generate_bot_move(bot_player_id UUID, dice_value INTEGER)
RETURNS UUID AS $$
DECLARE
  valid_marble_ids UUID[];
  selected_marble UUID;
BEGIN
  -- Get all marbles with valid moves for this dice roll
  SELECT array_agg(id) INTO valid_marble_ids
  FROM marbles
  WHERE player_id = bot_player_id
    AND (
      -- Can move from base if rolled 1 or 6
      (position_type = 'base' AND dice_value IN (1, 6))
      -- Or can move forward if on track/shortcut
      OR position_type IN ('track', 'shortcut')
    );
  
  -- Randomly select one valid marble
  IF array_length(valid_marble_ids, 1) > 0 THEN
    selected_marble := valid_marble_ids[1 + floor(random() * array_length(valid_marble_ids, 1))::int];
  END IF;
  
  RETURN selected_marble;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
