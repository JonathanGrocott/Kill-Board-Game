import { env } from "cloudflare:workers";
import type { DieStyle, GameState, Player, PublicGameState } from "@/types/game";
import { DEFAULT_DIE_STYLES, MARBLE_STYLES, PLAYER_COLORS } from "@/types/game";
import { addPlayerMarbles, getLegalMoves } from "@/lib/game/rules";

const ACTIVE_TTL_MS = 12 * 60 * 60 * 1000;
const COMPLETED_TTL_MS = 60 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface GameRow {
  code: string;
  state_json: string;
  version: number;
  expires_at: number;
}

function db() {
  if (!env.DB) throw new Error("Game storage is unavailable.");
  return env.DB;
}

export async function ensureSchema() {
  await db().prepare(`CREATE TABLE IF NOT EXISTS games (
    code TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`).run();
  await db().prepare("CREATE INDEX IF NOT EXISTS idx_games_expires_at ON games(expires_at)").run();
  await db().prepare("PRAGMA optimize").run();
}

function randomCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}

export function createPlayerToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function cleanName(name: string) {
  const result = name.trim().replace(/\s+/g, " ").slice(0, 20);
  if (result.length < 2) throw new Error("Name must be between 2 and 20 characters.");
  return result;
}

async function makePlayer(name: string, seat: number, isBot: boolean, token?: string): Promise<Player> {
  const marbleStyle = MARBLE_STYLES[seat % MARBLE_STYLES.length];
  const diceStyles = [...DEFAULT_DIE_STYLES] as DieStyle[];
  return {
    id: crypto.randomUUID(),
    name: cleanName(name),
    color: PLAYER_COLORS[seat],
    seat,
    isBot,
    marbleStyle,
    diceStyles,
    selectedDieStyle: "team",
    tokenHash: token ? await hashToken(token) : undefined,
  };
}

export async function createGame(name: string, practice: boolean) {
  await ensureSchema();
  await db().prepare("DELETE FROM games WHERE expires_at < ?").bind(Date.now()).run();
  const token = createPlayerToken();
  const host = await makePlayer(name, 0, false, token);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const now = Date.now();
    const code = randomCode();
    const state: GameState = {
      code,
      status: "waiting",
      players: [host],
      marbles: [],
      hostPlayerId: host.id,
      currentPlayerId: null,
      dice: null,
      winnerPlayerId: null,
      createdAt: now,
      updatedAt: now,
      events: [{ id: crypto.randomUUID(), at: now, message: `${host.name} created the room.`, playerId: host.id }],
      processedActionIds: [],
    };
    addPlayerMarbles(state, host);
    if (practice) {
      for (let seat = 1; seat < 4; seat += 1) {
        const bot = await makePlayer(`Bot ${seat}`, seat, true);
        state.players.push(bot);
        addPlayerMarbles(state, bot);
      }
    }
    const result = await db().prepare(
      "INSERT OR IGNORE INTO games (code, state_json, version, created_at, updated_at, expires_at) VALUES (?, ?, 1, ?, ?, ?)"
    ).bind(code, JSON.stringify(state), now, now, now + ACTIVE_TTL_MS).run();
    if (result.meta.changes === 1) return { state, token };
  }
  throw new Error("Could not create a room. Please try again.");
}

export async function loadGame(code: string) {
  await ensureSchema();
  const row = await db().prepare("SELECT code, state_json, version, expires_at FROM games WHERE code = ? AND expires_at > ?")
    .bind(code.toUpperCase(), Date.now()).first<GameRow>();
  if (!row) throw new Error("Game not found or expired.");
  return { state: JSON.parse(row.state_json) as GameState, version: row.version };
}

export async function playerForToken(state: GameState, token: string | null) {
  if (!token) return null;
  const digest = await hashToken(token);
  return state.players.find((player) => player.tokenHash === digest) ?? null;
}

export async function publicGame(state: GameState, token: string | null): Promise<PublicGameState> {
  const viewer = await playerForToken(state, token);
  const legalMoves = viewer && state.dice !== null
    ? getLegalMoves(state, viewer.id, state.dice)
    : [];
  return {
    code: state.code,
    status: state.status,
    marbles: state.marbles,
    hostPlayerId: state.hostPlayerId,
    currentPlayerId: state.currentPlayerId,
    dice: state.dice,
    winnerPlayerId: state.winnerPlayerId,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    events: state.events,
    players: state.players.map((player) => {
      const configuredDice = player.diceStyles?.length ? [...player.diceStyles] : [...DEFAULT_DIE_STYLES];
      const diceStyles = player.isBot && !configuredDice.includes("team")
        ? ["team" as DieStyle, ...configuredDice].slice(0, 3)
        : configuredDice;
      return {
        id: player.id,
        name: player.name,
        color: player.color,
        seat: player.seat,
        isBot: player.isBot,
        marbleStyle: player.marbleStyle ?? "swirl",
        diceStyles,
        selectedDieStyle: player.isBot ? "team" : player.selectedDieStyle ?? "team",
      };
    }),
    legalMoves,
    viewerPlayerId: viewer?.id ?? null,
  };
}

export async function mutateGame(
  code: string,
  actionId: string,
  mutate: (state: GameState) => boolean | void | Promise<boolean | void>,
) {
  await ensureSchema();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { state, version } = await loadGame(code);
    if (state.processedActionIds.includes(actionId)) return state;
    const shouldCommit = await mutate(state);
    if (shouldCommit === false) return state;
    state.processedActionIds = [...state.processedActionIds.slice(-39), actionId];
    state.updatedAt = Date.now();
    const expiresAt = Date.now() + (state.status === "completed" ? COMPLETED_TTL_MS : ACTIVE_TTL_MS);
    const result = await db().prepare(
      "UPDATE games SET state_json = ?, version = version + 1, updated_at = ?, expires_at = ? WHERE code = ? AND version = ?"
    ).bind(JSON.stringify(state), state.updatedAt, expiresAt, code.toUpperCase(), version).run();
    if (result.meta.changes === 1) return state;
  }
  throw new Error("The game changed at the same time. Please try again.");
}

export async function joinGame(code: string, name: string, actionId: string) {
  const token = createPlayerToken();
  const tokenHash = await hashToken(token);
  let joinedId = "";
  const state = await mutateGame(code, actionId, (game) => {
    if (game.status !== "waiting") throw new Error("This game has already started.");
    if (game.players.length >= 4) throw new Error("This game is full.");
    const normalized = cleanName(name);
    if (game.players.some((player) => player.name.toLowerCase() === normalized.toLowerCase())) {
      throw new Error("That name is already being used in this room.");
    }
    const seat = game.players.length;
    const color = PLAYER_COLORS.find((candidate) => !game.players.some((player) => player.color === candidate));
    if (!color) throw new Error("No color is available.");
    const player: Player = {
      id: crypto.randomUUID(), name: normalized, color, seat, isBot: false, tokenHash,
      marbleStyle: "swirl", diceStyles: [...DEFAULT_DIE_STYLES], selectedDieStyle: "team",
    };
    joinedId = player.id;
    game.players.push(player);
    addPlayerMarbles(game, player);
    game.events.push({ id: crypto.randomUUID(), at: Date.now(), message: `${player.name} joined the room.`, playerId: player.id });
  });
  if (!joinedId) throw new Error("This join request was already used.");
  return { state, token };
}
