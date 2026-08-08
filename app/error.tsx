"use client";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en"><body><main className="center-page"><div className="room-code-badge">TABLE FLIPPED</div><h1>Something went wrong.</h1><p>The room may have expired, or the connection took a bad roll.</p><button className="button button-primary" onClick={reset}>Try again</button><button className="text-button" onClick={() => { window.location.href = "/"; }}>Return home</button></main></body></html>
  );
}
