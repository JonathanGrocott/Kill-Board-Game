"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Board } from "@/components/game/Board";
import { BoardDie, DiceRack } from "@/components/game/LuckyDice";
import { KitPicker } from "@/components/game/KitPicker";
import { samePosition } from "@/lib/game/board";
import { automaticDestinationMove } from "@/lib/game/interaction";
import { DEFAULT_DIE_STYLES, PLAYER_COLORS, TURN_TIMEOUT_OPTIONS } from "@/types/game";
import type { DieStyle, GameEventKind, MarbleStyle, PlayerColor, Position, PublicGameState, TurnTimeoutSeconds } from "@/types/game";

interface GamePageProps { params: Promise<{ code: string }> }

const CALLOUTS: Partial<Record<GameEventKind, string>> = {
  "doorstep-killing": "DOORSTEP KILLING!", welcome: "WELCOME TO THE GAME!", "back-to-pot": "BACK TO POT!",
  "doorstep-final": "FINAL TRY!", "doorstep-try-2": "2/3 TRIES", "doorstep-try-1": "1/3 TRIES",
  kill: "KILL!", "fat-city": "FAT CITYYY!", "six-again": "SIX AGAIN!", "up-tight": "UP TIGHT!",
  constipated: "CONSTIPATED!", "three-way-sniff": "3-WAY-SNIFF!", "sniff-sniff": "SNIFF-SNIFF!",
  "auto-bung": "AUTO-BUNG!", "bung-hole": "BUNG HOLE!", "six-six-three": "6-6-3!",
  "cut-across-shorty": "CUT ACROSS SHORTY!", "auto-roll": "AUTO-ROLL!",
};

