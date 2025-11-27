-- Game Management RPC Functions
-- Created: 2025-11-26
-- Purpose: Create and join game sessions, add bot players

-- ============================================================================
-- CREATE GAME SESSION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_game_session(
  p_display_name TEXT,
  p_num_players INTEGER DEFAULT 4,
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
  IF p_display_name IS NULL OR char_length(p_display_name) < 1 OR char_length(p_display_name) > 50 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  
  IF p_num_players NOT IN (2, 3, 4) THEN
    RAISE EXCEPTION 'INVALID_PLAYER_COUNT';
  END IF;
  
  -- Create game session
  INSERT INTO game_sessions (num_players, shortcut_spaces_enabled, status)
  VALUES (p_num_players, p_enable_shortcuts, 'waiting')
  RETURNING id INTO v_game_id;
  
  -- Add creator as first player (red)
  INSERT INTO players (game_session_id, user_id, display_name, color, position_order, is_bot)
  VALUES (v_game_id, v_user_id, p_display_name, 'red', 1, false)
  RETURNING id INTO v_player_id;
  
  -- Create 4 marbles for player
  INSERT INTO marbles (player_id, marble_number, position_type)
  SELECT v_player_id, n, 'base'
  FROM generate_series(1, 4) AS n;
  
  RETURN json_build_object(
    'game_id', v_game_id,
    'player_id', v_player_id,
    'color', 'red',
    'position_order', 1,
    'status', 'waiting'
  );
END;
$$;

-- ============================================================================
-- JOIN GAME SESSION
-- ============================================================================

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
  v_colors TEXT[] := ARRAY['red', 'blue', 'green', 'yellow'];
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
  
  -- Create 4 marbles
  INSERT INTO marbles (player_id, marble_number, position_type)
  SELECT v_player_id, n, 'base'
  FROM generate_series(1, 4) AS n;
  
  -- If game is full, start it
  IF v_next_position = v_game.num_players THEN
    UPDATE game_sessions
    SET status = 'active',
        current_turn_player_id = (
          SELECT id FROM players 
          WHERE game_session_id = p_game_id AND position_order = 1
        ),
        turn_started_at = now()
    WHERE id = p_game_id;
  END IF;
  
  RETURN json_build_object(
    'player_id', v_player_id,
    'color', v_next_color,
    'position_order', v_next_position,
    'current_player_count', v_next_position,
    'max_players', v_game.num_players
  );
END;
$$;

-- ============================================================================
-- ADD BOT PLAYER
-- ============================================================================

CREATE OR REPLACE FUNCTION add_bot_player(p_game_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player_count INTEGER;
  v_bot_number INTEGER;
  v_next_color TEXT;
  v_next_position INTEGER;
  v_player_id UUID;
  v_colors TEXT[] := ARRAY['red', 'blue', 'green', 'yellow'];
BEGIN
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
  
  -- Assign color, position, and bot number
  v_next_position := v_player_count + 1;
  v_next_color := v_colors[v_next_position];
  v_bot_number := (SELECT COUNT(*) + 1 FROM players WHERE game_session_id = p_game_id AND is_bot = true);
  
  -- Create bot player
  INSERT INTO players (game_session_id, user_id, display_name, color, position_order, is_bot)
  VALUES (p_game_id, NULL, 'Bot ' || v_bot_number, v_next_color, v_next_position, true)
  RETURNING id INTO v_player_id;
  
  -- Create 4 marbles
  INSERT INTO marbles (player_id, marble_number, position_type)
  SELECT v_player_id, n, 'base'
  FROM generate_series(1, 4) AS n;
  
  -- If game is full, start it
  IF v_next_position = v_game.num_players THEN
    UPDATE game_sessions
    SET status = 'active',
        current_turn_player_id = (
          SELECT id FROM players 
          WHERE game_session_id = p_game_id AND position_order = 1
        ),
        turn_started_at = now()
    WHERE id = p_game_id;
  END IF;
  
  RETURN json_build_object(
    'bot_player_id', v_player_id,
    'color', v_next_color,
    'position_order', v_next_position
  );
END;
$$;
