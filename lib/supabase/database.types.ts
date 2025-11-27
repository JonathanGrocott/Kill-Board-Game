// Database Types Placeholder
// Purpose: TypeScript types for Supabase database schema
// TODO: Generate actual types when Supabase is running via:
// npx supabase gen types typescript --local > lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'waiting' | 'active' | 'completed' | 'abandoned';
          current_turn_player_id?: string | null;
          current_dice_roll?: number | null;
          turn_started_at?: string | null;
          num_players: number;
          shortcut_spaces_enabled?: boolean;
          last_activity_at?: string;
          winner_player_id?: string | null;
          winning_timestamp?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'waiting' | 'active' | 'completed' | 'abandoned';
          current_turn_player_id?: string | null;
          current_dice_roll?: number | null;
          turn_started_at?: string | null;
          num_players?: number;
          shortcut_spaces_enabled?: boolean;
          last_activity_at?: string;
          winner_player_id?: string | null;
          winning_timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_current_turn_player';
            columns: ['current_turn_player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_winner_player';
            columns: ['winner_player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
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
        Insert: {
          id?: string;
          created_at?: string;
          game_session_id: string;
          user_id?: string | null;
          display_name: string;
          is_bot?: boolean;
          color: 'red' | 'blue' | 'green' | 'yellow';
          position_order: number;
          is_connected?: boolean;
          last_seen_at?: string;
          marbles_home?: number;
          is_eliminated?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          game_session_id?: string;
          user_id?: string | null;
          display_name?: string;
          is_bot?: boolean;
          color?: 'red' | 'blue' | 'green' | 'yellow';
          position_order?: number;
          is_connected?: boolean;
          last_seen_at?: string;
          marbles_home?: number;
          is_eliminated?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'players_game_session_id_fkey';
            columns: ['game_session_id'];
            isOneToOne: false;
            referencedRelation: 'game_sessions';
            referencedColumns: ['id'];
          }
        ];
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
        Insert: {
          id?: string;
          created_at?: string;
          player_id: string;
          marble_number: number;
          position_type?: 'base' | 'track' | 'shortcut' | 'home';
          position_index?: number | null;
          times_sent_back?: number;
          last_moved_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          player_id?: string;
          marble_number?: number;
          position_type?: 'base' | 'track' | 'shortcut' | 'home';
          position_index?: number | null;
          times_sent_back?: number;
          last_moved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'marbles_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          }
        ];
      };
      move_history: {
        Row: {
          id: string;
          created_at: string;
          game_session_id: string;
          player_id: string;
          move_sequence: number;
          dice_roll: number;
          marble_id: string | null;
          from_position_type: string | null;
          from_position_index: number | null;
          to_position_type: string;
          to_position_index: number | null;
          captured_marble_id: string | null;
          was_bot_move: boolean;
          move_time_ms: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          game_session_id: string;
          player_id: string;
          move_sequence: number;
          dice_roll: number;
          marble_id?: string | null;
          from_position_type?: string | null;
          from_position_index?: number | null;
          to_position_type: string;
          to_position_index?: number | null;
          captured_marble_id?: string | null;
          was_bot_move?: boolean;
          move_time_ms?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          game_session_id?: string;
          player_id?: string;
          move_sequence?: number;
          dice_roll?: number;
          marble_id?: string | null;
          from_position_type?: string | null;
          from_position_index?: number | null;
          to_position_type?: string;
          to_position_index?: number | null;
          captured_marble_id?: string | null;
          was_bot_move?: boolean;
          move_time_ms?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'move_history_game_session_id_fkey';
            columns: ['game_session_id'];
            isOneToOne: false;
            referencedRelation: 'game_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'move_history_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'move_history_marble_id_fkey';
            columns: ['marble_id'];
            isOneToOne: false;
            referencedRelation: 'marbles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'move_history_captured_marble_id_fkey';
            columns: ['captured_marble_id'];
            isOneToOne: false;
            referencedRelation: 'marbles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_game_session: {
        Args: {
          p_display_name: string;
          p_num_players?: number;
          p_enable_shortcuts?: boolean;
        };
        Returns: Json;
      };
      join_game_session: {
        Args: {
          p_game_id: string;
          p_display_name: string;
        };
        Returns: Json;
      };
      add_bot_player: {
        Args: {
          p_game_id: string;
        };
        Returns: Json;
      };
      roll_dice: {
        Args: {
          p_game_id: string;
        };
        Returns: Json;
      };
      move_marble: {
        Args: {
          p_game_id: string;
          p_marble_id: string;
        };
        Returns: Json;
      };
      pass_turn: {
        Args: {
          p_game_id: string;
        };
        Returns: Json;
      };
      execute_bot_turn: {
        Args: {
          p_game_id: string;
        };
        Returns: Json;
      };
      get_game_state: {
        Args: {
          p_game_id: string;
        };
        Returns: Json;
      };
      update_player_presence: {
        Args: {
          p_player_id: string;
          p_is_connected?: boolean;
        };
        Returns: void;
      };
      check_turn_timeout: {
        Args: {
          session_id: string;
        };
        Returns: boolean;
      };
      generate_bot_move: {
        Args: {
          bot_player_id: string;
          dice_value: number;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
