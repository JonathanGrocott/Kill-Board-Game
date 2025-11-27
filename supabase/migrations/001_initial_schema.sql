-- Initial Schema Migration for Aggravation Board Game
-- Created: 2025-11-26
-- Purpose: Create core tables for game sessions, players, marbles, and move history

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. Game Sessions Table
-- Represents a single game instance with 2-4 players
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Game State
  status TEXT NOT NULL DEFAULT 'waiting' 
    CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  current_turn_player_id UUID,
  current_dice_roll INTEGER CHECK (current_dice_roll BETWEEN 1 AND 6),
  turn_started_at TIMESTAMPTZ,
  
  -- Game Configuration
  num_players INTEGER NOT NULL CHECK (num_players BETWEEN 2 AND 4),
  shortcut_spaces_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Session Management (FR-018: 24-hour cleanup)
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_delete_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  
  -- Winner Tracking
  winner_player_id UUID,
  winning_timestamp TIMESTAMPTZ
);

-- 2. Players Table
-- Represents a player (human or bot) in a specific game session
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Game Association
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  
  -- Player Identity
  user_id UUID, -- References auth.users(id), NULL for guests/bots
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  is_bot BOOLEAN NOT NULL DEFAULT false,
  
  -- Player State
  color TEXT NOT NULL CHECK (color IN ('red', 'blue', 'green', 'yellow')),
  position_order INTEGER NOT NULL CHECK (position_order BETWEEN 1 AND 4),
  is_connected BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Game Progress
  marbles_home INTEGER NOT NULL DEFAULT 0 CHECK (marbles_home BETWEEN 0 AND 4),
  is_eliminated BOOLEAN NOT NULL DEFAULT false,
  
  UNIQUE (game_session_id, color),
  UNIQUE (game_session_id, position_order)
);

-- 3. Marbles Table
-- Represents a single marble for a player (4 marbles per player)
CREATE TABLE marbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ownership
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  marble_number INTEGER NOT NULL CHECK (marble_number BETWEEN 1 AND 4),
  
  -- Position State
  position_type TEXT NOT NULL DEFAULT 'base'
    CHECK (position_type IN ('base', 'track', 'shortcut', 'home')),
  position_index INTEGER, -- NULL if in base, 0-67 for track, 0-3 for home
  
  -- Game Events
  times_sent_back INTEGER NOT NULL DEFAULT 0,
  last_moved_at TIMESTAMPTZ,
  
  UNIQUE (player_id, marble_number)
);

-- 4. Move History Table (Optional - for replay/analytics)
-- Records every move for game history and debugging
CREATE TABLE move_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Move Context
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  move_sequence INTEGER NOT NULL,
  
  -- Move Details
  dice_roll INTEGER NOT NULL CHECK (dice_roll BETWEEN 1 AND 6),
  marble_id UUID REFERENCES marbles(id) ON DELETE SET NULL,
  from_position_type TEXT,
  from_position_index INTEGER,
  to_position_type TEXT NOT NULL,
  to_position_index INTEGER,
  
  -- Special Events
  captured_marble_id UUID REFERENCES marbles(id) ON DELETE SET NULL,
  was_bot_move BOOLEAN NOT NULL DEFAULT false,
  move_time_ms INTEGER,
  
  UNIQUE (game_session_id, move_sequence)
);

-- Add foreign key constraints for game_sessions references
ALTER TABLE game_sessions 
  ADD CONSTRAINT fk_current_turn_player 
  FOREIGN KEY (current_turn_player_id) REFERENCES players(id);

ALTER TABLE game_sessions 
  ADD CONSTRAINT fk_winner_player 
  FOREIGN KEY (winner_player_id) REFERENCES players(id);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Game Sessions Indexes
CREATE INDEX idx_game_sessions_auto_delete ON game_sessions(auto_delete_at) 
  WHERE status IN ('waiting', 'active');

CREATE INDEX idx_game_sessions_status ON game_sessions(status);

-- Players Indexes
CREATE INDEX idx_players_game_session ON players(game_session_id);

CREATE INDEX idx_players_user_id ON players(user_id) WHERE user_id IS NOT NULL;

-- Marbles Indexes  
CREATE INDEX idx_marbles_position ON marbles(player_id) 
  INCLUDE (position_type, position_index);

-- Move History Indexes
CREATE INDEX idx_move_history_game_sequence 
  ON move_history(game_session_id, move_sequence);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE marbles ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_history ENABLE ROW LEVEL SECURITY;

-- Game Sessions Policies
CREATE POLICY "Players can view their games"
  ON game_sessions FOR SELECT
  USING (
    id IN (SELECT game_session_id FROM players WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can create games"
  ON game_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Current player can update game"
  ON game_sessions FOR UPDATE
  USING (
    current_turn_player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Players Policies
CREATE POLICY "Players can view game participants"
  ON players FOR SELECT
  USING (
    game_session_id IN (
      SELECT game_session_id FROM players WHERE user_id = auth.uid()
    )
  );

-- Marbles Policies
CREATE POLICY "Players can view game marbles"
  ON marbles FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players WHERE game_session_id IN (
        SELECT game_session_id FROM players WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Players can update own marbles"
  ON marbles FOR UPDATE
  USING (
    player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
  );

-- Move History Policies
CREATE POLICY "Players can view game history"
  ON move_history FOR SELECT
  USING (
    game_session_id IN (
      SELECT game_session_id FROM players WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Update auto_delete_at whenever last_activity_at changes
CREATE OR REPLACE FUNCTION update_auto_delete_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.auto_delete_at := NEW.last_activity_at + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_auto_delete_at
  BEFORE UPDATE OF last_activity_at ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_auto_delete_at();

-- Update Trigger Function
-- Automatically updates updated_at column on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to game_sessions
CREATE TRIGGER update_game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