export default function GamePage({ params }: GamePageProps) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const [game, setGame] = useState<PublicGameState | null>(null);
  const [token, setToken] = useState("");
  const [joinName, setJoinName] = useState("");
  const [selectedMarbleId, setSelectedMarbleId] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Position | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [botRolling, setBotRolling] = useState(false);
  const [dieLandingSlot, setDieLandingSlot] = useState(0);
  const rollingRef = useRef(false);
  const [selectedDie, setSelectedDie] = useState<DieStyle | null>(null);
  const [callout, setCallout] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const seenEventRef = useRef<string | null>(null);
  const eventsInitializedRef = useRef(false);

  const load = useCallback(async (knownToken?: string) => {
    if (rollingRef.current) return;
    const playerToken = knownToken ?? localStorage.getItem(`kill-token:${code}`) ?? "";
    const response = await fetch(`/api/games/${code}`, { headers: playerToken ? { "x-player-token": playerToken } : {} });
    const result = await response.json() as { game?: PublicGameState; error?: string };
    if (!response.ok || !result.game) throw new Error(result.error ?? "Could not load game.");
    setToken(playerToken);
    setGame(result.game);
    setError("");
  }, [code]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load game."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => load().catch(() => undefined), 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function join() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/games/${code}/join`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: joinName, actionId: crypto.randomUUID() }),
      });
      const result = await response.json() as { game?: PublicGameState; token?: string; error?: string };
      if (!response.ok || !result.game || !result.token) throw new Error(result.error ?? "Could not join game.");
      localStorage.setItem(`kill-token:${code}`, result.token);
      setToken(result.token); setGame(result.game);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not join."); }
    finally { setPending(false); }
  }

  const act = useCallback(async (
    type: "add-bot" | "customize" | "configure-timeout" | "start" | "roll" | "timeout-roll" | "move" | "chat" | "bot-step" | "resolve-doorstep" | "setup-endgame",
    details: {
      moveId?: string;
      marbleStyle?: MarbleStyle;
      color?: PlayerColor;
      diceStyles?: DieStyle[];
      dieStyle?: DieStyle;
      expectedUpdatedAt?: number;
      expectedPlayerId?: string | null;
      expectedDice?: number | null;
      expectedTurnStartedAt?: number;
      turnTimeoutSeconds?: TurnTimeoutSeconds;
      message?: string;
    } = {},
  ) => {
    if (!token || pending) return;
    const isDiceRoll = type === "roll" || type === "timeout-roll";
    setPending(true); setError("");
    if (isDiceRoll) { rollingRef.current = true; setRolling(true); }
    try {
      const startedAt = Date.now();
      const response = await fetch(`/api/games/${code}/action`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-player-token": token },
        body: JSON.stringify({ type, ...details, actionId: crypto.randomUUID() }),
      });
      const result = await response.json() as { game?: PublicGameState; error?: string };
      if (!response.ok || !result.game) throw new Error(result.error ?? "Action failed.");
      if (isDiceRoll) await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, 1150 - (Date.now() - startedAt))));
      setGame(result.game);
      setSelectedMarbleId(null);
      setSelectedDestination(null);
      if (type === "move") setCallout(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed."); }
    finally {
      if (isDiceRoll) { rollingRef.current = false; setRolling(false); }
      setPending(false);
    }
  }, [code, pending, token]);

  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const viewer = game?.players.find((player) => player.id === game.viewerPlayerId);
  const isHost = viewer?.id === game?.hostPlayerId;
  const gameStatus = game?.status;
  const botTurnUpdatedAt = game?.updatedAt;
  const botTurnPlayerId = game?.currentPlayerId;
  const botTurnDice = game?.dice;
  useEffect(() => {
    if (gameStatus !== "active" || !currentPlayer?.isBot || !isHost || pending || botTurnUpdatedAt === undefined) return;
    const timer = window.setTimeout(() => void act("bot-step", {
      expectedUpdatedAt: botTurnUpdatedAt,
      expectedPlayerId: botTurnPlayerId,
      expectedDice: botTurnDice,
    }), botTurnDice === null ? 850 : 2600);
    return () => window.clearTimeout(timer);
  }, [act, botTurnDice, botTurnPlayerId, botTurnUpdatedAt, currentPlayer?.id, currentPlayer?.isBot, gameStatus, isHost, pending]);

  const observedRollSignature = currentPlayer && currentPlayer.id !== viewer?.id && game?.dice !== null
    ? `${currentPlayer.id}:${game.updatedAt}:${game.dice}`
    : null;
  useEffect(() => {
    const showTimer = window.setTimeout(() => {
      setBotRolling(Boolean(observedRollSignature));
      if (observedRollSignature) setDieLandingSlot((slot) => (slot + 1 + Math.floor(Math.random() * 7)) % 8);
    }, 0);
    if (!observedRollSignature) return () => window.clearTimeout(showTimer);
    const hideTimer = window.setTimeout(() => setBotRolling(false), 1150);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [observedRollSignature]);

  const timedPlayerId = currentPlayer && !currentPlayer.isBot ? currentPlayer.id : null;
  const turnStartedAt = game?.turnStartedAt;
  const turnTimeoutSeconds = game?.turnTimeoutSeconds ?? 120;
  useEffect(() => {
    if (gameStatus !== "active" || !timedPlayerId || game?.dice !== null || !turnTimeoutSeconds || !turnStartedAt || pending) return;
    const delay = Math.max(0, turnStartedAt + turnTimeoutSeconds * 1000 - Date.now());
    const timer = window.setTimeout(() => void act("timeout-roll", {
      expectedPlayerId: timedPlayerId,
      expectedDice: null,
      expectedTurnStartedAt: turnStartedAt,
    }), delay);
    return () => window.clearTimeout(timer);
  }, [act, game?.dice, gameStatus, pending, timedPlayerId, turnStartedAt, turnTimeoutSeconds]);

  useEffect(() => {
    if (gameStatus !== "active") return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [gameStatus]);

  const doorstepPending = game?.doorstepChallenge?.pendingResolution;
  const doorstepPlayerId = game?.doorstepChallenge?.playerId;
  const doorstepUpdatedAt = game?.updatedAt;
  const doorstepDice = game?.dice;
  const viewerId = viewer?.id;
  useEffect(() => {
    if (!doorstepPending || doorstepPlayerId !== viewerId || gameStatus !== "active" || pending || doorstepUpdatedAt === undefined) return;
    const timer = window.setTimeout(() => void act("resolve-doorstep", {
      expectedUpdatedAt: doorstepUpdatedAt,
      expectedPlayerId: doorstepPlayerId,
      expectedDice: doorstepDice,
    }), 2100);
    return () => window.clearTimeout(timer);
  }, [act, doorstepDice, doorstepPending, doorstepPlayerId, doorstepUpdatedAt, gameStatus, pending, viewerId]);

  const selectedMoves = useMemo(() => game?.legalMoves.filter((move) => move.marbleId === selectedMarbleId) ?? [], [game?.legalMoves, selectedMarbleId]);
  const destinationChoices = useMemo(() => selectedDestination
    ? game?.legalMoves.filter((move) => (!selectedMarbleId || move.marbleId === selectedMarbleId) && samePosition(move.destination, selectedDestination)) ?? []
    : [], [game?.legalMoves, selectedDestination, selectedMarbleId]);
  const destinationIsKill = destinationChoices.some((move) => Boolean(move.capturesPlayerId));
  const viewerDice = viewer?.diceStyles?.length ? viewer.diceStyles : [...DEFAULT_DIE_STYLES];
  const activeDie = selectedDie && viewerDice.includes(selectedDie) ? selectedDie : viewer?.selectedDieStyle ?? viewerDice[0];
  const viewerColorIndex = PLAYER_COLORS.indexOf(viewer?.color ?? "red");
  const displayedPlayers = game ? [...game.players].sort((a, b) =>
    ((PLAYER_COLORS.indexOf(a.color) - viewerColorIndex + PLAYER_COLORS.length) % PLAYER_COLORS.length) -
    ((PLAYER_COLORS.indexOf(b.color) - viewerColorIndex + PLAYER_COLORS.length) % PLAYER_COLORS.length)
  ) : [];
  const canViewerRoll = Boolean(game && viewer && currentPlayer?.id === viewer.id && !viewer.isBot && !game.winnerPlayerId && game.dice === null && !pending && !rolling);
  const rollSelectedDie = useCallback(() => {
    if (!canViewerRoll || rollingRef.current) return;
    setDieLandingSlot((slot) => (slot + 1 + Math.floor(Math.random() * 7)) % 8);
    void act("roll", { dieStyle: activeDie });
  }, [act, activeDie, canViewerRoll]);

  useEffect(() => {
    function handleRollShortcut(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches("input, textarea, select, button, a")) return;
      if (!canViewerRoll || rollingRef.current) return;
      event.preventDefault();
      rollSelectedDie();
    }
    window.addEventListener("keydown", handleRollShortcut);
    return () => window.removeEventListener("keydown", handleRollShortcut);
  }, [canViewerRoll, rollSelectedDie]);
  const latestCalloutEvent = game?.events.slice(-8).reverse().find((item) => {
    return (item.kind && CALLOUTS[item.kind]) || /welcome to the game|doorstep killing|doorstep try|final try|back to their pot|killed|own fat city|another roll|up tight|constipated/i.test(item.message);
  });
  const latestEventId = latestCalloutEvent?.id;
  const latestEventMessage = latestCalloutEvent?.message;
  const gameReady = game !== null;

  useEffect(() => {
    if (!gameReady) return;
    if (!eventsInitializedRef.current) {
      eventsInitializedRef.current = true;
      seenEventRef.current = latestEventId ?? null;
      return;
    }
    if (!latestEventId || !latestEventMessage || seenEventRef.current === latestEventId) return;
    seenEventRef.current = latestEventId;
    const message = latestEventMessage.toLowerCase();
    const next = latestCalloutEvent?.kind ? CALLOUTS[latestCalloutEvent.kind] ?? null
      : message.includes("doorstep killing") ? "DOORSTEP KILLING!"
      : message.includes("welcome to the game") ? "WELCOME TO THE GAME!"
      : message.includes("missed the final try") || message.includes("back to their pot") ? "BACK TO POT!"
      : message.includes("final doorstep try") || message.includes("final try") ? "FINAL TRY!"
      : message.includes("doorstep try 2") ? "2/3 TRIES"
      : message.includes("doorstep try 1") ? "1/3 TRIES"
      : message.includes("killed") ? "KILL!"
      : message.includes("own fat city") ? "FAT CITYYY!"
      : message.includes("another roll") ? "SIX AGAIN!"
      : message.includes("up tight") ? "UP TIGHT!"
      : message.includes("constipated") ? "CONSTIPATED!"
      : null;
    if (!next) return;
    const showTimer = window.setTimeout(() => setCallout(next), 0);
    const hideTimer = window.setTimeout(() => setCallout(null), 1800);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, [gameReady, latestCalloutEvent?.kind, latestEventId, latestEventMessage]);

  function chooseMarble(marbleId: string) {
    setSelectedDestination(null);
    const moves = game?.legalMoves.filter((move) => move.marbleId === marbleId) ?? [];
    if (moves.length === 1) void act("move", { moveId: moves[0].id });
    else setSelectedMarbleId(marbleId);
  }

  function chooseDestination(position: Position) {
    const moves = game?.legalMoves.filter((move) => (!selectedMarbleId || move.marbleId === selectedMarbleId) && samePosition(move.destination, position)) ?? [];
    const automaticMove = automaticDestinationMove(moves);
    if (automaticMove) void act("move", { moveId: automaticMove.id });
    else if (moves.length > 1) setSelectedDestination(position);
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    const message = chatDraft.trim();
    if (!message) return;
    setChatDraft("");
    await act("chat", { message });
  }

  if (!game) return <main className="center-page"><div className="loader" /><p>{error || "Opening room…"}</p><button className="text-button" onClick={() => router.push("/")}>Back home</button></main>;

  if (!viewer) {
    return (
      <main className="center-page room-entry">
        <div className="room-code-badge">ROOM {code}</div>
        <h1>Take a seat.</h1>
        <p>{game.players.length}/4 players are here.</p>
        <input value={joinName} onChange={(event) => setJoinName(event.target.value)} maxLength={20} placeholder="Your guest name" />
        <button className="button button-primary" onClick={join} disabled={pending || game.status !== "waiting"}>{game.status === "waiting" ? "Join game" : "Game already started"}</button>
        {error && <p className="form-error">{error}</p>}
      </main>
    );
  }

  if (game.status === "waiting") {
    return (
      <main className="lobby-shell">
        <div className="room-code-badge">ROOM {code}</div>
        <h1>Choose your weapons.</h1>
        <button className="share-card" onClick={share}><span>{copied ? "Copied" : "Copy game link"}</span><b>{code}</b></button>
        <KitPicker
          color={viewer.color}
          availableColors={PLAYER_COLORS.filter((color) => !game.players.some(
            (player) => !player.isBot && player.id !== viewer.id && player.color === color,
          ))}
          marbleStyle={viewer.marbleStyle ?? "swirl"}
          diceStyles={viewer.diceStyles?.length ? viewer.diceStyles : [...DEFAULT_DIE_STYLES]}
          selectedDieStyle={viewer.selectedDieStyle ?? "team"}
          disabled={pending}
          onSave={(kit) => void act("customize", kit)}
        />
        <div className="seat-grid">
          {[0, 1, 2, 3].map((seat) => {
            const player = game.players.find((item) => item.seat === seat);
            return <div className={`seat-card seat-${player?.color ?? "empty"}`} key={seat}><i />{player ? <><strong>{player.name}</strong><span>{player.isBot ? "BOT" : player.id === game.hostPlayerId ? "HOST" : "READY"}</span></> : <><strong>Open seat</strong><span>WAITING</span></>}</div>;
          })}
        </div>
        <div className="turn-timer-setting">
          <label htmlFor="turn-timeout">AUTO-ROLL</label>
          {isHost ? (
            <select
              id="turn-timeout"
              value={game.turnTimeoutSeconds ?? 120}
              disabled={pending}
              onChange={(event) => void act("configure-timeout", { turnTimeoutSeconds: Number(event.target.value) as TurnTimeoutSeconds })}
            >
              {TURN_TIMEOUT_OPTIONS.map((seconds) => <option value={seconds} key={seconds}>{seconds === 0 ? "Off" : `${seconds / 60} min`}</option>)}
            </select>
          ) : <strong>{game.turnTimeoutSeconds === 0 ? "OFF" : `${(game.turnTimeoutSeconds ?? 120) / 60} MIN`}</strong>}
        </div>
        {isHost && <div className="lobby-actions"><button className="button button-warm" onClick={() => act("add-bot")} disabled={pending || game.players.length >= 4}>Add bot</button><button className="button button-primary" onClick={() => act("start")} disabled={pending || game.players.length < 2}>Start game</button></div>}
        {!isHost && <p className="waiting-note">Waiting for the host to start…</p>}
        {error && <p className="form-error">{error}</p>}
      </main>
    );
  }

  const winner = game.players.find((player) => player.id === game.winnerPlayerId);
  return (
    <main className="game-shell">
      <header className="game-topbar"><button className="brand-button brand-kill" onClick={() => router.push("/")} aria-label="Kill home"><strong>KILL</strong></button><button className="room-pill" onClick={share}>{copied ? "COPIED" : `ROOM ${code}`}</button></header>
      <section className="board-column">
        {winner && <div className="victory-banner"><span>UP TIGHT</span><h1>{winner.name} wins.</h1><button className="button button-primary" onClick={() => router.push("/")}>Play again</button></div>}
        <Board
          players={game.players}
          marbles={game.marbles}
          legalMoves={game.legalMoves}
          selectedMarbleId={selectedMarbleId}
          onMarbleClick={chooseMarble}
          onDestinationClick={chooseDestination}
          onBoardRoll={rollSelectedDie}
          canRoll={canViewerRoll}
          diceRolling={rolling || botRolling}
          disabled={pending || !!winner}
          callout={callout}
          viewerColor={viewer?.color}
          diceStage={(rolling || game.dice !== null) && currentPlayer ? <BoardDie styleName={rolling && viewer ? activeDie : currentPlayer.selectedDieStyle ?? "team"} color={currentPlayer.color} result={game.dice} rolling={rolling || botRolling} landingSlot={dieLandingSlot} viewerColor={viewer?.color} /> : null}
        />
      </section>
      <aside className="control-column">
        <div className={`turn-card turn-${currentPlayer?.color ?? "none"}`}><span>{winner ? "GAME OVER" : currentPlayer?.id === viewer.id ? "YOUR TURN" : "CURRENT TURN"}</span><h2>{winner?.name ?? currentPlayer?.name}</h2>{currentPlayer?.isBot && !winner && <p className="thinking">Bot is thinking…</p>}{!winner && currentPlayer && !currentPlayer.isBot && game.dice === null && turnTimeoutSeconds > 0 && <p className="turn-timer">AUTO-ROLL · {Math.max(0, Math.ceil((game.turnStartedAt + turnTimeoutSeconds * 1000 - clockNow) / 1000))}s</p>}</div>
        {!winner && currentPlayer?.id === viewer.id && !viewer.isBot && (
          <div className="dice-panel">
            <DiceRack
              styles={viewerDice}
              color={viewer.color}
              selected={activeDie}
              result={game.dice}
              rolling={rolling}
              canRoll={canViewerRoll}
              onSelect={setSelectedDie}
              onRoll={rollSelectedDie}
            />
            {game.dice !== null && <p>{game.legalMoves.length === 1 ? "ONE MOVE" : `${game.legalMoves.length} MOVES`}</p>}
          </div>
        )}
        {!selectedDestination && selectedMoves.length > 1 && <div className="move-choices"><h3>Choose a route</h3>{selectedMoves.map((move) => <button key={move.id} onClick={() => act("move", { moveId: move.id })}>{move.label}{move.capturesPlayerId && <b> KILL</b>}</button>)}</div>}
        {destinationChoices.length > 1 && <div className={`move-choices ${destinationIsKill ? "kill-choices" : ""}`}><h3>{destinationIsKill ? "Choose your killer" : "Choose your move"}</h3>{destinationChoices.map((move) => <button key={move.id} onClick={() => act("move", { moveId: move.id })}>{move.label}{move.capturesPlayerId && <b> KILL</b>}</button>)}</div>}
        <div className="player-stack">{displayedPlayers.map((player) => { const home = game.marbles.filter((marble) => marble.playerId === player.id && marble.position.area === "home").length; return <div className={`player-row player-${player.color} ${player.id === game.currentPlayerId ? "is-current" : ""}`} key={player.id}><i /><span>{player.name}{player.isBot && <small> BOT</small>}</span><b aria-label={`${home} of 5 Home`}>{home}/5</b></div>; })}</div>
        <section className="game-chat">
          <div className="chat-heading"><h3>Table chat</h3><span>LIVE</span></div>
          <div className="chat-messages" aria-live="polite">
            {game.chatMessages.length === 0 && <p className="chat-empty">No table talk yet.</p>}
            {game.chatMessages.slice(-12).map((message) => {
              const player = game.players.find((candidate) => candidate.id === message.playerId);
              return <p className={`chat-message chat-${player?.color ?? "none"}`} key={message.id}><b>{message.playerName}</b><span>{message.message}</span></p>;
            })}
          </div>
          <form className="chat-form" onSubmit={sendChat}>
            <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} maxLength={160} placeholder="Say something…" aria-label="Chat message" />
            <button type="submit" disabled={pending || !chatDraft.trim()} aria-label="Send chat message">SEND</button>
          </form>
        </section>
        <div className="event-log"><h3>Last moves</h3>{game.events.slice(-6).reverse().map((item) => <p key={item.id}>{item.message}</p>)}</div>
        {error && <p className="form-error">{error}</p>}
      </aside>
    </main>
  );
}
