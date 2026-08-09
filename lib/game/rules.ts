import {
  DOORSTEPS,
  DRIVEWAY_STARTS,
  FAT_CITIES,
  HOME_SPACES,
  MARBLES_PER_PLAYER,
  POTS,
  TRACK_LENGTH,
  describeTrackSpace,
  samePosition,
} from "./board";
import { PLAYER_COLORS, TURN_TIMEOUT_OPTIONS } from "@/types/game";
import type { GameEvent, GameEventKind, GameState, Marble, MoveOption, Player, PlayerColor, Position, TurnTimeoutSeconds } from "@/types/game";

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

    if (marble.position.area === "track" && roll <= 3 && marble.position.index === FAT_CITIES[player.color]) {
      const start = FAT_CITIES[player.color];
      const shortcut = Array.from({ length: roll }, (_, hop) => pos("track", (start + (hop + 1) * 17) % TRACK_LENGTH));
      const destinationLabel = roll === 3 ? "your Driveway" : `the ${roll === 1 ? "first" : "second"} Fat City clockwise`;
      const option = makeOption(state, marble, "fat-city", shortcut, `Take the Fat City shortcut to ${destinationLabel}`);
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

function event(message: string, playerId?: string, kind?: GameEventKind): GameEvent {
  return { id: crypto.randomUUID(), at: Date.now(), message, playerId, kind };
}

function advanceTurn(state: GameState) {
  const current = state.players.find((player) => player.id === state.currentPlayerId);
  const currentColorIndex = PLAYER_COLORS.indexOf(current?.color ?? "red");
  let next = current;
  for (let step = 1; step <= PLAYER_COLORS.length; step += 1) {
    const nextColor = PLAYER_COLORS[(currentColorIndex + step) % PLAYER_COLORS.length];
    const candidate = state.players.find((player) => player.color === nextColor);
    if (candidate) {
      next = candidate;
      break;
    }
  }
  if (!next) next = state.players[0];
  state.currentPlayerId = next.id;
  state.dice = null;
  state.turnRolls = [];
  state.turnStartedAt = Date.now();
}

function captureAt(state: GameState, player: Player, destination: Position) {
  if (destination.area === "base" || destination.area === "home") return;
  const killed = state.marbles.find((item) => item.playerId !== player.id && samePosition(item.position, destination));
  if (!killed) return;
  const isDoorstepKilling = state.doorstepChallenge?.marbleId === killed.id;
  killed.position = pos("base");
  if (isDoorstepKilling) state.doorstepChallenge = null;
  const victim = state.players.find((item) => item.id === killed.playerId)!;
  state.events.push(event(`${player.name} killed ${victim.name}'s marble!`, player.id, "kill"));
  const allBackInBase = state.marbles
    .filter((item) => item.playerId === victim.id)
    .every((item) => item.position.area === "base");
  if (allBackInBase) {
    state.events.push(event(`${victim.name} has all five marbles back in Base. Welcome to the Game!`, victim.id, "welcome"));
  }
  if (isDoorstepKilling) {
    state.events.push(event(`${player.name} made a Doorstep Killing on ${victim.name}!`, player.id, "doorstep-killing"));
  }
}

function hasFourUpTight(state: GameState, playerId: string) {
  const homeIndexes = state.marbles
    .filter((item) => item.playerId === playerId && item.position.area === "home")
    .map((item) => Number(item.position.index))
    .sort((a, b) => a - b);
  return homeIndexes.length === 4 && homeIndexes.every((index, position) => index === position + 1);
}

function homeIsPackedUpTight(state: GameState, playerId: string) {
  const homeIndexes = state.marbles
    .filter((item) => item.playerId === playerId && item.position.area === "home")
    .map((item) => Number(item.position.index))
    .sort((a, b) => a - b);
  const firstPackedIndex = HOME_SPACES - homeIndexes.length;
  return homeIndexes.every((index, position) => index === firstPackedIndex + position);
}

function isConstipated(state: GameState, player: Player, roll: number) {
  if (homeIsPackedUpTight(state, player.id)) return false;
  return state.marbles
    .filter((marble) => marble.playerId === player.id)
    .some((marble) => {
      const path = normalPath(marble, player.color, roll);
      return path?.some((position) => position.area === "home" && ownMarbleAt(state, player.id, position, marble.id)) ?? false;
    });
}

function trackDistanceFrom(start: number, destination: number) {
  return (destination - start + TRACK_LENGTH) % TRACK_LENGTH;
}

function addSniffEvents(state: GameState, movedMarble: Marble, random: () => number) {
  if (movedMarble.position.area !== "track") return;
  const destination = Number(movedMarble.position.index);
  const trackMarbles = new Map(state.marbles
    .filter((marble) => marble.position.area === "track")
    .map((marble) => [Number(marble.position.index), marble]));

  for (const offset of [-2, -1, 0]) {
    const trio = [0, 1, 2].map((step) => trackMarbles.get((destination + offset + step + TRACK_LENGTH) % TRACK_LENGTH));
    if (trio.every(Boolean) && trio.some((marble) => marble!.id === movedMarble.id) && new Set(trio.map((marble) => marble!.playerId)).size === 3) {
      const player = state.players.find((candidate) => candidate.id === movedMarble.playerId)!;
      state.events.push(event(`${player.name} completed a 3-Way-Sniff!`, player.id, "three-way-sniff"));
      return;
    }
  }

  const nearbyOpponentOnTheirDriveway = state.players.some((opponent) => {
    if (opponent.id === movedMarble.playerId || trackDistanceFrom(DRIVEWAY_STARTS[opponent.color], destination) > 8) return false;
    return state.marbles.some((marble) => marble.playerId === opponent.id && marble.position.area === "track" &&
      Math.min(trackDistanceFrom(destination, Number(marble.position.index)), trackDistanceFrom(Number(marble.position.index), destination)) === 1);
  });
  if (nearbyOpponentOnTheirDriveway && random() < .35) {
    const player = state.players.find((candidate) => candidate.id === movedMarble.playerId)!;
    state.events.push(event(`${player.name} is getting close on the Driveway. Sniff-Sniff!`, player.id, "sniff-sniff"));
  }
}

function startBungHoleIfReady(state: GameState, player: Player, movedMarble: Marble) {
  if (state.doorstepChallenge || !hasFourUpTight(state, player.id)) return;
  const doorstepMarble = state.marbles.find((marble) => marble.playerId === player.id && marble.position.area === "track" && marble.position.index === DOORSTEPS[player.color]);
  if (!doorstepMarble) return;
  const isAutoBung = movedMarble.id !== doorstepMarble.id && movedMarble.position.area === "home";
  state.doorstepChallenge = { playerId: player.id, marbleId: doorstepMarble.id, attempts: 0, pendingResolution: false };
  state.events.push(event(isAutoBung
    ? `${player.name} packed four Up Tight with the fifth already on Doorstep. Auto-Bung!`
    : `${player.name} reached the Bung Hole with four Up Tight and has three chances to roll 1.`,
  player.id, isAutoBung ? "auto-bung" : "bung-hole"));
}

export function rollForPlayer(
  state: GameState,
  playerId: string,
  random: () => number = Math.random,
  deferNoMoveAdvance = false,
) {
  if (state.status !== "active" || state.currentPlayerId !== playerId) throw new Error("It is not your turn.");
  if (state.dice !== null) throw new Error("The dice has already been rolled.");
  const player = state.players.find((item) => item.id === playerId)!;
  const roll = Math.floor(random() * 6) + 1;
  state.dice = roll;
  state.turnRolls = [...(state.turnRolls ?? []), roll];
  const rollEvent = {
    ...event(`${player.name} rolled ${roll}.`, player.id, "roll"),
    rollValue: roll,
    dieStyle: player.selectedDieStyle ?? "team",
  } satisfies GameEvent;
  state.events.push(rollEvent);
  if (state.turnRolls.slice(-3).join("-") === "6-6-3") {
    state.events.push(event(`${player.name} rolled the legendary 6-6-3!`, player.id, "six-six-three"));
  }
  if (state.turnRolls.length === 3 && state.turnRolls.every((value) => value === 6)) {
    state.events.push(event(`${player.name} rolled three consecutive 6s. 6-Again. Joe Roll?`, player.id, "three-sixes"));
  }
  const moves = getLegalMoves(state, playerId, roll);
  const challenge = state.doorstepChallenge;
  if (challenge?.playerId === playerId && !challenge.pendingResolution) {
    challenge.attempts += 1;
    state.events.push(event(challenge.attempts === 3
      ? `${player.name} is on their final Doorstep try and rolled ${roll}.`
      : `${player.name} used Doorstep try ${challenge.attempts} of 3 and rolled ${roll}.`, player.id,
    challenge.attempts === 3 ? "doorstep-final" : challenge.attempts === 2 ? "doorstep-try-2" : "doorstep-try-1"));
    if (roll !== 1) {
      challenge.pendingResolution = true;
      state.updatedAt = Date.now();
      return { roll, moves: [] };
    }
  }
  if (moves.length === 0) {
    const constipated = isConstipated(state, player, roll);
    state.events.push({
      ...event(constipated
        ? `${player.name} is constipated: their own marbles block Home.`
        : `${player.name} rolled a ${roll}, cannot move.`, player.id, constipated ? "constipated" : "no-move"),
      rollValue: roll,
      relatedRollEventId: rollEvent.id,
    });
    if (!deferNoMoveAdvance) advanceTurn(state);
  }
  state.updatedAt = Date.now();
  return { roll, moves };
}

export function applyMove(state: GameState, playerId: string, optionId: string, random: () => number = Math.random) {
  if (state.dice === null) throw new Error("Roll before moving.");
  const roll = state.dice;
  const option = getLegalMoves(state, playerId, roll).find((item) => item.id === optionId);
  if (!option) throw new Error("That move is no longer legal.");
  const player = state.players.find((item) => item.id === playerId)!;
  const marble = state.marbles.find((item) => item.id === option.marbleId)!;

  captureAt(state, player, option.destination);

  marble.position = option.destination;
  const relatedRollEvent = state.events.findLast((item) => item.kind === "roll" && item.playerId === player.id);
  state.events.push({
    ...event(`${player.name}: ${option.label}.`, player.id, "move"),
    relatedRollEventId: relatedRollEvent?.id,
  });
  if (option.destination.area === "track" && option.destination.index === FAT_CITIES[player.color]) {
    state.events.push(event(`${player.name} reached their own Fat City.`, player.id, "fat-city"));
  }
  if (option.kind === "fat-city" && roll === 2) {
    state.events.push(event(`${player.name} took the two-count Fat City route. Cut Across Shorty!`, player.id, "cut-across-shorty"));
  }
  addSniffEvents(state, marble, random);
  startBungHoleIfReady(state, player, marble);

  const isWinner = state.marbles
    .filter((item) => item.playerId === playerId)
    .every((item) => item.position.area === "home");
  if (isWinner) {
    state.status = "completed";
    state.winnerPlayerId = playerId;
    state.currentPlayerId = null;
    state.dice = null;
    state.doorstepChallenge = null;
    state.events.push(event(`${player.name} is Up Tight and wins!`, player.id, "up-tight"));
  } else if (roll === 6) {
    state.dice = null;
    state.turnStartedAt = Date.now();
    const thirdConsecutiveSix = state.turnRolls.length === 3 && state.turnRolls.every((value) => value === 6);
    state.events.push(event(`${player.name} earned another roll.`, player.id, thirdConsecutiveSix ? undefined : "six-again"));
  } else {
    advanceTurn(state);
  }
  state.updatedAt = Date.now();
  state.events = state.events.slice(-30);
  return option;
}

export function resolveDoorstepChallenge(state: GameState, playerId: string) {
  const challenge = state.doorstepChallenge;
  if (!challenge || challenge.playerId !== playerId || !challenge.pendingResolution || state.currentPlayerId !== playerId) {
    throw new Error("There is no Doorstep try to resolve.");
  }
  const player = state.players.find((item) => item.id === playerId)!;
  const marble = state.marbles.find((item) => item.id === challenge.marbleId)!;
  if (challenge.attempts >= 3) {
    const pot = pos("track", POTS[player.color]);
    captureAt(state, player, pot);
    marble.position = pot;
    state.events.push(event(`${player.name} missed the final try and goes back to their Pot.`, player.id, "back-to-pot"));
    state.doorstepChallenge = null;
    advanceTurn(state);
  } else {
    challenge.pendingResolution = false;
    advanceTurn(state);
  }
  state.updatedAt = Date.now();
  state.events = state.events.slice(-30);
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
  const first = state.players.find((player) => player.id === state.hostPlayerId) ?? state.players[0];
  state.currentPlayerId = first.id;
  state.turnRolls = [];
  state.turnStartedAt = Date.now();
  state.events.push(event(`${first.name} goes first.`));
  state.updatedAt = Date.now();
}

export function setTurnTimeout(state: GameState, playerId: string, seconds: TurnTimeoutSeconds) {
  if (state.status !== "waiting") throw new Error("The turn timer locks when the game starts.");
  if (state.hostPlayerId !== playerId) throw new Error("Only the host can change the turn timer.");
  if (!TURN_TIMEOUT_OPTIONS.includes(seconds)) throw new Error("Choose a valid turn timer.");
  state.turnTimeoutSeconds = seconds;
}

export function autoRollTimedOutPlayer(state: GameState, now: number = Date.now(), random: () => number = Math.random) {
  if (state.status !== "active" || !state.currentPlayerId || state.dice !== null) throw new Error("There is no roll waiting.");
  const current = state.players.find((player) => player.id === state.currentPlayerId)!;
  if (current.isBot) throw new Error("Bots do not use the turn timer.");
  const timeoutSeconds = state.turnTimeoutSeconds ?? 120;
  if (!timeoutSeconds || now < (state.turnStartedAt ?? state.updatedAt) + timeoutSeconds * 1000) throw new Error("The turn timer has not expired.");
  const result = rollForPlayer(state, current.id, random);
  state.events.push(event(`${current.name}'s timer expired, so the die rolled automatically.`, current.id, "auto-roll"));
  return result;
}

export function addChatMessage(state: GameState, playerId: string, rawMessage: string) {
  if (state.status !== "active") throw new Error("Chat opens when the game starts.");
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.isBot) throw new Error("Only human players can chat.");
  const message = rawMessage.trim().replace(/\s+/g, " ").slice(0, 160);
  if (!message) throw new Error("Write a message first.");
  state.chatMessages = [...(state.chatMessages ?? []), {
    id: crypto.randomUUID(), at: Date.now(), playerId, playerName: player.name, message,
  }].slice(-60);
}

