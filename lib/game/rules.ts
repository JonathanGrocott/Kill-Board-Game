import {
  DOORSTEPS,
  FAT_CITIES,
  HOME_SPACES,
  MARBLES_PER_PLAYER,
  POTS,
  TRACK_LENGTH,
  describeTrackSpace,
  samePosition,
} from "./board";
import type { GameEvent, GameState, Marble, MoveOption, Player, PlayerColor, Position } from "@/types/game";

const pos = (area: Position["area"], index: number | null = null): Position => ({ area, index });
const moveId = (marbleId: string, kind: MoveOption["kind"], destination: Position) =>
  `${marbleId}:${kind}:${destination.area}:${destination.index ?? "x"}`;

function ownMarbleAt(state: GameState, playerId: string, position: Position, movingId: string) {
  return state.marbles.some((m) => m.id !== movingId && m.playerId === playerId && samePosition(m.position, position));
}

function capturedPlayerAt(state: GameState, playerId: string, position: Position) {
  if (position.area === "base" || position.area === "home") return undefined;
  return state.marbles.find((m) => m.playerId !== playerId && samePosition(m.position, position))?.playerId;
}

function pathIsOpen(state: GameState, marble: Marble, path: Position[]) {
  return path.every((position) => !ownMarbleAt(state, marble.playerId, position, marble.id));
}

function normalPath(marble: Marble, color: PlayerColor, roll: number): Position[] | null {
  if (marble.position.area !== "track" && marble.position.area !== "home") return null;
  const path: Position[] = [];
  let current = marble.position;
  for (let step = 0; step < roll; step += 1) {
    if (current.area === "track") {
      current = current.index === DOORSTEPS[color]
        ? pos("home", 0)
        : pos("track", ((current.index ?? 0) + 1) % TRACK_LENGTH);
    } else {
      const next = (current.index ?? -1) + 1;
      if (next >= HOME_SPACES) return null;
      current = pos("home", next);
    }
    path.push(current);
  }
  return path;
}

function makeOption(state: GameState, marble: Marble, kind: MoveOption["kind"], path: Position[], label: string): MoveOption | null {
  if (!path.length || !pathIsOpen(state, marble, path)) return null;
  const destination = path[path.length - 1];
  return {
    id: moveId(marble.id, kind, destination),
    marbleId: marble.id,
    kind,
    destination,
    path,
    label,
    capturesPlayerId: capturedPlayerAt(state, marble.playerId, destination),
  };
}

export function getLegalMoves(state: GameState, playerId: string, roll: number): MoveOption[] {
  if (state.status !== "active" || state.currentPlayerId !== playerId || roll < 1 || roll > 6) return [];
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return [];
  const options: MoveOption[] = [];

  for (const marble of state.marbles.filter((item) => item.playerId === playerId)) {
    if (marble.position.area === "base") {
      if (roll === 1 || roll === 6) {
        const path = [pos("track", POTS[player.color])];
        const option = makeOption(state, marble, "base-exit", path, `Bring marble ${marble.number} out to your Pot`);
        if (option) options.push(option);
      }
      continue;
    }

    if (marble.position.area === "center") {
      if (roll === 1) {
        for (const [color, index] of Object.entries(FAT_CITIES) as Array<[PlayerColor, number]>) {
          const option = makeOption(state, marble, "center-exit", [pos("track", index)], `Exit Center to ${color} Fat City`);
          if (option) options.push(option);
        }
      }
      continue;
    }

    const path = normalPath(marble, player.color, roll);
    if (path) {
      const destination = path[path.length - 1];
      const name = destination.area === "home"
        ? `Move marble ${marble.number} into Home ${Number(destination.index) + 1}`
        : `Move marble ${marble.number} to ${describeTrackSpace(Number(destination.index), player.color)}`;
      const option = makeOption(state, marble, "normal", path, name);
      if (option) options.push(option);
    }

    if (marble.position.area === "track" && roll === 3 && marble.position.index === FAT_CITIES[player.color]) {
      const start = FAT_CITIES[player.color];
      const shortcut = [1, 2, 3].map((hop) => pos("track", (start + hop * 17) % TRACK_LENGTH));
      const option = makeOption(state, marble, "fat-city", shortcut, `Take the Fat City shortcut to your Driveway`);
      if (option) options.push(option);
    }

    if (marble.position.area === "track") {
      const distanceToFatCity = (FAT_CITIES[player.color] - Number(marble.position.index) + TRACK_LENGTH) % TRACK_LENGTH;
      if (distanceToFatCity < roll && roll - distanceToFatCity === 1) {
        const pathToCenter: Position[] = [];
        for (let step = 1; step <= distanceToFatCity; step += 1) {
          pathToCenter.push(pos("track", (Number(marble.position.index) + step) % TRACK_LENGTH));
        }
        pathToCenter.push(pos("center"));
        const option = makeOption(state, marble, "center-entry", pathToCenter, `Move marble ${marble.number} into Center`);
        if (option) options.push(option);
      }
    }
  }

  return options;
}

