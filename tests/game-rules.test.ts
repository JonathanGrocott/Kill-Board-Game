import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Board } from "../components/game/Board";
import { BASE_POINTS, DOORSTEPS, DRIVEWAY_STARTS, FAT_CITIES, HOME_POINTS, POTS, TRACK_POINTS, boardPointForViewer } from "../lib/game/board";
import { automaticDestinationMove } from "../lib/game/interaction";
import { addChatMessage, addPlayerMarbles, applyMove, autoRollTimedOutPlayer, choosePlayerColor, getLegalMoves, playBotStep, resolveDoorstepChallenge, rollForPlayer, setTurnTimeout, setupEndgameTest, startGame } from "../lib/game/rules";
import type { GameState, Player, Position } from "../types/game";

function player(id: string, seat: number): Player {
  return { id, name: id.toUpperCase(), color: ["red", "blue", "green", "yellow"][seat] as Player["color"], seat, isBot: false };
}

function state(): GameState {
  const red = player("red", 0);
  const blue = player("blue", 1);
  const game: GameState = {
    code: "ABC234", status: "active", players: [red, blue], marbles: [], hostPlayerId: red.id,
    currentPlayerId: red.id, dice: null, winnerPlayerId: null, doorstepChallenge: null,
    turnTimeoutSeconds: 120, turnStartedAt: 1, turnRolls: [], chatMessages: [],
    createdAt: 1, updatedAt: 1, events: [], processedActionIds: [],
  };
  addPlayerMarbles(game, red);
  addPlayerMarbles(game, blue);
  return game;
}

function place(game: GameState, marbleId: string, position: Position) {
  game.marbles.find((marble) => marble.id === marbleId)!.position = position;
}

