export const PLAYER_COLORS = ["red", "blue", "green", "yellow"] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];
export const MARBLE_STYLES = ["swirl", "cat-eye", "pearl"] as const;
export type MarbleStyle = (typeof MARBLE_STYLES)[number];
export const DIE_STYLES = ["team", "ivory", "amber", "forest"] as const;
export type DieStyle = (typeof DIE_STYLES)[number];
export const DEFAULT_DIE_STYLES: DieStyle[] = ["team", "ivory", "amber"];
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
  marbleStyle?: MarbleStyle;
  diceStyles?: DieStyle[];
  selectedDieStyle?: DieStyle;
  tokenHash?: string;
}

export interface GameEvent {
  id: string;
  at: number;
  message: string;
  playerId?: string;
}

export interface DoorstepChallenge {
  playerId: string;
  marbleId: string;
  attempts: number;
  pendingResolution: boolean;
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
  doorstepChallenge?: DoorstepChallenge | null;
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
