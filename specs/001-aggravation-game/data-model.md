# Data Model: Aggravation Board Game

**Created**: 2025-11-26  
**Purpose**: Define PostgreSQL database schema, relationships, and validation rules for the multiplayer Aggravation game

## Entity-Relationship Overview

```
┌─────────────────┐
│  game_sessions  │──┐
└─────────────────┘  │
                     │ 1:N
                     ▼
                ┌─────────┐
                │ players │──┐
                └─────────┘  │
                             │ 1:N
                             ▼
                        ┌─────────┐
                        │ marbles │
                        └─────────┘
```

---

## Core Entities

### 1. `game_sessions`

Represents a single game instance with 2-4 players.

```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Game State
  status TEXT NOT NULL DEFAULT 'waiting' 
    CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  current_turn_player_id UUID REFERENCES players(id),
  current_dice_roll INTEGER CHECK (current_dice_roll BETWEEN 1 AND 6),
  turn_started_at TIMESTAMPTZ,
  
  -- Game Configuration
  num_players INTEGER NOT NULL CHECK (num_players BETWEEN 2 AND 4),
  shortcut_spaces_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Session Management (FR-016: 24-hour cleanup)
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_delete_at TIMESTAMPTZ GENERATED ALWAYS AS (last_activity_at + INTERVAL '24 hours') STORED,
  
  -- Winner Tracking
  winner_player_id UUID REFERENCES players(id),
  winning_timestamp TIMESTAMPTZ
);

-- Index for session cleanup job
CREATE INDEX idx_game_sessions_auto_delete ON game_sessions(auto_delete_at) 
  WHERE status IN ('waiting', 'active');

-- Index for active game lookups
CREATE INDEX idx_game_sessions_status ON game_sessions(status);

-- Trigger to update updated_at
CREATE TRIGGER update_game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Validation Rules**:
- `status = 'waiting'`: Lobby open, accepting players
- `status = 'active'`: Game in progress, turn-based play
- `status = 'completed'`: Game finished, winner_player_id set
- `status = 'abandoned'`: All players disconnected or 24-hour timeout
- `current_turn_player_id` must reference active player in this game
- `num_players` matches count of non-bot players when game created

---

### 2. `players`

Represents a player (human or bot) in a specific game session.

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Game Association
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  
  -- Player Identity
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null for guests/bots
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

-- Index for player lookups by game
CREATE INDEX idx_players_game_session ON players(game_session_id);

-- Index for user game history
CREATE INDEX idx_players_user_id ON players(user_id) WHERE user_id IS NOT NULL;

-- RLS Policy: Players can read all players in their games
CREATE POLICY "Players can view game participants"
  ON players FOR SELECT
  USING (
    game_session_id IN (
      SELECT game_session_id FROM players WHERE user_id = auth.uid()
    )
  );
```

**Validation Rules**:
- `display_name`: 1-50 characters, required (FR-020)
- `color`: One of red, blue, green, yellow (game assigns unique colors)
- `position_order`: Turn order (1 = first, 4 = last)
- `is_bot = true`: User_id must be NULL, display_name = "Bot Player"
- `marbles_home = 4`: Player wins when all marbles reach home
- `is_connected = false` + 60s timeout: Auto-pass turn (FR-009)

---

### 3. `marbles`

Represents a single marble for a player (4 marbles per player).

```sql
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
  times_sent_back INTEGER NOT NULL DEFAULT 0, -- Track captures for stats
  last_moved_at TIMESTAMPTZ,
  
  UNIQUE (player_id, marble_number)
);

-- Index for position-based collision detection
CREATE INDEX idx_marbles_position ON marbles(player_id) 
  INCLUDE (position_type, position_index);

-- RLS Policy: Players can read marbles in their games
CREATE POLICY "Players can view game marbles"
  ON marbles FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players WHERE game_session_id IN (
        SELECT game_session_id FROM players WHERE user_id = auth.uid()
      )
    )
  );
```

**Position Logic**:
- `position_type = 'base'`: Marble in starting base (position_index = NULL)
- `position_type = 'track'`: On main circular track (position_index 0-67)
- `position_type = 'shortcut'`: On shortcut path (position_index 0-13)
- `position_type = 'home'`: In home zone (position_index 0-3, where 3 is goal)

**Movement Rules** (enforced in application logic):
1. Roll 1 or 6: Move marble from base to start position
2. Roll 2-5 on first turn: Can't move if all marbles in base
3. Land on opponent: Send opponent back to base, increment `times_sent_back`
4. Land on own marble: Invalid move
5. Exact roll to reach home (no overshooting)

---

### 4. `move_history` (Optional - for replay/analytics)

Records every move for game history and debugging.

```sql
CREATE TABLE move_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Move Context
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  move_sequence INTEGER NOT NULL, -- Incrementing move counter per game
  
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
  move_time_ms INTEGER, -- Time taken to make move (for analytics)
  
  UNIQUE (game_session_id, move_sequence)
);

-- Index for game replay
CREATE INDEX idx_move_history_game_sequence 
  ON move_history(game_session_id, move_sequence);
```

