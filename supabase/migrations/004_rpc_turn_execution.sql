-- Turn Execution RPC Functions
-- Created: 2025-11-26
-- Purpose: Handle dice rolls, marble moves, turn passing, and bot turns

-- ============================================================================
-- ROLL DICE
-- ============================================================================

CREATE OR REPLACE FUNCTION roll_dice(p_game_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player RECORD;
  v_dice_value INTEGER;
  v_valid_marble_ids UUID[];
BEGIN
  -- Get game state
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GAME_NOT_ACTIVE';
  END IF;
  
  -- Verify it's the caller's turn
  SELECT * INTO v_player FROM players WHERE id = v_game.current_turn_player_id;
  IF v_player.user_id != auth.uid() AND NOT v_player.is_bot THEN
    RAISE EXCEPTION 'NOT_YOUR_TURN';
  END IF;
  
  -- Check dice not already rolled
  IF v_game.current_dice_roll IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_ROLLED';
  END IF;
  
  -- Roll dice (1-6)
  v_dice_value := floor(random() * 6 + 1)::INTEGER;
  
  -- Update game state
  UPDATE game_sessions
  SET current_dice_roll = v_dice_value,
      turn_started_at = now(),
      last_activity_at = now()
  WHERE id = p_game_id;
  
  -- Get valid marbles (can move from base on 1 or 6, or from track/shortcut)
  SELECT array_agg(id) INTO v_valid_marble_ids
  FROM marbles
  WHERE player_id = v_player.id
    AND (
      (position_type = 'base' AND v_dice_value IN (1, 6))
      OR position_type IN ('track', 'shortcut')
    );
  
  RETURN json_build_object(
    'dice_value', v_dice_value,
    'player_id', v_player.id,
    'valid_marbles', COALESCE(v_valid_marble_ids, ARRAY[]::UUID[])
  );
END;
$$;

-- ============================================================================
-- MOVE MARBLE
-- ============================================================================

CREATE OR REPLACE FUNCTION move_marble(
  p_game_id UUID,
  p_marble_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player RECORD;
  v_marble RECORD;
  v_dice_roll INTEGER;
  v_new_position_type TEXT;
  v_new_position_index INTEGER;
  v_captured_marble_id UUID;
  v_player_won BOOLEAN := false;
  v_next_player_id UUID;
  v_marbles_at_home INTEGER;
BEGIN
  -- Get game state
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GAME_NOT_ACTIVE';
  END IF;
  
  -- Verify current turn
  SELECT * INTO v_player FROM players WHERE id = v_game.current_turn_player_id;
  IF v_player.user_id != auth.uid() AND NOT v_player.is_bot THEN
    RAISE EXCEPTION 'NOT_YOUR_TURN';
  END IF;
  
  -- Get dice roll
  v_dice_roll := v_game.current_dice_roll;
  IF v_dice_roll IS NULL THEN
    RAISE EXCEPTION 'NO_DICE_ROLL';
  END IF;
  
  -- Get marble
  SELECT * INTO v_marble FROM marbles WHERE id = p_marble_id;
  IF v_marble.player_id != v_player.id THEN
    RAISE EXCEPTION 'INVALID_MARBLE';
  END IF;
  
  -- Calculate new position (simplified logic for MVP)
  IF v_marble.position_type = 'base' THEN
    -- Move from base to start (position 0)
    IF v_dice_roll NOT IN (1, 6) THEN
      RAISE EXCEPTION 'INVALID_MOVE: Need 1 or 6 to leave base';
    END IF;
    v_new_position_type := 'track';
    v_new_position_index := 0;
  ELSIF v_marble.position_type = 'track' THEN
    -- Move forward on track
    v_new_position_index := v_marble.position_index + v_dice_roll;
    IF v_new_position_index >= 68 THEN
      -- Reached home zone
      v_new_position_type := 'home';
      v_new_position_index := v_new_position_index - 68;
      IF v_new_position_index > 3 THEN
        RAISE EXCEPTION 'INVALID_MOVE: Overshoot home';
      END IF;
    ELSE
      v_new_position_type := 'track';
    END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_MOVE: Cannot move from current position';
  END IF;
  
  -- Check for captures (only on track)
  IF v_new_position_type = 'track' THEN
    SELECT id INTO v_captured_marble_id
    FROM marbles m
    JOIN players p ON m.player_id = p.id
    WHERE p.game_session_id = p_game_id
      AND p.id != v_player.id
      AND m.position_type = v_new_position_type
      AND m.position_index = v_new_position_index
    LIMIT 1;
  END IF;
  
  -- Execute move
  UPDATE marbles SET
    position_type = v_new_position_type,
    position_index = v_new_position_index,
    last_moved_at = now()
  WHERE id = p_marble_id;
  
  -- Handle capture
  IF v_captured_marble_id IS NOT NULL THEN
    UPDATE marbles SET
      position_type = 'base',
      position_index = NULL,
      times_sent_back = times_sent_back + 1
    WHERE id = v_captured_marble_id;
  END IF;
  
  -- Update marbles_home count if reached home
  IF v_new_position_type = 'home' AND v_new_position_index = 3 THEN
    UPDATE players SET marbles_home = marbles_home + 1 WHERE id = v_player.id;
    
    -- Check win condition
    SELECT marbles_home INTO v_marbles_at_home FROM players WHERE id = v_player.id;
    IF v_marbles_at_home = 4 THEN
      v_player_won := true;
      UPDATE game_sessions SET
        status = 'completed',
        winner_player_id = v_player.id,
        winning_timestamp = now()
      WHERE id = p_game_id;
    END IF;
  END IF;
  
  -- Advance turn (if game not won)
  IF NOT v_player_won THEN
    SELECT id INTO v_next_player_id
    FROM players
    WHERE game_session_id = p_game_id
      AND position_order = CASE
        WHEN v_player.position_order = v_game.num_players THEN 1
        ELSE v_player.position_order + 1
      END;
    
    UPDATE game_sessions SET
      current_turn_player_id = v_next_player_id,
      current_dice_roll = NULL,
      turn_started_at = now(),
      last_activity_at = now()
    WHERE id = p_game_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'marble_id', p_marble_id,
    'new_position_type', v_new_position_type,
    'new_position_index', v_new_position_index,
    'captured_marble_id', v_captured_marble_id,
    'player_won', v_player_won,
    'next_turn_player_id', v_next_player_id
  );
END;
$$;

-- ============================================================================
-- PASS TURN
-- ============================================================================

CREATE OR REPLACE FUNCTION pass_turn(p_game_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_current_player RECORD;
  v_next_player_id UUID;
BEGIN
  -- Get game state
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GAME_NOT_ACTIVE';
  END IF;
  
  SELECT * INTO v_current_player FROM players WHERE id = v_game.current_turn_player_id;
  
  -- Get next player
  SELECT id INTO v_next_player_id
  FROM players
  WHERE game_session_id = p_game_id
    AND position_order = CASE
      WHEN v_current_player.position_order = v_game.num_players THEN 1
      ELSE v_current_player.position_order + 1
    END;
  
  -- Advance turn
  UPDATE game_sessions SET
    current_turn_player_id = v_next_player_id,
    current_dice_roll = NULL,
    turn_started_at = now(),
    last_activity_at = now()
  WHERE id = p_game_id;
  
  RETURN json_build_object(
    'next_turn_player_id', v_next_player_id,
    'reason', 'passed'
  );
END;
$$;

-- ============================================================================
-- EXECUTE BOT TURN
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_bot_turn(p_game_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_bot_player RECORD;
  v_dice_result JSON;
  v_dice_value INTEGER;
  v_valid_marbles UUID[];
  v_selected_marble UUID;
  v_move_result JSON;
BEGIN
  -- Get game state
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GAME_NOT_ACTIVE';
  END IF;
  
  -- Verify current player is a bot
  SELECT * INTO v_bot_player FROM players WHERE id = v_game.current_turn_player_id;
  IF NOT v_bot_player.is_bot THEN
    RAISE EXCEPTION 'NOT_A_BOT';
  END IF;
  
  -- Roll dice
  v_dice_value := floor(random() * 6 + 1)::INTEGER;
  
  UPDATE game_sessions
  SET current_dice_roll = v_dice_value,
      turn_started_at = now(),
      last_activity_at = now()
  WHERE id = p_game_id;
  
  -- Get valid marbles using generate_bot_move function
  v_selected_marble := generate_bot_move(v_bot_player.id, v_dice_value);
  
  -- If no valid moves, pass turn
  IF v_selected_marble IS NULL THEN
    RETURN pass_turn(p_game_id);
  END IF;
  
  -- Execute the move
  v_move_result := move_marble(p_game_id, v_selected_marble);
  
  RETURN json_build_object(
    'bot_player_id', v_bot_player.id,
    'dice_value', v_dice_value,
    'marble_moved', v_selected_marble,
    'move_result', v_move_result
  );
END;
$$;
