-- Utility RPC Functions
-- Created: 2025-11-26
-- Purpose: Get game state and update player presence

-- ============================================================================
-- GET GAME STATE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_game_state(p_game_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_data JSON;
  v_players_data JSON;
  v_marbles_data JSON;
BEGIN
  -- Get game data
  SELECT row_to_json(g.*) INTO v_game_data
  FROM game_sessions g
  WHERE g.id = p_game_id;
  
  IF v_game_data IS NULL THEN
    RAISE EXCEPTION 'GAME_NOT_FOUND';
  END IF;
  
  -- Get players data
  SELECT json_agg(row_to_json(p.*)) INTO v_players_data
  FROM players p
  WHERE p.game_session_id = p_game_id
  ORDER BY p.position_order;
  
  -- Get marbles data
  SELECT json_agg(marble_json ORDER BY position_order, marble_number) INTO v_marbles_data
  FROM (
    SELECT 
      row_to_json(m.*) as marble_json,
      p.position_order,
      m.marble_number
    FROM marbles m
    JOIN players p ON m.player_id = p.id
    WHERE p.game_session_id = p_game_id
  ) subquery;
  
  RETURN json_build_object(
    'game', v_game_data,
    'players', COALESCE(v_players_data, '[]'::json),
    'marbles', COALESCE(v_marbles_data, '[]'::json)
  );
END;
$$;

-- ============================================================================
-- UPDATE PLAYER PRESENCE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_player_presence(
  p_player_id UUID,
  p_is_connected BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE players SET
    is_connected = p_is_connected,
    last_seen_at = now()
  WHERE id = p_player_id;
END;
$$;