export function choosePlayerColor(state: GameState, playerId: string, color: PlayerColor) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("Player not found.");
  const holder = state.players.find((candidate) => candidate.id !== playerId && candidate.color === color);
  if (holder && !holder.isBot) throw new Error("That color is already taken by another player.");
  const previousColor = player.color;
  player.color = color;
  if (holder) holder.color = previousColor;
}

export function setupEndgameTest(state: GameState) {
  if (state.players.length < 2) throw new Error("Add players before loading the endgame test.");
  for (const player of state.players) {
    const marbles = state.marbles
      .filter((marble) => marble.playerId === player.id)
      .sort((a, b) => a.number - b.number);
    marbles.slice(0, 4).forEach((marble, index) => { marble.position = pos("home", index + 1); });
    marbles[4].position = pos("track", (DOORSTEPS[player.color] - 1 + TRACK_LENGTH) % TRACK_LENGTH);
  }
  state.status = "active";
  state.currentPlayerId = state.hostPlayerId;
  state.dice = null;
  state.winnerPlayerId = null;
  state.doorstepChallenge = null;
  state.turnRolls = [];
  state.turnStartedAt = Date.now();
  state.events.push(event("Endgame test loaded: every player has four marbles packed in Home.", state.hostPlayerId));
  state.events = state.events.slice(-30);
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
  if (state.doorstepChallenge?.playerId === bot.id && state.doorstepChallenge.pendingResolution) {
    resolveDoorstepChallenge(state, bot.id);
    return;
  }
  if (state.dice === null) {
    rollForPlayer(state, bot.id, random, true);
    return;
  }
  const moves = getLegalMoves(state, bot.id, state.dice);
  const choice = chooseBotMove(state, bot.id, moves, random);
  if (choice) applyMove(state, bot.id, choice.id, random);
  else {
    advanceTurn(state);
    state.updatedAt = Date.now();
  }
}