describe("Kill rules", () => {
  it("places every Base to the player's right of Home", () => {
    const average = (points: { x: number; y: number }[], axis: "x" | "y") =>
      points.reduce((total, point) => total + point[axis], 0) / points.length;

    assert.ok(average(BASE_POINTS.red, "x") > 50);
    assert.ok(average(BASE_POINTS.blue, "y") > 50);
    assert.ok(average(BASE_POINTS.green, "x") < 50);
    assert.ok(average(BASE_POINTS.yellow, "y") < 50);
  });

  it("protects human colors but swaps colors with bots", () => {
    const game = state();
    assert.throws(() => choosePlayerColor(game, "red", "blue"), /already taken/i);
    const blue = game.players.find((participant) => participant.id === "blue")!;
    blue.isBot = true;
    choosePlayerColor(game, "red", "blue");
    assert.equal(game.players.find((participant) => participant.id === "red")!.color, "blue");
    assert.equal(blue.color, "red");
    assert.equal(new Set(game.players.map((participant) => participant.color)).size, game.players.length);
  });

  it("keeps the host first, then advances clockwise by board color", () => {
    const participants = [player("host", 0), player("bot-red", 1), player("bot-green", 2), player("bot-yellow", 3)];
    participants[0].color = "blue";
    participants[1].color = "red";
    participants[2].color = "green";
    participants[3].color = "yellow";
    participants.slice(1).forEach((participant) => { participant.isBot = true; });
    const game: GameState = {
      code: "COLOR1", status: "waiting", players: participants, marbles: [], hostPlayerId: "host",
      currentPlayerId: null, dice: null, winnerPlayerId: null, doorstepChallenge: null,
      turnTimeoutSeconds: 120, turnStartedAt: 1, turnRolls: [], chatMessages: [],
      createdAt: 1, updatedAt: 1, events: [], processedActionIds: [],
    };
    participants.forEach((participant) => addPlayerMarbles(game, participant));

    startGame(game);
    assert.equal(game.currentPlayerId, "host");
    for (const expected of ["bot-green", "bot-yellow", "bot-red", "host"]) {
      rollForPlayer(game, game.currentPlayerId!, () => 0.2);
      assert.equal(game.currentPlayerId, expected);
    }
  });

  it("rotates each viewer's own Home to the bottom of the board", () => {
    for (const color of ["red", "blue", "green", "yellow"] as const) {
      const displayedHome = HOME_POINTS[color].map((point) => boardPointForViewer(point, color));
      assert.ok(displayedHome.every((point) => Math.abs(point.x - 50) < 0.001));
      assert.ok(displayedHome[0].y > 50);
      const displayedBase = BASE_POINTS[color].map((point) => boardPointForViewer(point, color));
      assert.ok(displayedBase.every((point) => point.x > 50));
    }
  });

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
    assert.equal(automaticDestinationMove(moves)?.id, moves[0].id);
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
    assert.ok(game.events.some((item) => /welcome to the game/i.test(item.message)));
  });

  it("makes an opponent marble clickable when it is a legal kill destination", () => {
    const game = state();
    const redMarble = game.marbles.find((marble) => marble.playerId === "red")!;
    const blueMarble = game.marbles.find((marble) => marble.playerId === "blue")!;
    place(game, blueMarble.id, { area: "track", index: 0 });
    const legalMoves = getLegalMoves(game, "red", 1).filter((move) => move.marbleId === redMarble.id);
    const html = renderToStaticMarkup(createElement(Board, {
      players: game.players,
      marbles: game.marbles,
      legalMoves,
      selectedMarbleId: null,
      onMarbleClick: () => undefined,
      onDestinationClick: () => undefined,
    }));
    assert.match(html, /is-kill-target/);
    assert.match(html, /aria-label="Kill BLUE&#x27;s marble 1"/);
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

  it("uses rolls 1–3 to hop clockwise across Fat Cities and applies blocking", () => {
    const game = state();
    const [redOne, redTwo] = game.marbles.filter((marble) => marble.playerId === "red");
    place(game, redOne.id, { area: "track", index: FAT_CITIES.red });
    const oneMoves = getLegalMoves(game, "red", 1).filter((move) => move.marbleId === redOne.id);
    assert.ok(oneMoves.some((move) => move.kind === "center-entry" && move.destination.area === "center"));
    assert.deepEqual(oneMoves.find((move) => move.kind === "fat-city")?.path.map((position) => position.index), [23]);
    assert.deepEqual(getLegalMoves(game, "red", 2).find((move) => move.kind === "fat-city")?.path.map((position) => position.index), [23, 40]);
    let shortcut = getLegalMoves(game, "red", 3).find((move) => move.kind === "fat-city");
    assert.deepEqual(shortcut?.path.map((position) => position.index), [23, 40, 57]);
    place(game, redTwo.id, { area: "track", index: 40 });
    assert.equal(getLegalMoves(game, "red", 1).find((move) => move.kind === "fat-city")?.destination.index, 23);
    assert.equal(getLegalMoves(game, "red", 2).find((move) => move.kind === "fat-city"), undefined);
    shortcut = getLegalMoves(game, "red", 3).find((move) => move.kind === "fat-city");
    assert.equal(shortcut, undefined);
  });

  it("celebrates only the moving player's own Fat City", () => {
    const ownGame = state();
    const ownMarble = ownGame.marbles.find((marble) => marble.playerId === "red")!;
    place(ownGame, ownMarble.id, { area: "track", index: (FAT_CITIES.red - 1 + 68) % 68 });
    ownGame.dice = 1;
    const ownMove = getLegalMoves(ownGame, "red", 1).find((move) => move.marbleId === ownMarble.id)!;
    applyMove(ownGame, "red", ownMove.id);
    assert.ok(ownGame.events.some((item) => /own Fat City/i.test(item.message)));

    const otherGame = state();
    const otherMarble = otherGame.marbles.find((marble) => marble.playerId === "red")!;
    place(otherGame, otherMarble.id, { area: "track", index: (FAT_CITIES.blue - 1 + 68) % 68 });
    otherGame.dice = 1;
    const otherMove = getLegalMoves(otherGame, "red", 1).find((move) => move.marbleId === otherMarble.id)!;
    applyMove(otherGame, "red", otherMove.id);
    assert.ok(!otherGame.events.some((item) => /own Fat City/i.test(item.message)));
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

  it("highlights only the moving player's Home and never kills a marble in another Home", () => {
    const game = state();
    const red = game.marbles.find((marble) => marble.playerId === "red")!;
    const blue = game.marbles.find((marble) => marble.playerId === "blue")!;
    place(game, red.id, { area: "home", index: 0 });
    place(game, blue.id, { area: "home", index: 3 });
    const legalMoves = getLegalMoves(game, "red", 3).filter((move) => move.marbleId === red.id);
    const move = legalMoves.find((option) => option.destination.area === "home" && option.destination.index === 3)!;
    const html = renderToStaticMarkup(createElement(Board, {
      players: game.players,
      marbles: game.marbles,
      legalMoves,
      selectedMarbleId: null,
      onMarbleClick: () => undefined,
      onDestinationClick: () => undefined,
    }));

    assert.equal((html.match(/home-space is-destination/g) ?? []).length, 1);
    assert.equal((html.match(/is-destination-target/g) ?? []).length, 0);

    game.dice = 3;
    applyMove(game, "red", move.id);
    assert.deepEqual(red.position, { area: "home", index: 3 });
    assert.deepEqual(blue.position, { area: "home", index: 3 });
    assert.ok(!game.events.some((item) => /killed/i.test(item.message)));
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

  it("keeps enough roll data to replay another human's throw after they move", () => {
    const game = state();
    game.players.find((participant) => participant.id === "red")!.selectedDieStyle = "amber";
    const result = rollForPlayer(game, "red", () => 0);
    applyMove(game, "red", result.moves[0].id);
    assert.equal(game.currentPlayerId, "blue");
    assert.equal(game.dice, null);
    const rollEvent = game.events.find((item) => item.kind === "roll");
    assert.deepEqual({ playerId: rollEvent?.playerId, value: rollEvent?.rollValue, style: rollEvent?.dieStyle }, {
      playerId: "red", value: 1, style: "amber",
    });
  });

  it("splits a bot roll and move into two visible steps", () => {
    const game = state();
    game.currentPlayerId = "blue";
    game.players.find((item) => item.id === "blue")!.isBot = true;
    playBotStep(game, () => 0);
    assert.equal(game.dice, 1);
    assert.equal(game.currentPlayerId, "blue");
    playBotStep(game, () => 0);
    assert.equal(game.dice, null);
    assert.equal(game.currentPlayerId, "red");
    assert.equal(game.marbles.filter((item) => item.playerId === "blue" && item.position.area === "track").length, 1);
  });

  it("holds a bot roll with no legal move until the next visible step", () => {
    const game = state();
    game.currentPlayerId = "blue";
    game.players.find((item) => item.id === "blue")!.isBot = true;
    playBotStep(game, () => 0.2);
    assert.equal(game.dice, 2);
    assert.equal(game.currentPlayerId, "blue");
    assert.match(game.events.at(-1)!.message, /no legal move/i);
    playBotStep(game, () => 0.2);
    assert.equal(game.dice, null);
    assert.equal(game.currentPlayerId, "red");
  });

  it("calls a player constipated only when an own Home marble blocks a valid path", () => {
    const overshootGame = state();
    const overshootMarble = overshootGame.marbles.find((marble) => marble.playerId === "red")!;
    place(overshootGame, overshootMarble.id, { area: "home", index: 4 });
    rollForPlayer(overshootGame, "red", () => 0.4);
    assert.match(overshootGame.events.at(-1)!.message, /no legal move/i);
    assert.ok(!overshootGame.events.some((item) => /constipated/i.test(item.message)));

    const blockedGame = state();
    const [moving, blocker, deepBlocker] = blockedGame.marbles.filter((marble) => marble.playerId === "red");
    place(blockedGame, moving.id, { area: "track", index: DOORSTEPS.red });
    place(blockedGame, blocker.id, { area: "home", index: 1 });
    place(blockedGame, deepBlocker.id, { area: "home", index: 3 });
    rollForPlayer(blockedGame, "red", () => 0.2);
    assert.match(blockedGame.events.at(-1)!.message, /constipated/i);

    const packedGame = state();
    const packed = packedGame.marbles.filter((marble) => marble.playerId === "red");
    packed.slice(0, 4).forEach((marble, index) => place(packedGame, marble.id, { area: "home", index: index + 1 }));
    rollForPlayer(packedGame, "red", () => 0.4);
    assert.ok(!packedGame.events.some((item) => item.kind === "constipated"));
  });

  it("announces Cut Across Shorty for the two-count Fat City route", () => {
    const game = state();
    const marble = game.marbles.find((item) => item.playerId === "red")!;
    place(game, marble.id, { area: "track", index: FAT_CITIES.red });
    game.dice = 2;
    const shortcut = getLegalMoves(game, "red", 2).find((move) => move.kind === "fat-city")!;
    applyMove(game, "red", shortcut.id, () => 1);
    assert.ok(game.events.some((item) => item.kind === "cut-across-shorty"));
  });

  it("announces a 3-Way-Sniff for three consecutive teams", () => {
    const game = state();
    const green = player("green", 2);
    game.players.push(green);
    addPlayerMarbles(game, green);
    const red = game.marbles.find((marble) => marble.playerId === "red")!;
    const blue = game.marbles.find((marble) => marble.playerId === "blue")!;
    const greenMarble = game.marbles.find((marble) => marble.playerId === "green")!;
    place(game, red.id, { area: "track", index: 9 });
    place(game, blue.id, { area: "track", index: 11 });
    place(game, greenMarble.id, { area: "track", index: 12 });
    game.dice = 1;
    const move = getLegalMoves(game, "red", 1).find((option) => option.marbleId === red.id)!;
    applyMove(game, "red", move.id, () => 1);
    assert.ok(game.events.some((item) => item.kind === "three-way-sniff"));
  });

  it("occasionally announces Sniff-Sniff beside an opponent on their Driveway", () => {
    const game = state();
    const red = game.marbles.find((marble) => marble.playerId === "red")!;
    const blue = game.marbles.find((marble) => marble.playerId === "blue")!;
    place(game, red.id, { area: "track", index: DRIVEWAY_STARTS.blue });
    place(game, blue.id, { area: "track", index: DRIVEWAY_STARTS.blue + 2 });
    game.dice = 1;
    const move = getLegalMoves(game, "red", 1).find((option) => option.marbleId === red.id)!;
    applyMove(game, "red", move.id, () => 0);
    assert.ok(game.events.some((item) => item.kind === "sniff-sniff"));
  });

  it("recognizes 6-6-3 in one extended turn", () => {
    const game = state();
    for (const random of [0.99, 0.99]) {
      const result = rollForPlayer(game, "red", () => random);
      applyMove(game, "red", result.moves[0].id, () => 1);
    }
    rollForPlayer(game, "red", () => 0.4);
    assert.deepEqual(game.turnRolls, [6, 6, 3]);
    assert.ok(game.events.some((item) => item.kind === "six-six-three"));
  });

  it("celebrates the third consecutive 6 as Joe Roll exactly once", () => {
    const game = state();
    for (let rollNumber = 0; rollNumber < 3; rollNumber += 1) {
      const result = rollForPlayer(game, "red", () => 0.99);
      applyMove(game, "red", result.moves[0].id, () => 1);
    }
    assert.equal(game.events.filter((item) => item.kind === "three-sixes").length, 1);
    assert.ok(!game.events.at(-1)?.kind);

    const fourth = rollForPlayer(game, "red", () => 0.99);
    applyMove(game, "red", fourth.moves[0].id, () => 1);
    assert.equal(game.events.filter((item) => item.kind === "three-sixes").length, 1);
    assert.equal(game.events.at(-1)?.kind, "six-again");
  });

  it("announces Auto-Bung when a one packs Home around a waiting Doorstep marble", () => {
    const game = state();
    const reds = game.marbles.filter((marble) => marble.playerId === "red");
    [0, 2, 3, 4].forEach((index, marbleIndex) => place(game, reds[marbleIndex].id, { area: "home", index }));
    place(game, reds[4].id, { area: "track", index: DOORSTEPS.red });
    game.dice = 1;
    const move = getLegalMoves(game, "red", 1).find((option) => option.marbleId === reds[0].id)!;
    applyMove(game, "red", move.id);
    assert.equal(game.doorstepChallenge?.marbleId, reds[4].id);
    assert.ok(game.events.some((item) => item.kind === "auto-bung"));
  });

  it("server-enforces the configured human auto-roll deadline", () => {
    const game = state();
    game.turnTimeoutSeconds = 60;
    game.turnStartedAt = 1_000;
    assert.throws(() => autoRollTimedOutPlayer(game, 60_999, () => 0), /not expired/i);
    const result = autoRollTimedOutPlayer(game, 61_000, () => 0);
    assert.equal(result.roll, 1);
    assert.equal(game.currentPlayerId, "red");
    assert.equal(game.dice, 1);
    assert.ok(game.marbles.every((marble) => marble.position.area === "base"));
    assert.ok(game.events.some((item) => item.kind === "auto-roll"));
  });

  it("lets only the host configure the lobby timer", () => {
    const game = state();
    game.status = "waiting";
    assert.throws(() => setTurnTimeout(game, "blue", 60), /host/i);
    setTurnTimeout(game, "red", 300);
    assert.equal(game.turnTimeoutSeconds, 300);
  });

  it("keeps temporary human table chat trimmed and bounded", () => {
    const game = state();
    addChatMessage(game, "red", "  hello   family  ");
    assert.equal(game.chatMessages[0].message, "hello family");
    game.players.find((participant) => participant.id === "blue")!.isBot = true;
    assert.throws(() => addChatMessage(game, "blue", "beep"), /human/i);
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

  it("loads a repeatable four-Up-Tight endgame test position", () => {
    const game = state();
    game.status = "completed";
    game.currentPlayerId = null;
    game.winnerPlayerId = "blue";
    setupEndgameTest(game);

    for (const participant of game.players) {
      const marbles = game.marbles.filter((marble) => marble.playerId === participant.id);
      assert.deepEqual(marbles.filter((marble) => marble.position.area === "home").map((marble) => marble.position.index), [1, 2, 3, 4]);
      assert.equal(marbles.find((marble) => marble.position.area === "track")?.position.index, (DOORSTEPS[participant.color] - 1 + 68) % 68);
    }
    assert.equal(game.status, "active");
    assert.equal(game.currentPlayerId, game.hostPlayerId);
    assert.equal(game.winnerPlayerId, null);
    assert.equal(game.doorstepChallenge, null);
  });

  it("spaces three Doorstep tries across normal player turns, then sends the marble to Pot", () => {
    const game = state();
    const reds = game.marbles.filter((marble) => marble.playerId === "red");
    const blue = game.marbles.find((marble) => marble.playerId === "blue")!;
    reds.slice(0, 4).forEach((marble, index) => place(game, marble.id, { area: "home", index: index + 1 }));
    place(game, reds[4].id, { area: "track", index: DOORSTEPS.red - 1 });
    game.dice = 1;
    const doorstepMove = getLegalMoves(game, "red", 1).find((move) => move.marbleId === reds[4].id)!;
    applyMove(game, "red", doorstepMove.id);

    assert.equal(game.currentPlayerId, "blue");
    assert.equal(game.dice, null);
    assert.deepEqual(game.doorstepChallenge, { playerId: "red", marbleId: reds[4].id, attempts: 0, pendingResolution: false });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const blueTurn = rollForPlayer(game, "blue", () => 0.2);
      assert.equal(blueTurn.moves.length, 0);
      assert.equal(game.currentPlayerId, "red");
      if (attempt === 3) place(game, blue.id, { area: "track", index: POTS.red });
      const result = rollForPlayer(game, "red", () => 0.2);
      assert.equal(result.roll, 2);
      assert.equal(result.moves.length, 0);
      assert.equal(game.doorstepChallenge?.attempts, attempt);
      assert.equal(game.doorstepChallenge?.pendingResolution, true);
      resolveDoorstepChallenge(game, "red");
      if (attempt < 3) {
        assert.equal(game.currentPlayerId, "blue");
        assert.equal(game.dice, null);
      }
    }

    assert.equal(game.doorstepChallenge, null);
    assert.deepEqual(reds[4].position, { area: "track", index: POTS.red });
    assert.equal(blue.position.area, "base");
    assert.equal(game.currentPlayerId, "blue");
  });

  it("wins by rolling a 1 during the Doorstep challenge", () => {
    const game = state();
    const reds = game.marbles.filter((marble) => marble.playerId === "red");
    reds.slice(0, 4).forEach((marble, index) => place(game, marble.id, { area: "home", index: index + 1 }));
    place(game, reds[4].id, { area: "track", index: DOORSTEPS.red - 1 });
    game.dice = 1;
    const doorstepMove = getLegalMoves(game, "red", 1).find((move) => move.marbleId === reds[4].id)!;
    applyMove(game, "red", doorstepMove.id);

    rollForPlayer(game, "blue", () => 0.2);
    const result = rollForPlayer(game, "red", () => 0);
    const winningMove = result.moves.find((move) => move.marbleId === reds[4].id)!;
    applyMove(game, "red", winningMove.id);
    assert.equal(game.status, "completed");
    assert.equal(game.winnerPlayerId, "red");
    assert.equal(game.doorstepChallenge, null);
  });

  it("clears the challenge and announces a Doorstep Killing", () => {
    const game = state();
    const reds = game.marbles.filter((marble) => marble.playerId === "red");
    const blue = game.marbles.find((marble) => marble.playerId === "blue")!;
    reds.slice(0, 4).forEach((marble, index) => place(game, marble.id, { area: "home", index: index + 1 }));
    place(game, reds[4].id, { area: "track", index: DOORSTEPS.red - 1 });
    game.dice = 1;
    const doorstepMove = getLegalMoves(game, "red", 1).find((move) => move.marbleId === reds[4].id)!;
    applyMove(game, "red", doorstepMove.id);

    place(game, blue.id, { area: "track", index: DOORSTEPS.red - 1 });
    game.dice = 1;
    const kill = getLegalMoves(game, "blue", 1).find((move) => move.marbleId === blue.id)!;
    applyMove(game, "blue", kill.id);

    assert.equal(reds[4].position.area, "base");
    assert.equal(game.doorstepChallenge, null);
    assert.ok(game.events.some((item) => /Doorstep Killing/i.test(item.message)));
  });
});
