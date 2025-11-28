-- ============================================================================
-- GAME RULES IMPLEMENTATION
-- ============================================================================
-- This migration implements the remaining game rules:
-- 1. Roll 6 = Extra Turn (don't advance turn if rolled 6 and made valid move)
-- 2. Home Entry from Track Positions (65, 14, 31, 48) instead of shortcut system
-- 3. Fat City Hopping (when on your Fat City, can hop to other Fat Cities)
-- 4. Center Space Shortcut (enter from own Fat City, exit with roll of 1)
-- 5. Captures allowed everywhere except Home Zone (Pot, Fat City, Center all capturable)
-- ============================================================================

-- Drop existing function
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
  v_start_position INTEGER;      -- Pot position (where marbles exit base)
  v_fat_city_position INTEGER;   -- Fat City position (6 spaces from start)
  v_home_entry_position INTEGER; -- Track position to enter home from
  v_new_position_type TEXT;
  v_new_position_index INTEGER;
  v_has_completed_lap BOOLEAN := false;
  v_captured_marble marbles%ROWTYPE;
  v_move_sequence INTEGER;
  v_grant_extra_turn BOOLEAN := false;
  v_next_player players%ROWTYPE;
  v_is_fat_city_hop BOOLEAN := false;
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
  
  -- Get player color and set position constants
  v_player_color := v_player.color;
  
  -- Set positions based on color
  -- Pot (starting): red=0, yellow=17, green=34, blue=51
  -- Fat City (6 spaces from start): red=6, yellow=23, green=40, blue=57
  -- Home Entry (track position): red=65, yellow=14, green=31, blue=48
  CASE v_player_color
    WHEN 'red' THEN 
      v_start_position := 0;
      v_fat_city_position := 6;
      v_home_entry_position := 65;
    WHEN 'yellow' THEN 
      v_start_position := 17;
      v_fat_city_position := 23;
      v_home_entry_position := 14;
    WHEN 'green' THEN 
      v_start_position := 34;
      v_fat_city_position := 40;
      v_home_entry_position := 31;
    WHEN 'blue' THEN 
      v_start_position := 51;
      v_fat_city_position := 57;
      v_home_entry_position := 48;
    ELSE RAISE EXCEPTION 'INVALID_COLOR: %', v_player_color;
  END CASE;
  
  -- Determine if marble has completed a lap (passed starting position once)
  IF v_marble.position_type = 'home' THEN
    v_has_completed_lap := true;
  ELSIF v_marble.position_type = 'center' THEN
    v_has_completed_lap := true; -- Must have completed lap to reach center
  ELSIF v_marble.position_type = 'track' AND v_marble.position_index IS NOT NULL THEN
    -- Has completed lap if position is between home entry and start position
    -- For red: completed lap if on positions 65, 66, 67 (between home entry 65 and start 0)
    -- This is a simplified check - track actual lap completion via metadata if needed
    IF v_marble.position_index != v_start_position THEN
      v_has_completed_lap := ((v_marble.position_index - v_start_position + 68) % 68) > 34;
    END IF;
  END IF;
  
  -- ========================================================================
  -- CALCULATE NEW POSITION
  -- ========================================================================
  
  IF v_marble.position_type = 'base' THEN
    -- Exit base to Pot position (requires 1 or 6)
    IF v_dice_roll NOT IN (1, 6) THEN
      RAISE EXCEPTION 'INVALID_MOVE: Need 1 or 6 to leave base';
    END IF;
    v_new_position_type := 'track';
    v_new_position_index := v_start_position;
    
  ELSIF v_marble.position_type = 'center' THEN
    -- Exit center (requires roll of 1, can exit to ANY Fat City)
    IF v_dice_roll != 1 THEN
      RAISE EXCEPTION 'INVALID_MOVE: Need to roll 1 to exit center';
    END IF;
    -- Default to furthest Fat City (best strategic choice)
    -- In reality, UI should let player choose - for now pick strategically
    -- Exit to the Fat City furthest clockwise from player's own Fat City
    v_new_position_type := 'track';
    -- Exit to Blue's Fat City (57) as default best move for most players
    -- TODO: Let player choose exit Fat City via additional parameter
    v_new_position_index := CASE v_player_color
      WHEN 'red' THEN 57    -- Exit to Blue's Fat City
      WHEN 'yellow' THEN 6  -- Exit to Red's Fat City  
      WHEN 'green' THEN 23  -- Exit to Yellow's Fat City
      WHEN 'blue' THEN 40   -- Exit to Green's Fat City
    END;
    
  ELSIF v_marble.position_type = 'track' THEN
    -- Check if marble is ON their own Fat City (can use Fat City hopping)
    IF v_marble.position_index = v_fat_city_position THEN
      -- OPTION: Fat City Hopping
      -- Can hop to other Fat Cities: each hop = 1 die value
      -- Fat City order: 6 -> 23 -> 40 -> 57 -> 6...
      DECLARE
        v_fat_cities INTEGER[] := ARRAY[6, 23, 40, 57];
        v_current_fc_idx INTEGER;
        v_target_fc_idx INTEGER;
      BEGIN
        -- Find current Fat City index
        v_current_fc_idx := array_position(v_fat_cities, v_marble.position_index);
        IF v_current_fc_idx IS NOT NULL THEN
          -- Can hop to other Fat Cities
          v_target_fc_idx := ((v_current_fc_idx - 1 + v_dice_roll) % 4) + 1;
          v_new_position_type := 'track';
          v_new_position_index := v_fat_cities[v_target_fc_idx];
          v_is_fat_city_hop := true;
        END IF;
      END;
      
      -- OPTION: Enter Center Space (if rolled 1)
      IF v_dice_roll = 1 AND NOT v_is_fat_city_hop THEN
        -- Can enter center from own Fat City with roll of 1
        v_new_position_type := 'center';
        v_new_position_index := NULL;
      ELSIF NOT v_is_fat_city_hop THEN
        -- Normal track movement
        v_new_position_index := (v_marble.position_index + v_dice_roll) % 68;
        v_new_position_type := 'track';
      END IF;
    ELSE
      -- Normal track movement
      v_new_position_index := (v_marble.position_index + v_dice_roll) % 68;
      v_new_position_type := 'track';
    END IF;
    
    -- Check if should enter home zone (completed lap and passing home entry position)
    IF v_has_completed_lap AND v_new_position_type = 'track' THEN
      DECLARE
        v_start_pos INTEGER := v_marble.position_index;
        v_end_pos INTEGER := v_new_position_index;
        v_passed_home_entry BOOLEAN := false;
        v_spaces_after_entry INTEGER := 0;
      BEGIN
        -- Check if home entry position is crossed during this move
        -- Handle wrap-around
        IF v_end_pos >= v_start_pos THEN
          -- No wrap
          v_passed_home_entry := (v_home_entry_position > v_start_pos AND v_home_entry_position <= v_end_pos);
          IF v_passed_home_entry THEN
            v_spaces_after_entry := v_end_pos - v_home_entry_position;
          END IF;
        ELSE
          -- Wrapped around
          v_passed_home_entry := (v_home_entry_position > v_start_pos OR v_home_entry_position <= v_end_pos);
          IF v_passed_home_entry THEN
            IF v_home_entry_position > v_start_pos THEN
              v_spaces_after_entry := (68 - v_home_entry_position) + v_end_pos;
            ELSE
              v_spaces_after_entry := v_end_pos - v_home_entry_position;
            END IF;
          END IF;
        END IF;
        
        -- Enter home if passed entry position
        IF v_passed_home_entry THEN
          IF v_spaces_after_entry < 5 THEN
            v_new_position_type := 'home';
            v_new_position_index := v_spaces_after_entry;
          ELSE
            -- Would overshoot home - invalid move
            RAISE EXCEPTION 'INVALID_MOVE: Would overshoot home zone';
          END IF;
        END IF;
      END;
    END IF;
    
  ELSIF v_marble.position_type = 'home' THEN
    -- Move within home zone
    v_new_position_index := v_marble.position_index + v_dice_roll;
    IF v_new_position_index >= 5 THEN
      RAISE EXCEPTION 'INVALID_MOVE: Would overshoot home (only 5 spaces, 0-4)';
    END IF;
    v_new_position_type := 'home';
    
  ELSE
    RAISE EXCEPTION 'INVALID_POSITION_TYPE: %', v_marble.position_type;
  END IF;
  
  -- ========================================================================
  -- COLLISION CHECKS
  -- ========================================================================
  
  -- Check for collision with own marble (never allowed)
  IF EXISTS (
    SELECT 1 FROM marbles m
    WHERE m.player_id = v_player.id
    AND m.id != p_marble_id
    AND m.position_type = v_new_position_type
    AND (m.position_index = v_new_position_index OR (v_new_position_type = 'center' AND m.position_type = 'center'))
  ) THEN
    RAISE EXCEPTION 'INVALID_MOVE: Cannot land on own marble';
  END IF;
  
  -- ========================================================================
  -- CAPTURE LOGIC (everywhere except Home Zone)
  -- ========================================================================
  
  IF v_new_position_type = 'track' OR v_new_position_type = 'center' THEN
    -- Can capture on ANY track position (including Pot and Fat City) and Center
    SELECT * INTO v_captured_marble
    FROM marbles m
    WHERE m.player_id != v_player.id
    AND m.position_type = v_new_position_type
    AND (m.position_index = v_new_position_index OR (v_new_position_type = 'center' AND m.position_type = 'center'));
    
    IF v_captured_marble.id IS NOT NULL THEN
      -- Send captured marble back to base
      UPDATE marbles
      SET position_type = 'base', position_index = NULL, times_sent_back = times_sent_back + 1
      WHERE marbles.id = v_captured_marble.id;
    END IF;
  END IF;
  
  -- ========================================================================
  -- UPDATE MARBLE POSITION
  -- ========================================================================
  
  UPDATE marbles
  SET position_type = v_new_position_type,
      position_index = v_new_position_index,
      last_moved_at = NOW()
  WHERE marbles.id = p_marble_id;
  
  -- ========================================================================
  -- WIN CONDITION CHECK
  -- ========================================================================
  
  -- Update player marbles_home count if entering home for first time
  IF v_new_position_type = 'home' AND v_marble.position_type != 'home' THEN
    UPDATE players
    SET marbles_home = marbles_home + 1
    WHERE players.id = v_player.id;
    
    -- Check for win (4 marbles home)
    IF (SELECT marbles_home FROM players WHERE players.id = v_player.id) >= 4 THEN
      UPDATE game_sessions
      SET status = 'completed',
          winner_player_id = v_player.id,
          winning_timestamp = NOW()
      WHERE game_sessions.id = p_game_id;
      
      -- Return early - game is over
      RETURN jsonb_build_object(
        'success', true,
        'marble_id', p_marble_id,
        'new_position_type', v_new_position_type,
        'new_position_index', v_new_position_index,
        'captured_marble_id', v_captured_marble.id,
        'player_won', true,
        'extra_turn', false
      );
    END IF;
  END IF;
  
  -- ========================================================================
  -- RECORD MOVE IN HISTORY
  -- ========================================================================
  
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
  
  -- ========================================================================
  -- TURN ADVANCEMENT (with Roll 6 = Extra Turn rule)
  -- ========================================================================
  
  -- RULE: Rolling 6 grants extra turn (same player rolls again)
  IF v_dice_roll = 6 THEN
    v_grant_extra_turn := true;
    -- Same player keeps turn, just clear dice roll
    UPDATE game_sessions
    SET current_dice_roll = NULL,
        turn_started_at = NOW()
    WHERE game_sessions.id = p_game_id;
  ELSE
    -- Advance to next player
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
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'marble_id', p_marble_id,
    'new_position_type', v_new_position_type,
    'new_position_index', v_new_position_index,
    'captured_marble_id', v_captured_marble.id,
    'player_won', false,
    'extra_turn', v_grant_extra_turn,
    'is_fat_city_hop', v_is_fat_city_hop
  );
