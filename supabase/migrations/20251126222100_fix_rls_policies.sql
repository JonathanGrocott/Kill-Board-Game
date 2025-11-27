-- Fix RLS policies to avoid infinite recursion
-- The issue: policies were querying the same table they were protecting

-- Drop existing policies
DROP POLICY IF EXISTS "Players can view their games" ON game_sessions;
DROP POLICY IF EXISTS "Anyone can create games" ON game_sessions;
DROP POLICY IF EXISTS "Current player can update game" ON game_sessions;
DROP POLICY IF EXISTS "Players can view game participants" ON players;
DROP POLICY IF EXISTS "Players can view game marbles" ON marbles;
DROP POLICY IF EXISTS "Players can update own marbles" ON marbles;
DROP POLICY IF EXISTS "Players can view game history" ON move_history;

-- Game Sessions Policies
-- Allow viewing games where the user is a participant
CREATE POLICY "Users can view their games"
  ON game_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.game_session_id = game_sessions.id 
      AND players.user_id = auth.uid()
    )
    OR auth.uid() IS NOT NULL  -- Allow authenticated users to view (for joining)
  );

CREATE POLICY "Authenticated users can create games"
  ON game_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anonymous users can create games"
  ON game_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update their games"
  ON game_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.game_session_id = game_sessions.id 
      AND players.user_id = auth.uid()
    )
  );

-- Players Policies
-- Allow viewing all players in games the user is part of
CREATE POLICY "Users can view players in their games"
  ON players FOR SELECT
  USING (
    -- Direct match: user's own player records
    user_id = auth.uid()
    OR
    -- In same game: other players in games where user is a participant
    game_session_id IN (
      SELECT p2.game_session_id FROM players p2 WHERE p2.user_id = auth.uid()
    )
    OR
    -- Allow viewing for authenticated users (needed for joining)
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can insert their own players"
  ON players FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL  -- Allow NULL for guests/bots
  );

CREATE POLICY "Users can update their own players"
  ON players FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Marbles Policies
CREATE POLICY "Users can view marbles in their games"
  ON marbles FOR SELECT
  USING (
    player_id IN (
      SELECT p1.id FROM players p1
      WHERE p1.game_session_id IN (
        SELECT p2.game_session_id FROM players p2 WHERE p2.user_id = auth.uid()
      )
    )
    OR
    -- Allow viewing for authenticated users
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update marbles in their games"
  ON marbles FOR UPDATE
  USING (
    player_id IN (
      SELECT p1.id FROM players p1
      WHERE p1.game_session_id IN (
        SELECT p2.game_session_id FROM players p2 WHERE p2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert marbles"
  ON marbles FOR INSERT
  WITH CHECK (true);

-- Move History Policies
CREATE POLICY "Users can view move history in their games"
  ON move_history FOR SELECT
  USING (
    game_session_id IN (
      SELECT p.game_session_id FROM players p WHERE p.user_id = auth.uid()
    )
    OR
    auth.uid() IS NOT NULL
  );

CREATE POLICY "System can insert move history"
  ON move_history FOR INSERT
  WITH CHECK (true);