**Usage**:
- Game replay feature (future enhancement)
- Debugging invalid state bugs
- Player statistics (average move time, captures made, etc.)
- Bot behavior analysis

---

## Supporting Tables

### 5. `lobby_invites` (Future Feature - not MVP)

For sharing game links with friends.

```sql
CREATE TABLE lobby_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE, -- 6-character alphanumeric code
  created_by_player_id UUID NOT NULL REFERENCES players(id),
  
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  max_uses INTEGER DEFAULT 1,
  times_used INTEGER NOT NULL DEFAULT 0,
  
  CHECK (times_used <= max_uses)
);

CREATE INDEX idx_lobby_invites_code ON lobby_invites(invite_code) 
  WHERE expires_at > now();
```

---

## Database Functions

### Update Trigger Function

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Turn Timer Check Function

```sql
CREATE OR REPLACE FUNCTION check_turn_timeout(session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  timeout_threshold TIMESTAMPTZ := now() - INTERVAL '60 seconds';
  turn_started TIMESTAMPTZ;
BEGIN
  SELECT turn_started_at INTO turn_started
  FROM game_sessions
  WHERE id = session_id AND status = 'active';
  
  RETURN turn_started IS NOT NULL AND turn_started < timeout_threshold;
END;
$$ LANGUAGE plpgsql;
```

### Bot Move Generation Function

```sql
CREATE OR REPLACE FUNCTION generate_bot_move(bot_player_id UUID, dice_value INTEGER)
RETURNS UUID AS $$
DECLARE
  valid_marble_ids UUID[];
  selected_marble UUID;
BEGIN
  -- Get all marbles with valid moves for this dice roll
  SELECT array_agg(id) INTO valid_marble_ids
  FROM marbles
  WHERE player_id = bot_player_id
    AND (
      -- Can move from base if rolled 1 or 6
      (position_type = 'base' AND dice_value IN (1, 6))
      -- Or can move forward if on track/shortcut
      OR position_type IN ('track', 'shortcut')
      -- Can't move into home without exact roll
    );
  
  -- Randomly select one valid marble
  IF array_length(valid_marble_ids, 1) > 0 THEN
    selected_marble := valid_marble_ids[1 + floor(random() * array_length(valid_marble_ids, 1))::int];
  END IF;
  
  RETURN selected_marble;
END;
$$ LANGUAGE plpgsql;
```

---

## Row Level Security (RLS) Policies

### Game Sessions

```sql
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Players can view games they're in
CREATE POLICY "Players can view their games"
  ON game_sessions FOR SELECT
  USING (
    id IN (SELECT game_session_id FROM players WHERE user_id = auth.uid())
  );

-- Anyone can create a new game (creates corresponding player record)
CREATE POLICY "Anyone can create games"
  ON game_sessions FOR INSERT
  WITH CHECK (true);

-- Only current turn player can update game state (via RPC function)
CREATE POLICY "Current player can update game"
  ON game_sessions FOR UPDATE
  USING (current_turn_player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  ));
```

### Players

```sql
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Covered above in CREATE TABLE section
```

### Marbles

```sql
ALTER TABLE marbles ENABLE ROW LEVEL SECURITY;

-- Players can only update their own marbles (via RPC function)
CREATE POLICY "Players can update own marbles"
  ON marbles FOR UPDATE
  USING (
    player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
  );
```

---

## Realtime Subscriptions

### Channel 1: Game Lobby

Subscribe to `game_sessions` changes for lobby updates.

```typescript
const lobbyChannel = supabase
  .channel(`lobby:${gameId}`)
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'game_sessions',
      filter: `id=eq.${gameId}`
    },
    (payload) => {
      // Update UI when game status changes or player joins
    }
  )
  .subscribe();
```

### Channel 2: Game State

Subscribe to player and marble changes during active game.

```typescript
const gameChannel = supabase
  .channel(`game:${gameId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'players',
      filter: `game_session_id=eq.${gameId}`
    },
    (payload) => {
      // Update player states (connection, marbles_home, etc.)
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'marbles',
      filter: `player_id=in.(${playerIds.join(',')})`
    },
    (payload) => {
      // Animate marble movements
    }
  )
  .subscribe();
```

### Channel 3: Turn Events (Broadcast)

For immediate events like dice rolls.

```typescript
const turnChannel = supabase
  .channel(`turns:${gameId}`)
  .on('broadcast', { event: 'dice_rolled' }, ({ payload }) => {
    // Show dice animation with rolled value
  })
  .on('broadcast', { event: 'marble_moved' }, ({ payload }) => {
    // Trigger marble move animation
  })
  .subscribe();

