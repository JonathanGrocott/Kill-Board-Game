-- Fix roll_dice to handle anonymous users and provide better error messages
DROP FUNCTION IF EXISTS roll_dice(UUID);

CREATE OR REPLACE FUNCTION roll_dice(p_game_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player RECORD;
  v_current_user_id UUID;
  v_dice_value INTEGER;
  v_valid_marble_ids UUID[];
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Get game state
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found or not active';
  END IF;
  
  -- Get current turn player
  SELECT * INTO v_player FROM players WHERE id = v_game.current_turn_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Current turn player not found';
  END IF;
  
  -- Verify it's the caller's turn (or bot)
  IF v_player.user_id != v_current_user_id AND NOT v_player.is_bot THEN
    RAISE EXCEPTION 'Not your turn. Current turn: % (user_id: %), Your user_id: %', 
      v_player.display_name, v_player.user_id, v_current_user_id;
  END IF;
  
  -- Check dice not already rolled
  IF v_game.current_dice_roll IS NOT NULL THEN
    RAISE EXCEPTION 'Dice already rolled this turn';
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
