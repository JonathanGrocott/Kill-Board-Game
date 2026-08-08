"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Board } from "@/components/game/Board";
import type { PublicGameState } from "@/types/game";

interface GamePageProps { params: Promise<{ code: string }> }

export default function GamePage({ params }: GamePageProps) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const [game, setGame] = useState<PublicGameState | null>(null);
  const [token, setToken] = useState("");
  const [joinName, setJoinName] = useState("");
  const [selectedMarbleId, setSelectedMarbleId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (knownToken?: string) => {
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

  const act = useCallback(async (type: "add-bot" | "start" | "roll" | "move" | "bot-step", moveId?: string) => {
    if (!token || pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/games/${code}/action`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-player-token": token },
        body: JSON.stringify({ type, moveId, actionId: crypto.randomUUID() }),
      });
      const result = await response.json() as { game?: PublicGameState; error?: string };
      if (!response.ok || !result.game) throw new Error(result.error ?? "Action failed.");
      setGame(result.game);
      setSelectedMarbleId(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed."); }
    finally { setPending(false); }
  }, [code, pending, token]);

  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  useEffect(() => {
    if (!game || game.status !== "active" || !currentPlayer?.isBot || pending) return;
    const timer = window.setTimeout(() => void act("bot-step"), 900);
    return () => window.clearTimeout(timer);
  }, [act, currentPlayer?.id, currentPlayer?.isBot, game, pending]);

  const viewer = game?.players.find((player) => player.id === game.viewerPlayerId);
  const isHost = viewer?.id === game?.hostPlayerId;
  const selectedMoves = useMemo(() => game?.legalMoves.filter((move) => move.marbleId === selectedMarbleId) ?? [], [game?.legalMoves, selectedMarbleId]);

  function chooseMarble(marbleId: string) {
    const moves = game?.legalMoves.filter((move) => move.marbleId === marbleId) ?? [];
    if (moves.length === 1) void act("move", moves[0].id);
    else setSelectedMarbleId(marbleId);
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
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
        <h1>Gather your killers.</h1>
        <p className="lead-small">Share the link, fill empty seats with bots, then let the host start.</p>
        <button className="share-card" onClick={share}><span>{copied ? "Link copied" : "Copy invite link"}</span><b>{code}</b></button>
        <div className="seat-grid">
          {[0, 1, 2, 3].map((seat) => {
            const player = game.players.find((item) => item.seat === seat);
            return <div className={`seat-card seat-${player?.color ?? "empty"}`} key={seat}><i />{player ? <><strong>{player.name}</strong><span>{player.isBot ? "BOT" : player.id === game.hostPlayerId ? "HOST" : "READY"}</span></> : <><strong>Open seat</strong><span>WAITING</span></>}</div>;
          })}
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
      <header className="game-topbar"><button className="brand-button" onClick={() => router.push("/")}>KILL<span>●</span></button><button className="room-pill" onClick={share}>{copied ? "COPIED" : `ROOM ${code}`}</button></header>
      <section className="board-column">
        {winner && <div className="victory-banner"><span>UP TIGHT</span><h1>{winner.name} wins.</h1><button className="button button-primary" onClick={() => router.push("/")}>Play again</button></div>}
        <Board players={game.players} marbles={game.marbles} legalMoves={game.legalMoves} selectedMarbleId={selectedMarbleId} onMarbleClick={chooseMarble} onMoveChoice={(moveId) => void act("move", moveId)} disabled={pending || !!winner} />
      </section>
      <aside className="control-column">
        <div className={`turn-card turn-${currentPlayer?.color ?? "none"}`}><span>{winner ? "GAME OVER" : currentPlayer?.id === viewer.id ? "YOUR TURN" : "CURRENT TURN"}</span><h2>{winner?.name ?? currentPlayer?.name}</h2>{currentPlayer?.isBot && !winner && <p className="thinking">Bot is thinking…</p>}</div>
        {!winner && currentPlayer?.id === viewer.id && !viewer.isBot && (
          <div className="dice-panel">
            <button className={`dice ${pending ? "is-rolling" : ""}`} onClick={() => act("roll")} disabled={pending || game.dice !== null} aria-label="Roll dice">{game.dice ?? "ROLL"}</button>
            <p>{game.dice === null ? "Tap to roll" : game.legalMoves.length === 1 ? "One legal move — take it" : `${game.legalMoves.length} legal moves`}</p>
          </div>
        )}
        {selectedMoves.length > 1 && <div className="move-choices"><h3>Choose a route</h3>{selectedMoves.map((move) => <button key={move.id} onClick={() => act("move", move.id)}>{move.label}{move.capturesPlayerId && <b> KILL</b>}</button>)}</div>}
        <div className="player-stack">{game.players.map((player) => { const home = game.marbles.filter((marble) => marble.playerId === player.id && marble.position.area === "home").length; return <div className={`player-row player-${player.color} ${player.id === game.currentPlayerId ? "is-current" : ""}`} key={player.id}><i /><span>{player.name}{player.isBot && <small> BOT</small>}</span><b>{home}/5 HOME</b></div>; })}</div>
        <div className="event-log"><h3>Table talk</h3>{game.events.slice(-6).reverse().map((item) => <p key={item.id}>{item.message}</p>)}</div>
        {error && <p className="form-error">{error}</p>}
      </aside>
    </main>
  );
}