END;
$$;

-- ============================================================================
-- UPDATE PASS_TURN TO HANDLE ROLL 6 CASE
-- ============================================================================

DROP FUNCTION IF EXISTS pass_turn(UUID);

CREATE OR REPLACE FUNCTION pass_turn(p_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game game_sessions%ROWTYPE;
  v_current_player players%ROWTYPE;
  v_next_player players%ROWTYPE;
  v_dice_roll INTEGER;
BEGIN
  -- Get game
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id;
  IF v_game.id IS NULL OR v_game.status != 'active' THEN
    RAISE EXCEPTION 'GAME_NOT_ACTIVE';
  END IF;
  
  -- Get current player
  SELECT * INTO v_current_player FROM players WHERE id = v_game.current_turn_player_id;
  
  -- Store dice roll to check for 6
  v_dice_roll := v_game.current_dice_roll;
  
  -- NOTE: If player passes after rolling 6 (no valid moves), they lose the extra turn
  -- because they couldn't make a move. Extra turn only applies when making a valid move.
  
  -- Advance to next player
  SELECT * INTO v_next_player
  FROM players
  WHERE game_session_id = p_game_id
  AND position_order = (
    SELECT MIN(position_order)
    FROM players
    WHERE game_session_id = p_game_id
    AND position_order > v_current_player.position_order
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
  
  RETURN jsonb_build_object(
    'success', true,
    'passed_by', v_current_player.id,
    'next_player_id', v_next_player.id,
    'had_rolled_six', v_dice_roll = 6
  );
END;
$$;

-- ============================================================================
-- UPDATE EXECUTE_BOT_TURN TO HANDLE EXTRA TURNS
-- ============================================================================

DROP FUNCTION IF EXISTS execute_bot_turn(UUID);

CREATE OR REPLACE FUNCTION execute_bot_turn(p_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game game_sessions%ROWTYPE;
  v_bot_player players%ROWTYPE;
  v_dice_value INTEGER;
  v_selected_marble UUID;
  v_move_result JSONB;
  v_extra_turn BOOLEAN := false;
  v_turns_taken INTEGER := 0;
  v_max_turns INTEGER := 10; -- Prevent infinite loops
BEGIN
  -- Get game
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id;
  IF v_game.id IS NULL OR v_game.status != 'active' THEN
    RAISE EXCEPTION 'GAME_NOT_ACTIVE';
  END IF;
  
  -- Verify current player is a bot
  SELECT * INTO v_bot_player FROM players WHERE id = v_game.current_turn_player_id;
  IF NOT v_bot_player.is_bot THEN
    RAISE EXCEPTION 'NOT_A_BOT';
  END IF;
  
  -- Bot turn loop (handles consecutive 6s)
  LOOP
    v_turns_taken := v_turns_taken + 1;
    IF v_turns_taken > v_max_turns THEN
      EXIT; -- Safety limit
    END IF;
    
    -- Roll dice
    v_dice_value := floor(random() * 6 + 1)::INTEGER;
    
    UPDATE game_sessions
    SET current_dice_roll = v_dice_value,
        turn_started_at = NOW()
    WHERE id = p_game_id;
    
    -- Get valid marble using existing function
    v_selected_marble := generate_bot_move(v_bot_player.id, v_dice_value);
    
    -- If no valid moves, pass turn
    IF v_selected_marble IS NULL THEN
      PERFORM pass_turn(p_game_id);
      
      RETURN jsonb_build_object(
        'bot_player_id', v_bot_player.id,
        'dice_value', v_dice_value,
        'action', 'passed',
        'turns_taken', v_turns_taken
      );
    END IF;
    
    -- Execute the move
    v_move_result := move_marble(p_game_id, v_selected_marble);
    
    -- Check if game ended
    IF (v_move_result->>'player_won')::boolean THEN
      RETURN jsonb_build_object(
        'bot_player_id', v_bot_player.id,
        'dice_value', v_dice_value,
        'marble_moved', v_selected_marble,
        'move_result', v_move_result,
        'player_won', true,
        'turns_taken', v_turns_taken
      );
    END IF;
    
    -- Check if bot gets extra turn (rolled 6)
    v_extra_turn := (v_move_result->>'extra_turn')::boolean;
    
    IF NOT v_extra_turn THEN
      EXIT; -- Turn is over, next player
    END IF;
    
    -- Refresh game state for next roll
    SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'bot_player_id', v_bot_player.id,
    'dice_value', v_dice_value,
    'marble_moved', v_selected_marble,
    'move_result', v_move_result,
    'turns_taken', v_turns_taken
  );
END;
$$;

