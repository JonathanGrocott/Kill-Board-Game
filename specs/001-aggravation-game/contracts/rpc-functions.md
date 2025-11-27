# Supabase RPC Functions

**Purpose**: Server-authoritative game logic via PostgreSQL stored procedures

All functions return JSON and throw exceptions on validation failures.

---

## Game Session Management

### `create_game_session`

Creates a new game session and adds the creator as the first player.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION create_game_session(
  p_display_name TEXT,
  p_num_players INTEGER DEFAULT 4,
  p_enable_shortcuts BOOLEAN DEFAULT true
)
RETURNS JSON
```

**Parameters**:
- `p_display_name`: Creator's display name (1-50 chars)
- `p_num_players`: 2, 3, or 4 players (default: 4)
- `p_enable_shortcuts`: Enable shortcut spaces (default: true)

**Returns**:
```json
{
  "game_id": "uuid",
  "player_id": "uuid",
  "color": "red",
  "position_order": 1,
  "status": "waiting"
}
```

**Errors**:
- `INVALID_NAME`: Display name empty or >50 chars
- `INVALID_PLAYER_COUNT`: num_players not 2, 3, or 4

**Implementation Logic**:
1. Validate inputs
2. Insert `game_sessions` row (status = 'waiting')
3. Assign first color ('red') and position_order (1)
4. Insert `players` row with `user_id = auth.uid()` (or NULL for guest)
5. Insert 4 `marbles` rows (all position_type = 'base')
6. Return game and player details

**SQL**:
```sql
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
  v_user_id UUID := auth.uid(); -- NULL for anonymous users
BEGIN
  -- Validate display name
  IF p_display_name IS NULL OR char_length(p_display_name) < 1 OR char_length(p_display_name) > 50 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  
  -- Validate player count
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
  
  -- Return game details
  RETURN json_build_object(
    'game_id', v_game_id,
    'player_id', v_player_id,
    'color', 'red',
    'position_order', 1,
    'status', 'waiting'
  );
END;
$$;
```

---

### `join_game_session`

Adds a new player to an existing game in 'waiting' status.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION join_game_session(
  p_game_id UUID,
  p_display_name TEXT
)
RETURNS JSON
```

**Parameters**:
- `p_game_id`: UUID of the game to join
- `p_display_name`: Player's display name (1-50 chars)

**Returns**:
```json
{
  "player_id": "uuid",
  "color": "blue",
  "position_order": 2,
  "current_player_count": 2,
  "max_players": 4
}
```

**Errors**:
- `GAME_NOT_FOUND`: Game doesn't exist
- `GAME_FULL`: Already has max players
- `GAME_STARTED`: Game status is 'active' or 'completed'
- `INVALID_NAME`: Display name validation failed

**Implementation Logic**:
1. Validate game exists and status = 'waiting'
2. Check current player count < num_players
3. Assign next available color (red → blue → green → yellow)
4. Assign position_order = current_count + 1
5. Insert `players` row
6. Insert 4 `marbles` rows
7. If player_count = num_players → Update status to 'active', set first turn
8. Return player details

**SQL**:
```sql
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
  
  -- Return player details
  RETURN json_build_object(
    'player_id', v_player_id,
    'color', v_next_color,
    'position_order', v_next_position,
    'current_player_count', v_next_position,
    'max_players', v_game.num_players
  );
END;
$$;
```

---

### `add_bot_player`

Adds a bot player to a game in 'waiting' status.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION add_bot_player(p_game_id UUID)
RETURNS JSON
```

**Parameters**:
- `p_game_id`: UUID of the game

**Returns**:
```json
{
  "bot_player_id": "uuid",
  "color": "green",
  "position_order": 3
}
```

**Errors**:
- Same as `join_game_session`

**Implementation**:
- Identical to `join_game_session` but sets `is_bot = true`, `user_id = NULL`, `display_name = 'Bot Player'`

---

## Turn Management

### `roll_dice`

Rolls the dice for the current player's turn.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION roll_dice(p_game_id UUID)
RETURNS JSON
```

**Parameters**:
- `p_game_id`: UUID of the active game

**Returns**:
```json
{
  "dice_value": 4,
  "player_id": "uuid",
  "valid_marbles": ["marble_id_1", "marble_id_2"]
}
```

**Errors**:
- `NOT_YOUR_TURN`: Caller is not the current turn player
- `GAME_NOT_ACTIVE`: Game status is not 'active'
- `ALREADY_ROLLED`: Dice already rolled this turn

