-- Fix: move_marble function variable scoping and own marble collision check
-- Created: 2025-11-27
-- Purpose: Fix scoping issue with v_start_position and add collision check with own marbles

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
  v_player_color TEXT;
  v_start_position INTEGER;
  v_has_completed_lap BOOLEAN := false;
  v_own_marble_collision BOOLEAN := false;
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
  
  -- Get player color
  v_player_color := v_player.color;
  
  -- Determine starting position based on color
  CASE v_player_color
    WHEN 'red' THEN v_start_position := 0;
    WHEN 'blue' THEN v_start_position := 17;
    WHEN 'green' THEN v_start_position := 34;
    WHEN 'yellow' THEN v_start_position := 51;
    ELSE RAISE EXCEPTION 'INVALID_COLOR: %', v_player_color;
  END CASE;
  
  -- Determine if marble has completed a lap
  IF v_marble.position_type IN ('shortcut', 'home') THEN
    v_has_completed_lap := true;
  ELSIF v_marble.position_type = 'track' AND v_marble.position_index IS NOT NULL THEN
    IF v_marble.position_index != v_start_position THEN
      v_has_completed_lap := (v_marble.position_index - v_start_position + 68) % 68 > 34;
    END IF;
  END IF;
  
  -- Calculate new position based on current position type
  IF v_marble.position_type = 'base' THEN
    IF v_dice_roll NOT IN (1, 6) THEN
      RAISE EXCEPTION 'INVALID_MOVE: Need 1 or 6 to leave base';
    END IF;
    v_new_position_type := 'track';
    v_new_position_index := v_start_position;
    
  ELSIF v_marble.position_type = 'track' THEN
    v_new_position_index := (v_marble.position_index + v_dice_roll) % 68;
    
    IF v_has_completed_lap AND v_new_position_index = v_start_position THEN
      v_new_position_type := 'shortcut';
      v_new_position_index := 0;
    ELSE
      v_new_position_type := 'track';
    END IF;
    
  ELSIF v_marble.position_type = 'shortcut' THEN
    v_new_position_index := v_marble.position_index + v_dice_roll;
    
    IF v_new_position_index < 6 THEN
      v_new_position_type := 'shortcut';
    ELSE
      v_new_position_index := v_new_position_index - 6;
      IF v_new_position_index >= 5 THEN
        RAISE EXCEPTION 'INVALID_MOVE: Overshoot home';
      END IF;
      v_new_position_type := 'home';
    END IF;
    
  ELSIF v_marble.position_type = 'home' THEN
    v_new_position_index := v_marble.position_index + v_dice_roll;
    
    IF v_new_position_index >= 5 THEN
      RAISE EXCEPTION 'INVALID_MOVE: Overshoot home';
    END IF;
    v_new_position_type := 'home';
    
  ELSE
    RAISE EXCEPTION 'INVALID_MOVE: Unknown position type';
  END IF;
  
  -- Check for collision with own marbles
  SELECT EXISTS(
    SELECT 1 FROM marbles m
    WHERE m.player_id = v_player.id
      AND m.id != p_marble_id
      AND m.position_type = v_new_position_type
      AND m.position_index = v_new_position_index
  ) INTO v_own_marble_collision;
  
  IF v_own_marble_collision THEN
    RAISE EXCEPTION 'INVALID_MOVE: Cannot land on your own marble';
  END IF;
  
  -- Check for captures (only on track, from opponents)
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
  
  -- Update marbles_home count if reached final home position
  IF v_new_position_type = 'home' AND v_new_position_index = 4 THEN
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
