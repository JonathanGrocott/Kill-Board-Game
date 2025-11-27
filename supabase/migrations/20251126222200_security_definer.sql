-- Make get_game_state run with elevated privileges to bypass RLS recursion
DROP FUNCTION IF EXISTS get_game_state(UUID);

CREATE OR REPLACE FUNCTION get_game_state(p_game_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', gs.id,
    'status', gs.status,
    'current_turn_player_id', gs.current_turn_player_id,
    'current_dice_roll', gs.current_dice_roll,
    'num_players', gs.num_players,
    'created_at', gs.created_at,
    'winner_player_id', gs.winner_player_id,
    'players', (
      SELECT json_agg(
        json_build_object(
          'id', p.id,
          'user_id', p.user_id,
          'display_name', p.display_name,
          'color', p.color,
          'position_order', p.position_order,
          'is_bot', p.is_bot,
          'marbles_home', p.marbles_home
        )
        ORDER BY p.position_order
      )
      FROM players p
      WHERE p.game_session_id = gs.id
    ),
    'marbles', (
      -- Use subquery to properly handle ORDER BY with json_agg
      SELECT json_agg(marble_json ORDER BY position_order, marble_number)
      FROM (
        SELECT 
          row_to_json(m.*) as marble_json,
          p.position_order,
          m.marble_number
        FROM marbles m
        JOIN players p ON m.player_id = p.id
        WHERE p.game_session_id = p_game_id
      ) subquery
    )
  ) INTO v_result
  FROM game_sessions gs
  WHERE gs.id = p_game_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