**Implementation Logic**:
1. Verify game status = 'active'
2. Verify `current_turn_player_id` belongs to caller (via RLS or auth.uid() check)
3. Verify `current_dice_roll IS NULL` (hasn't rolled yet)
4. Generate random 1-6
5. Update `current_dice_roll` and `turn_started_at`
6. Calculate valid marbles (can move from base if 1 or 6, or on track/shortcut)
7. Return dice value and valid marble IDs

---

### `move_marble`

Executes a marble move for the current player.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION move_marble(
  p_game_id UUID,
  p_marble_id UUID
)
RETURNS JSON
```

**Parameters**:
- `p_game_id`: UUID of the active game
- `p_marble_id`: UUID of the marble to move

**Returns**:
```json
{
  "success": true,
  "marble_id": "uuid",
  "new_position_type": "track",
  "new_position_index": 15,
  "captured_marble_id": "uuid | null",
  "player_won": false,
  "next_turn_player_id": "uuid"
}
```

**Errors**:
- `NOT_YOUR_TURN`: Caller is not the current turn player
- `INVALID_MARBLE`: Marble doesn't belong to current player
- `NO_DICE_ROLL`: Dice not rolled yet this turn
- `INVALID_MOVE`: Move violates game rules

**Implementation Logic**:
1. Verify game status = 'active' and caller is current_turn_player
2. Verify marble belongs to current player
3. Verify `current_dice_roll IS NOT NULL`
4. Calculate new position based on dice roll and current position
5. Validate move:
   - Can only leave base on 1 or 6
   - Can't land on own marble
   - Must reach home with exact roll
   - Check shortcut eligibility
6. Check for captures (landing on opponent marble)
7. Update marble position
8. If captured opponent → Reset opponent marble to base, increment `times_sent_back`
9. Increment `marbles_home` if marble reached home
10. Check win condition (`marbles_home = 4`)
11. Advance turn to next player (or set winner)
12. Clear `current_dice_roll`
13. Return move result

**SQL** (simplified):
```sql
CREATE OR REPLACE FUNCTION move_marble(
  p_game_id UUID,
  p_marble_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player RECORD;
  v_marble RECORD;
  v_dice_roll INTEGER;
  v_new_position_type TEXT;
  v_new_position_index INTEGER;
  v_captured_marble_id UUID;
  v_player_won BOOLEAN := false;
  v_next_player_id UUID;
BEGIN
  -- Load game state
  SELECT * INTO v_game FROM game_sessions WHERE id = p_game_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'GAME_NOT_ACTIVE'; END IF;
  
  -- Verify current turn
  SELECT * INTO v_player FROM players WHERE id = v_game.current_turn_player_id;
  IF v_player.user_id != auth.uid() AND NOT v_player.is_bot THEN
    RAISE EXCEPTION 'NOT_YOUR_TURN';
  END IF;
  
  -- Get dice roll
  v_dice_roll := v_game.current_dice_roll;
  IF v_dice_roll IS NULL THEN RAISE EXCEPTION 'NO_DICE_ROLL'; END IF;
  
  -- Load marble
  SELECT * INTO v_marble FROM marbles WHERE id = p_marble_id;
  IF v_marble.player_id != v_player.id THEN RAISE EXCEPTION 'INVALID_MARBLE'; END IF;
  
  -- Calculate new position (logic omitted for brevity - see data-model.md)
  -- ... position calculation ...
  
  -- Check for captures
  SELECT id INTO v_captured_marble_id
  FROM marbles m
  JOIN players p ON m.player_id = p.id
  WHERE p.game_session_id = p_game_id
    AND p.id != v_player.id
    AND m.position_type = v_new_position_type
    AND m.position_index = v_new_position_index;
  
  -- Execute move
  UPDATE marbles SET
    position_type = v_new_position_type,
    position_index = v_new_position_index,
    last_moved_at = now()
  WHERE id = p_marble_id;
  
  -- Handle capture
  IF v_captured_marble_id IS NOT NULL THEN
    UPDATE marbles SET
      position_type = 'base',
      position_index = NULL,
      times_sent_back = times_sent_back + 1
    WHERE id = v_captured_marble_id;
  END IF;
  
  -- Update marbles_home count
  IF v_new_position_type = 'home' AND v_new_position_index = 3 THEN
    UPDATE players SET marbles_home = marbles_home + 1 WHERE id = v_player.id;
    
    -- Check win condition
    IF (SELECT marbles_home FROM players WHERE id = v_player.id) = 4 THEN
      v_player_won := true;
      UPDATE game_sessions SET
        status = 'completed',
        winner_player_id = v_player.id,
        winning_timestamp = now()
      WHERE id = p_game_id;
    END IF;
  END IF;
  
  -- Advance turn (if game not won)
  IF NOT v_player_won THEN
    SELECT id INTO v_next_player_id
    FROM players
    WHERE game_session_id = p_game_id
      AND position_order = (v_player.position_order % v_game.num_players) + 1;
    
    UPDATE game_sessions SET
      current_turn_player_id = v_next_player_id,
      current_dice_roll = NULL,
      turn_started_at = now()
    WHERE id = p_game_id;
  END IF;
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'marble_id', p_marble_id,
    'new_position_type', v_new_position_type,
    'new_position_index', v_new_position_index,
    'captured_marble_id', v_captured_marble_id,
    'player_won', v_player_won,
    'next_turn_player_id', v_next_player_id
  );
END;
$$;
```

---

### `pass_turn`

Skips the current player's turn (used for timeouts or no valid moves).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION pass_turn(p_game_id UUID)
RETURNS JSON
```

**Returns**:
```json
{
  "next_turn_player_id": "uuid",
  "reason": "timeout | no_valid_moves"
}
```

**Implementation**:
- Advance turn to next player
- Clear `current_dice_roll`
- Reset `turn_started_at`

---

## Bot Management

### `execute_bot_turn`

Automatically executes a turn for a bot player.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION execute_bot_turn(p_game_id UUID)
RETURNS JSON
```

**Returns**:
```json
{
  "bot_player_id": "uuid",
  "dice_value": 3,
  "marble_moved": "uuid | null",
  "new_position": { "type": "track", "index": 12 },
  "next_turn_player_id": "uuid"
}
```

**Implementation Logic**:
1. Verify current player is a bot (`is_bot = true`)
2. Call `roll_dice()` internally
3. Get valid marbles using dice value
4. Randomly select one valid marble (or pass if none)
5. Call `move_marble()` internally
6. Return result

---

## Utility Functions

### `get_game_state`

Returns full game state for rendering UI.

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_game_state(p_game_id UUID)
RETURNS JSON
```

**Returns**:
```json
{
  "game": {
    "id": "uuid",
    "status": "active",
    "current_turn_player_id": "uuid",
    "current_dice_roll": 4,
    "turn_started_at": "2025-01-15T10:30:00Z",
    "num_players": 4,
    "winner_player_id": null
  },
  "players": [
    {
      "id": "uuid",
      "display_name": "Alice",
      "color": "red",
      "position_order": 1,
      "is_bot": false,
      "is_connected": true,
      "marbles_home": 2
    }
  ],
  "marbles": [
    {
      "id": "uuid",
      "player_id": "uuid",
      "marble_number": 1,
      "position_type": "track",
      "position_index": 15
    }
  ]
}
```

**Implementation**:
- Join `game_sessions`, `players`, `marbles`
- Return complete state as JSON

---

### `update_player_presence`

Updates player connection status (heartbeat).

**Signature**:
```sql
CREATE OR REPLACE FUNCTION update_player_presence(
  p_player_id UUID,
  p_is_connected BOOLEAN
)
RETURNS VOID
```

**Implementation**:
```sql
UPDATE players SET
  is_connected = p_is_connected,
  last_seen_at = now()
WHERE id = p_player_id;
```

**Usage**: Called every 10 seconds by client to maintain presence.

---

## TypeScript Client Usage

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Create game
const { data, error } = await supabase.rpc('create_game_session', {
  p_display_name: 'Alice',
  p_num_players: 4,
  p_enable_shortcuts: true
});

// Join game
const { data: joinData } = await supabase.rpc('join_game_session', {
  p_game_id: gameId,
  p_display_name: 'Bob'
});

// Roll dice
const { data: diceData } = await supabase.rpc('roll_dice', {
  p_game_id: gameId
});

// Move marble
const { data: moveData } = await supabase.rpc('move_marble', {
  p_game_id: gameId,
  p_marble_id: marbleId
});
```

---

## Summary

**Total RPC Functions**: 10
- Game management: 3 (create, join, add_bot)
- Turn execution: 4 (roll_dice, move_marble, pass_turn, execute_bot_turn)
- Utility: 3 (get_game_state, update_player_presence, cleanup_old_sessions)

**Key Principles**:
- ✅ Server-authoritative (all validation server-side)
- ✅ Atomic transactions (moves succeed or fail completely)
- ✅ Type-safe (auto-generated TypeScript types)
- ✅ Secure (RLS policies + SECURITY DEFINER)
- ✅ Realtime-friendly (state changes trigger broadcasts)