// Broadcast dice roll
await turnChannel.send({
  type: 'broadcast',
  event: 'dice_rolled',
  payload: { value: 4, playerId: currentPlayer.id }
});
```

---

## Data Lifecycle

### Game Creation Flow

1. User clicks "Create Game" → Calls `create_game_session()` RPC
2. RPC inserts `game_sessions` row (status = 'waiting')
3. RPC inserts `players` row (creator as player 1)
4. RPC inserts 4 `marbles` rows (all in base)
5. Returns game_session_id, redirect to `/game/[id]`

### Player Join Flow

1. User enters game code → Calls `join_game_session(game_id)` RPC
2. RPC checks: `status = 'waiting'` AND `player_count < num_players`
3. RPC assigns next available color and position_order
4. RPC inserts `players` row and 4 `marbles` rows
5. Broadcasts player joined event to lobby channel
6. If `player_count = num_players` → RPC sets `status = 'active'`, assigns first turn

### Bot Addition Flow

1. User clicks "Add Bot" in lobby → Calls `add_bot_player(game_id)` RPC
2. RPC inserts `players` row (is_bot = true, user_id = NULL, display_name = "Bot Player")
3. RPC inserts 4 `marbles` rows for bot
4. Broadcasts bot joined to lobby channel

### Turn Execution Flow

1. Current player rolls dice → UI sends `roll_dice(game_id)` RPC
2. RPC generates random 1-6, updates `current_dice_roll` and `turn_started_at`
3. RPC broadcasts `dice_rolled` event
4. Player selects marble → UI sends `move_marble(marble_id, dice_value)` RPC
5. RPC validates move legality (check collisions, exact home, etc.)
6. RPC updates `marbles` position, checks for captures
7. RPC increments turn to next player
8. RPC broadcasts `marble_moved` event
9. If player has 4 marbles home → RPC sets game status = 'completed', winner_player_id

### Bot Turn Flow

1. Game detects current_turn_player is bot → Auto-trigger after 2s delay
2. Calls `execute_bot_turn(game_id)` RPC
3. RPC rolls dice, generates random valid move via `generate_bot_move()`
4. RPC executes move and advances turn
5. Broadcasts events same as human player

### Timeout Flow

1. Background job runs every 10 seconds, queries `check_turn_timeout()`
2. If turn > 60s old → Calls `pass_turn(game_id)` RPC
3. RPC advances turn without moving, broadcasts `turn_passed` event

### Session Cleanup Flow

1. Scheduled job runs hourly: `DELETE FROM game_sessions WHERE auto_delete_at < now()`
2. Cascade deletes players, marbles, move_history (FR-016, FR-018)

---

## TypeScript Types (Auto-Generated)

```typescript
// Generated via: npx supabase gen types typescript --project-id [PROJECT_REF]

export type Database = {
  public: {
    Tables: {
      game_sessions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          status: 'waiting' | 'active' | 'completed' | 'abandoned';
          current_turn_player_id: string | null;
          current_dice_roll: number | null;
          turn_started_at: string | null;
          num_players: number;
          shortcut_spaces_enabled: boolean;
          last_activity_at: string;
          auto_delete_at: string;
          winner_player_id: string | null;
          winning_timestamp: string | null;
        };
        Insert: {
          // ... (Supabase CLI generates this)
        };
        Update: {
          // ... (Supabase CLI generates this)
        };
      };
      players: {
        Row: {
          id: string;
          created_at: string;
          game_session_id: string;
          user_id: string | null;
          display_name: string;
          is_bot: boolean;
          color: 'red' | 'blue' | 'green' | 'yellow';
          position_order: number;
          is_connected: boolean;
          last_seen_at: string;
          marbles_home: number;
          is_eliminated: boolean;
        };
        // ... Insert, Update
      };
      marbles: {
        Row: {
          id: string;
          created_at: string;
          player_id: string;
          marble_number: number;
          position_type: 'base' | 'track' | 'shortcut' | 'home';
          position_index: number | null;
          times_sent_back: number;
          last_moved_at: string | null;
        };
        // ... Insert, Update
      };
    };
  };
};
```

---

## Migration Strategy

### Initial Schema Migration

```sql
-- migrations/001_initial_schema.sql
-- Run via: npx supabase db push

CREATE TABLE game_sessions (...);
CREATE TABLE players (...);
CREATE TABLE marbles (...);
CREATE TABLE move_history (...);

-- Indexes
CREATE INDEX ...;

-- RLS Policies
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...;

-- Functions
CREATE OR REPLACE FUNCTION ...;
```

### Local Development

```bash
# Start local Supabase stack
npx supabase start

# Apply migrations
npx supabase db reset

# Generate TypeScript types
npx supabase gen types typescript --local > lib/database.types.ts
```

---

## Summary

**Total Tables**: 4 core + 1 optional  
**Total Indexes**: 9  
**Total RLS Policies**: 6  
**Total Functions**: 3  

**Key Design Decisions**:
1. **UUIDs** for all primary keys (prevents enumeration attacks)
2. **Cascade Deletes** from game_sessions (automatic cleanup)
3. **Generated Columns** for auto_delete_at (simplifies cleanup job)
4. **RLS Policies** prevent cheating (database-level authorization)
5. **Check Constraints** enforce data integrity (status enums, dice 1-6, etc.)
6. **Indexes** on foreign keys and query patterns (game lookups, position detection)
7. **Realtime Channels** for <200ms sync (Constitutional Performance Requirement)
8. **TypeScript Types** auto-generated from schema (Constitutional Code Quality)

All entities align with functional requirements and constitutional principles.
