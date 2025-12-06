-- ============================================================================
-- FIX TURN ORDER TO MATCH CLOCKWISE BOARD LAYOUT
-- ============================================================================
-- The board layout goes clockwise: Red → Yellow → Green → Blue
-- But the color assignment was: Red → Blue → Green → Yellow
-- This migration fixes the color assignment to match the clockwise order
-- ============================================================================

-- Update create_game_session to use correct color order
DROP FUNCTION IF EXISTS create_game_session(INTEGER, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION create_game_session(
  p_num_players INTEGER,
  p_display_name TEXT,
  p_enable_shortcuts BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_id UUID;
  v_player_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validate inputs
  IF p_num_players < 2 OR p_num_players > 4 THEN
    RAISE EXCEPTION 'INVALID_PLAYER_COUNT';
  END IF;
  
  IF p_display_name IS NULL OR char_length(p_display_name) < 1 OR char_length(p_display_name) > 50 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  
  -- Create game session
  INSERT INTO game_sessions (num_players, shortcut_spaces_enabled, status)
  VALUES (p_num_players, p_enable_shortcuts, 'waiting')
  RETURNING id INTO v_game_id;
  
  -- Add creator as first player (red)
  INSERT INTO players (game_session_id, user_id, display_name, color, position_order, is_bot)
  VALUES (v_game_id, v_user_id, p_display_name, 'red', 1, false)
  RETURNING id INTO v_player_id;
  
  -- Create 5 marbles for player
  INSERT INTO marbles (player_id, marble_number, position_type)
  SELECT v_player_id, n, 'base'
  FROM generate_series(1, 5) AS n;
  
  RETURN json_build_object(
    'game_id', v_game_id,
    'player_id', v_player_id,
    'color', 'red',
    'position_order', 1,
    'status', 'waiting'
  );
END;
$$;

-- Update join_game_session to use correct color order
DROP FUNCTION IF EXISTS join_game_session(UUID, TEXT);

CREATE OR REPLACE FUNCTION join_game_session(
  p_game_id UUID,
  p_display_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player_count INTEGER;
  v_next_color TEXT;
  v_next_position INTEGER;
  v_player_id UUID;
  v_user_id UUID := auth.uid();
  -- Clockwise order: Red → Yellow → Green → Blue
  v_colors TEXT[] := ARRAY['red', 'yellow', 'green', 'blue'];
BEGIN
  -- Validate display name
  IF p_display_name IS NULL OR char_length(p_display_name) < 1 OR char_length(p_display_name) > 50 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  
  -- Get game details
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GAME_NOT_FOUND';
  END IF;
  
  -- Check game is waiting
  IF v_game.status != 'waiting' THEN
    RAISE EXCEPTION 'GAME_STARTED';
  END IF;
  
  -- Count current players
  SELECT COUNT(*) INTO v_player_count FROM players WHERE game_session_id = p_game_id;
  IF v_player_count >= v_game.num_players THEN
    RAISE EXCEPTION 'GAME_FULL';
  END IF;
  
  -- Assign color and position
  v_next_position := v_player_count + 1;
  v_next_color := v_colors[v_next_position];
  
  -- Create player
  INSERT INTO players (game_session_id, user_id, display_name, color, position_order, is_bot)
  VALUES (p_game_id, v_user_id, p_display_name, v_next_color, v_next_position, false)
  RETURNING id INTO v_player_id;
  
  -- Create 5 marbles
  INSERT INTO marbles (player_id, marble_number, position_type)
  SELECT v_player_id, n, 'base'
  FROM generate_series(1, 5) AS n;
  
  -- If game is full, start it
  IF v_next_position = v_game.num_players THEN
    -- Set first player's turn and start game
    UPDATE game_sessions 
    SET status = 'active',
        current_turn_player_id = (
          SELECT id FROM players 
          WHERE game_session_id = p_game_id 
          AND position_order = 1
        ),
        turn_started_at = NOW()
    WHERE id = p_game_id;
  END IF;
  
  RETURN json_build_object(
    'game_id', p_game_id,
    'player_id', v_player_id,
    'color', v_next_color,
    'position_order', v_next_position,
    'status', CASE WHEN v_next_position = v_game.num_players THEN 'active' ELSE 'waiting' END
  );
END;
$$;

-- Update add_bot_players to use correct color order
DROP FUNCTION IF EXISTS add_bot_players(UUID);

CREATE OR REPLACE FUNCTION add_bot_players(p_game_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player_count INTEGER;
  v_slots_to_fill INTEGER;
  v_position INTEGER;
  v_color TEXT;
  v_bot_names TEXT[] := ARRAY['Bot Alice', 'Bot Bob', 'Bot Charlie'];
  v_bot_count INTEGER := 0;
  -- Clockwise order: Red → Yellow → Green → Blue
  v_colors TEXT[] := ARRAY['red', 'yellow', 'green', 'blue'];
  v_player_id UUID;
BEGIN
  -- Get game
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'GAME_NOT_FOUND';
  END IF;
  
  IF v_game.status != 'waiting' THEN
    RAISE EXCEPTION 'GAME_ALREADY_STARTED';
  END IF;
  
  -- Count players
  SELECT COUNT(*) INTO v_player_count FROM players WHERE game_session_id = p_game_id;
  v_slots_to_fill := v_game.num_players - v_player_count;
  
  IF v_slots_to_fill <= 0 THEN
    RAISE EXCEPTION 'GAME_FULL';
  END IF;
  
  -- Add bots
  FOR i IN 1..v_slots_to_fill LOOP
    v_position := v_player_count + i;
    v_color := v_colors[v_position];
    
    -- Create bot player
    INSERT INTO players (game_session_id, user_id, display_name, color, position_order, is_bot)
    VALUES (p_game_id, NULL, v_bot_names[i], v_color, v_position, true)
    RETURNING id INTO v_player_id;
    
    -- Create 5 marbles for bot
    INSERT INTO marbles (player_id, marble_number, position_type)
    SELECT v_player_id, n, 'base'
    FROM generate_series(1, 5) AS n;
    
    v_bot_count := v_bot_count + 1;
  END LOOP;
  
  -- Start game
  UPDATE game_sessions 
  SET status = 'active',
      current_turn_player_id = (
        SELECT id FROM players 
        WHERE game_session_id = p_game_id 
        AND position_order = 1
      ),
      turn_started_at = NOW()
  WHERE id = p_game_id;
  
  RETURN json_build_object(
    'game_id', p_game_id,
    'bots_added', v_bot_count,
    'status', 'active'
  );
END;
$$;
