"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CreatedGame { game: { code: string }; token: string }

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function create(practice: boolean) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, practice }),
      });
      const result = await response.json() as CreatedGame & { error?: string };
      if (!response.ok) throw new Error(result.error);
      localStorage.setItem(`kill-token:${result.game.code}`, result.token);
      router.push(`/game/${result.game.code}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create game.");
      setPending(false);
    }
  }

  function openRoom() {
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      setError("Enter the six-character room code.");
      return;
    }
    router.push(`/game/${normalized}`);
  }

  return (
    <main className="landing-shell">
      <section className="landing-copy">
        <div className="eyebrow">THE MARBLE GAME OF CALCULATED REVENGE</div>
        <h1 className="kill-wordmark"><span className="sr-only">Kill</span><span aria-hidden="true">K</span><span aria-hidden="true">I</span><span aria-hidden="true">L</span><span aria-hidden="true">L</span></h1>
        <p className="lead">Five marbles. One way home. No mercy.</p>
        <p className="up-tight-signoff">GET UP TIGHT.</p>
      </section>

      <section className="start-card" aria-label="Start playing">
        <label htmlFor="player-name">Your guest name</label>
        <input
          id="player-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Marble menace"
          maxLength={20}
          autoComplete="nickname"
        />
        <div className="primary-actions">
          <button className="button button-primary" onClick={() => create(false)} disabled={pending}>Host game</button>
          <button className="button button-warm" onClick={() => create(true)} disabled={pending}>Play bots</button>
        </div>
        <div className="join-divider"><span>or join friends</span></div>
        <div className="join-row">
          <input
            aria-label="Room code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6))}
            placeholder="ROOM CODE"
            className="code-input"
          />
          <button className="button button-ghost" onClick={openRoom}>Join</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
