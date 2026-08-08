export const PLAYER_COLORS = ["red", "blue", "green", "yellow"] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];
export type GameStatus = "waiting" | "active" | "completed";
export type PositionArea = "base" | "track" | "center" | "home";

export interface Position {
  area: PositionArea;
  index: number | null;
}

export interface Marble {
  id: string;
  playerId: string;
  number: number;
  position: Position;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  seat: number;
  isBot: boolean;
  tokenHash?: string;
}

export interface GameEvent {
  id: string;
  at: number;
  message: string;
  playerId?: string;
}

export interface GameState {
  code: string;
  status: GameStatus;
  players: Player[];
  marbles: Marble[];
  hostPlayerId: string;
  currentPlayerId: string | null;
  dice: number | null;
  winnerPlayerId: string | null;
  createdAt: number;
  updatedAt: number;
  events: GameEvent[];
  processedActionIds: string[];
}

export type MoveKind = "base-exit" | "normal" | "center-entry" | "center-exit" | "fat-city";

export interface MoveOption {
  id: string;
  marbleId: string;
  kind: MoveKind;
  destination: Position;
  path: Position[];
  label: string;
  capturesPlayerId?: string;
}

export interface PublicGameState extends Omit<GameState, "players" | "processedActionIds"> {
  players: Array<Omit<Player, "tokenHash">>;
  legalMoves: MoveOption[];
  viewerPlayerId: string | null;
}
