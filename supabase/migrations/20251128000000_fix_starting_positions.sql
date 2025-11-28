-- Fix starting positions in move_marble function
-- Correct values: red=0, yellow=17, green=34, blue=51

-- First drop the existing function
DROP FUNCTION IF EXISTS move_marble(UUID, UUID);

CREATE OR REPLACE FUNCTION move_marble(
  p_game_id UUID,
  p_marble_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game game_sessions%ROWTYPE;
  v_player players%ROWTYPE;
  v_marble marbles%ROWTYPE;
  v_dice_roll INTEGER;
  v_player_color TEXT;
  v_start_position INTEGER;
  v_new_position_type TEXT;
  v_new_position_index INTEGER;
  v_has_completed_lap BOOLEAN := false;
  v_captured_marble marbles%ROWTYPE;
  v_move_sequence INTEGER;
BEGIN
  -- Get game
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id;
  IF v_game.id IS NULL THEN
    RAISE EXCEPTION 'GAME_NOT_FOUND';
  END IF;
  
  IF v_game.status != 'active' THEN
    RAISE EXCEPTION 'GAME_NOT_ACTIVE';
  END IF;
  
  -- Get dice roll
  v_dice_roll := v_game.current_dice_roll;
  IF v_dice_roll IS NULL THEN
    RAISE EXCEPTION 'NO_DICE_ROLL';
  END IF;
  
  -- Get current player
  SELECT * INTO v_player FROM players WHERE id = v_game.current_turn_player_id;
  IF v_player.user_id != auth.uid() AND NOT v_player.is_bot THEN
    RAISE EXCEPTION 'NOT_YOUR_TURN';
  END IF;
  
  -- Get marble
  SELECT * INTO v_marble FROM marbles WHERE marbles.id = p_marble_id;
  IF v_marble.player_id != v_player.id THEN
    RAISE EXCEPTION 'INVALID_MARBLE';
  END IF;
  
  -- Get player color
  v_player_color := v_player.color;
  
  -- Determine starting position based on color
  -- FIXED: red=0, yellow=17, green=34, blue=51
  CASE v_player_color
    WHEN 'red' THEN v_start_position := 0;
    WHEN 'yellow' THEN v_start_position := 17;
    WHEN 'green' THEN v_start_position := 34;
    WHEN 'blue' THEN v_start_position := 51;
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
    RAISE EXCEPTION 'INVALID_POSITION_TYPE';
  END IF;
  
  -- Check for collision with own marble
  IF EXISTS (
    SELECT 1 FROM marbles m
    WHERE m.player_id = v_player.id
    AND m.id != p_marble_id
    AND m.position_type = v_new_position_type
    AND m.position_index = v_new_position_index
  ) THEN
    RAISE EXCEPTION 'INVALID_MOVE: Cannot land on own marble';
  END IF;
  
  -- Check for capture (only on track, not on safe spaces)
  IF v_new_position_type = 'track' THEN
    -- Safe spaces are starting positions (0, 17, 34, 51)
    IF v_new_position_index NOT IN (0, 17, 34, 51) THEN
      SELECT * INTO v_captured_marble
      FROM marbles m
      WHERE m.player_id != v_player.id
      AND m.position_type = 'track'
      AND m.position_index = v_new_position_index;
      
      IF v_captured_marble.id IS NOT NULL THEN
        -- Send captured marble back to base
        UPDATE marbles
        SET position_type = 'base', position_index = NULL
        WHERE marbles.id = v_captured_marble.id;
      END IF;
    END IF;
  END IF;
  
  -- Update marble position
  UPDATE marbles
  SET position_type = v_new_position_type,
      position_index = v_new_position_index,
      last_moved_at = NOW()
  WHERE marbles.id = p_marble_id;
  
  -- Update player marbles_home count if entering home
  IF v_new_position_type = 'home' AND v_marble.position_type != 'home' THEN
    UPDATE players
    SET marbles_home = marbles_home + 1
    WHERE players.id = v_player.id;
    
    -- Check for win (4 marbles home)
    IF (SELECT marbles_home FROM players WHERE players.id = v_player.id) >= 4 THEN
      UPDATE game_sessions
      SET status = 'completed',
          winner_id = v_player.id,
          ended_at = NOW()
      WHERE game_sessions.id = p_game_id;
    END IF;
  END IF;
  
  -- Record move in history
  SELECT COALESCE(MAX(move_sequence), 0) + 1 INTO v_move_sequence
  FROM move_history WHERE game_session_id = p_game_id;
  
  INSERT INTO move_history (
    game_session_id, player_id, marble_id, move_sequence,
    dice_roll, from_position_type, from_position_index,
    to_position_type, to_position_index, captured_marble_id,
    was_bot_move
  ) VALUES (
    p_game_id, v_player.id, p_marble_id, v_move_sequence,
    v_dice_roll, v_marble.position_type, v_marble.position_index,
    v_new_position_type, v_new_position_index, v_captured_marble.id,
    v_player.is_bot
  );
  
  -- Advance to next player
  DECLARE
    v_next_player players%ROWTYPE;
  BEGIN
    SELECT * INTO v_next_player
    FROM players
    WHERE game_session_id = p_game_id
    AND position_order = (
      SELECT MIN(position_order)
      FROM players
      WHERE game_session_id = p_game_id
      AND position_order > v_player.position_order
    );
    
    IF v_next_player.id IS NULL THEN
      SELECT * INTO v_next_player
      FROM players
      WHERE game_session_id = p_game_id
      ORDER BY position_order
      LIMIT 1;
    END IF;
    
    UPDATE game_sessions
    SET current_turn_player_id = v_next_player.id,
        current_dice_roll = NULL,
        turn_started_at = NOW()
    WHERE game_sessions.id = p_game_id;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'marble_id', p_marble_id,
    'new_position_type', v_new_position_type,
    'new_position_index', v_new_position_index,
    'captured_marble_id', v_captured_marble.id
  );
END;
$$;