function event(message: string, playerId?: string): GameEvent {
  return { id: crypto.randomUUID(), at: Date.now(), message, playerId };
}

function advanceTurn(state: GameState) {
  const index = state.players.findIndex((player) => player.id === state.currentPlayerId);
  const next = state.players[(index + 1) % state.players.length];
  state.currentPlayerId = next.id;
  state.dice = null;
}

export function rollForPlayer(state: GameState, playerId: string, random: () => number = Math.random) {
  if (state.status !== "active" || state.currentPlayerId !== playerId) throw new Error("It is not your turn.");
  if (state.dice !== null) throw new Error("The dice has already been rolled.");
  const player = state.players.find((item) => item.id === playerId)!;
  const roll = Math.floor(random() * 6) + 1;
  state.dice = roll;
  state.events.push(event(`${player.name} rolled ${roll}.`, player.id));
  const moves = getLegalMoves(state, playerId, roll);
  if (moves.length === 0) {
    state.events.push(event(`${player.name} had no legal move.`, player.id));
    advanceTurn(state);
  }
  state.updatedAt = Date.now();
  return { roll, moves };
}

export function applyMove(state: GameState, playerId: string, optionId: string) {
  if (state.dice === null) throw new Error("Roll before moving.");
  const roll = state.dice;
  const option = getLegalMoves(state, playerId, roll).find((item) => item.id === optionId);
  if (!option) throw new Error("That move is no longer legal.");
  const player = state.players.find((item) => item.id === playerId)!;
  const marble = state.marbles.find((item) => item.id === option.marbleId)!;

  const killed = state.marbles.find((item) => item.playerId !== playerId && samePosition(item.position, option.destination));
  if (killed) {
    killed.position = pos("base");
    const victim = state.players.find((item) => item.id === killed.playerId)!;
    state.events.push(event(`${player.name} killed ${victim.name}'s marble!`, player.id));
  }

  marble.position = option.destination;
  state.events.push(event(`${player.name}: ${option.label}.`, player.id));

  const isWinner = state.marbles
    .filter((item) => item.playerId === playerId)
    .every((item) => item.position.area === "home");
  if (isWinner) {
    state.status = "completed";
    state.winnerPlayerId = playerId;
    state.currentPlayerId = null;
    state.dice = null;
    state.events.push(event(`${player.name} is Up Tight and wins!`, player.id));
  } else if (roll === 6) {
    state.dice = null;
    state.events.push(event(`${player.name} earned another roll.`, player.id));
  } else {
    advanceTurn(state);
  }
  state.updatedAt = Date.now();
  state.events = state.events.slice(-30);
  return option;
}

export function addPlayerMarbles(state: GameState, player: Player) {
  for (let number = 1; number <= MARBLES_PER_PLAYER; number += 1) {
    state.marbles.push({ id: crypto.randomUUID(), playerId: player.id, number, position: pos("base") });
  }
}

export function startGame(state: GameState) {
  if (state.status !== "waiting") throw new Error("This game has already started.");
  if (state.players.length < 2) throw new Error("Add at least one player or bot first.");
  state.status = "active";
  state.currentPlayerId = state.players[0].id;
  state.events.push(event(`${state.players[0].name} goes first.`));
  state.updatedAt = Date.now();
}

export function chooseBotMove(state: GameState, playerId: string, moves: MoveOption[], random: () => number = Math.random) {
  if (!moves.length) return null;
  const player = state.players.find((item) => item.id === playerId)!;
  const ranked = moves.map((move) => {
    const trackProgress = move.destination.area === "track"
      ? 100 - ((DOORSTEPS[player.color] - Number(move.destination.index) + TRACK_LENGTH) % TRACK_LENGTH)
      : 0;
    return {
      move,
      score:
        (move.capturesPlayerId ? 30 : 0) +
        trackProgress +
        (move.destination.area === "home" ? 220 + Number(move.destination.index) * 8 : 0) +
        (move.kind === "fat-city" ? 130 : 0) +
        (move.kind === "center-entry" ? 100 : 0) +
        (move.kind === "base-exit" ? 55 : 0) + random(),
    };
  });
  return ranked.sort((a, b) => b.score - a.score)[0].move;
}

export function playBotStep(state: GameState, random: () => number = Math.random) {
  const bot = state.players.find((player) => player.id === state.currentPlayerId);
  if (!bot?.isBot) throw new Error("The current player is not a bot.");
  const result = rollForPlayer(state, bot.id, random);
  if (state.currentPlayerId === bot.id && state.dice !== null) {
    const choice = chooseBotMove(state, bot.id, result.moves, random);
    if (choice) applyMove(state, bot.id, choice.id);
  }
}
