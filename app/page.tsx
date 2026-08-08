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
        <h1>KILL<span className="title-dot">●</span></h1>
        <p className="lead">Race five marbles Up Tight. Block your friends, steal the shortcuts, and land the exact roll that sends them back to Base.</p>
        <div className="rule-chips">
          <span>1 or 6 gets out</span><span>6 rolls again</span><span>Exact landing kills</span>
        </div>
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
          <button className="button button-primary" onClick={() => create(false)} disabled={pending}>Create a room</button>
          <button className="button button-warm" onClick={() => create(true)} disabled={pending}>Play three bots</button>
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
        <p className="privacy-note">No account. No history. Rooms disappear after play.</p>
      </section>

      <section className="how-strip">
        <article><b>01</b><span>Get out</span><p>Roll a 1 or 6 to move from Base to your Pot.</p></article>
        <article><b>02</b><span>Take a risk</span><p>Use Fat City and Center to cut across the board.</p></article>
        <article><b>03</b><span>Get Up Tight</span><p>Pack all five marbles safely into Home first.</p></article>
      </section>
    </main>
  );
}
