// Base TypeScript Types
// Purpose: Core game types matching database schema

export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export type PositionType = 'base' | 'track' | 'shortcut' | 'home' | 'center';

export interface Game {
  id: string;
  created_at: string;
  updated_at: string;
  status: GameStatus;
  current_turn_player_id: string | null;
  current_dice_roll: number | null;
  turn_started_at: string | null;
  num_players: number;
  shortcut_spaces_enabled: boolean;
  last_activity_at: string;
  auto_delete_at: string;
  winner_player_id: string | null;
  winning_timestamp: string | null;
}

export interface Player {
  id: string;
  created_at: string;
  game_session_id: string;
  user_id: string | null;
  display_name: string;
  is_bot: boolean;
  color: PlayerColor;
  position_order: number;
  is_connected: boolean;
  last_seen_at: string;
  marbles_home: number;
  is_eliminated: boolean;
}

export interface Marble {
  id: string;
  created_at: string;
  player_id: string;
  marble_number: number;
  position_type: PositionType;
  position_index: number | null;
  times_sent_back: number;
  last_moved_at: string | null;
}

export interface GameState {
  game: Game;
  players: Player[];
  marbles: Marble[];
}

export interface MoveResult {
  success: boolean;
  marble_id: string;
  new_position_type: PositionType;
  new_position_index: number | null;
  captured_marble_id: string | null;
  player_won: boolean;
  next_turn_player_id: string | null;
  extra_turn?: boolean;           // True if player rolled 6 and gets another turn
  is_fat_city_hop?: boolean;      // True if move was a Fat City hop shortcut
}

export interface DiceRollResult {
  dice_value: number;
  player_id: string;
  valid_marbles: string[];
}
