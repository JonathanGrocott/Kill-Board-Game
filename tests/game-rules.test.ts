import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FAT_CITIES, TRACK_POINTS } from "../lib/game/board";
import { addPlayerMarbles, applyMove, getLegalMoves, rollForPlayer } from "../lib/game/rules";
import type { GameState, Player, Position } from "../types/game";

function player(id: string, seat: number): Player {
  return { id, name: id.toUpperCase(), color: ["red", "blue", "green", "yellow"][seat] as Player["color"], seat, isBot: false };
}

function state(): GameState {
  const red = player("red", 0);
  const blue = player("blue", 1);
  const game: GameState = {
    code: "ABC234", status: "active", players: [red, blue], marbles: [], hostPlayerId: red.id,
    currentPlayerId: red.id, dice: null, winnerPlayerId: null, createdAt: 1, updatedAt: 1, events: [], processedActionIds: [],
  };
  addPlayerMarbles(game, red);
  addPlayerMarbles(game, blue);
  return game;
}

function place(game: GameState, marbleId: string, position: Position) {
  game.marbles.find((marble) => marble.id === marbleId)!.position = position;
}

describe("Kill rules", () => {
  it("lays out 68 unique, evenly spaced perimeter spots", () => {
    assert.equal(TRACK_POINTS.length, 68);
    assert.equal(new Set(TRACK_POINTS.map((point) => `${point.x.toFixed(3)}:${point.y.toFixed(3)}`)).size, 68);
    const distances = TRACK_POINTS.map((point, index) => {
      const next = TRACK_POINTS[(index + 1) % TRACK_POINTS.length];
      return Math.hypot(next.x - point.x, next.y - point.y);
    });
    assert.ok(distances.every((distance) => Math.abs(distance - distances[0]) < 0.001));
  });

  it("only leaves Base on 1 or 6 and consumes the roll at Pot", () => {
    const game = state();
    assert.equal(getLegalMoves(game, "red", 5).length, 0);
    const moves = getLegalMoves(game, "red", 6);
    assert.equal(moves.length, 5);
    assert.ok(moves.every((move) => move.kind === "base-exit" && move.destination.index === 0));
  });

  it("blocks Base exit with an own marble on Pot and kills an opponent there", () => {
    const game = state();
    const [redOne, redTwo] = game.marbles.filter((marble) => marble.playerId === "red");
    const blueOne = game.marbles.find((marble) => marble.playerId === "blue")!;
    place(game, redOne.id, { area: "track", index: 0 });
    assert.ok(!getLegalMoves(game, "red", 1).some((move) => move.marbleId === redTwo.id));
    place(game, redOne.id, { area: "track", index: 4 });
    place(game, blueOne.id, { area: "track", index: 0 });
    game.dice = 1;
    const kill = getLegalMoves(game, "red", 1).find((move) => move.marbleId === redTwo.id)!;
    applyMove(game, "red", kill.id);
    assert.equal(blueOne.position.area, "base");
  });

  it("cannot pass an own marble but can pass opponents", () => {
    const game = state();
    const [redOne, redTwo] = game.marbles.filter((marble) => marble.playerId === "red");
    const blueOne = game.marbles.find((marble) => marble.playerId === "blue")!;
    place(game, redOne.id, { area: "track", index: 7 });
    place(game, redTwo.id, { area: "track", index: 9 });
    assert.ok(!getLegalMoves(game, "red", 3).some((move) => move.marbleId === redOne.id && move.kind === "normal"));
    place(game, redTwo.id, { area: "base", index: null });
    place(game, blueOne.id, { area: "track", index: 9 });
    assert.ok(getLegalMoves(game, "red", 3).some((move) => move.marbleId === redOne.id && move.destination.index === 10));
  });

  it("offers Center when the count reaches own Fat City with one step left", () => {
    const game = state();
    const redOne = game.marbles.find((marble) => marble.playerId === "red")!;
    place(game, redOne.id, { area: "track", index: 4 });
    const moves = getLegalMoves(game, "red", 3).filter((move) => move.marbleId === redOne.id);
    assert.ok(moves.some((move) => move.kind === "center-entry" && move.destination.area === "center"));
    assert.ok(moves.some((move) => move.kind === "normal" && move.destination.index === 7));
  });

  it("takes a 3 across three Fat Cities and applies intermediate blocking", () => {
    const game = state();
    const [redOne, redTwo] = game.marbles.filter((marble) => marble.playerId === "red");
    place(game, redOne.id, { area: "track", index: FAT_CITIES.red });
    let shortcut = getLegalMoves(game, "red", 3).find((move) => move.kind === "fat-city");
    assert.deepEqual(shortcut?.path.map((position) => position.index), [23, 40, 57]);
    place(game, redTwo.id, { area: "track", index: 40 });
    shortcut = getLegalMoves(game, "red", 3).find((move) => move.kind === "fat-city");
    assert.equal(shortcut, undefined);
  });

  it("exits Center only on 1 and can choose any unblocked Fat City", () => {
    const game = state();
    const [redOne, redTwo] = game.marbles.filter((marble) => marble.playerId === "red");
    place(game, redOne.id, { area: "center", index: null });
    assert.equal(getLegalMoves(game, "red", 2).filter((move) => move.marbleId === redOne.id).length, 0);
    assert.equal(getLegalMoves(game, "red", 1).filter((move) => move.marbleId === redOne.id).length, 4);
    place(game, redTwo.id, { area: "track", index: FAT_CITIES.blue });
    assert.equal(getLegalMoves(game, "red", 1).filter((move) => move.marbleId === redOne.id).length, 3);
  });

  it("turns from Doorstep into Home, rejects overshoot, and cannot pass Home marbles", () => {
    const game = state();
    const [redOne, redTwo] = game.marbles.filter((marble) => marble.playerId === "red");
    place(game, redOne.id, { area: "track", index: 65 });
    assert.equal(getLegalMoves(game, "red", 5).find((move) => move.marbleId === redOne.id)?.destination.index, 4);
    assert.ok(!getLegalMoves(game, "red", 6).some((move) => move.marbleId === redOne.id));
    place(game, redOne.id, { area: "home", index: 0 });
    place(game, redTwo.id, { area: "home", index: 2 });
    assert.ok(!getLegalMoves(game, "red", 3).some((move) => move.marbleId === redOne.id));
  });

  it("grants another turn for a used 6 but advances when no move exists", () => {
    const game = state();
    const rolled = rollForPlayer(game, "red", () => 0.99);
    applyMove(game, "red", rolled.moves[0].id);
    assert.equal(game.currentPlayerId, "red");
    assert.equal(game.dice, null);

    for (const marble of game.marbles.filter((item) => item.playerId === "red")) place(game, marble.id, { area: "center", index: null });
    rollForPlayer(game, "red", () => 0.99);
    assert.equal(game.currentPlayerId, "blue");
  });

  it("wins only after all five marbles are Home", () => {
    const game = state();
    const reds = game.marbles.filter((marble) => marble.playerId === "red");
    reds.slice(0, 4).forEach((marble, index) => place(game, marble.id, { area: "home", index: index + 1 }));
    place(game, reds[4].id, { area: "track", index: 65 });
    game.dice = 1;
    const move = getLegalMoves(game, "red", 1).find((item) => item.marbleId === reds[4].id)!;
    applyMove(game, "red", move.id);
    assert.equal(game.status, "completed");
    assert.equal(game.winnerPlayerId, "red");
  });
});
