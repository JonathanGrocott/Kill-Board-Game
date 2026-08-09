# Kill release copy and UI audit

## Scope

Player-facing entry, pre-game kit selection, and active play. The goal was to make the experience feel like a finished family game for players who already know the rules, while preserving clear live state and accessible control names.

## 1. Entry screen — healthy

- Before: `03-landing-before.png`
- After: `05-landing-after.png`
- The long rules summary, rule chips, three-step explainer, and data-retention note competed with the primary actions.
- The revised screen uses a distinctive KILL wordmark, a short game-night line, and only Host, Play bots, and Join actions.

## 2. Pre-game table — healthy

- Before: `04-lobby-before.png`
- After: `06-lobby-after.png`
- Functional notes repeated selection state already communicated by color, borders, disabled states, and counters.
- The revised lobby keeps the invite code, equipment choices, seats, and host actions while reducing the copy to game language.

## 3. Active play — healthy

- Before: `01-game-before.png`
- After: `07-game-after.png`
- The local endgame testing panel and idle dice explanation were developer-facing clutter.
- The revised play screen keeps only the turn, die, legal-move count, player progress, and recent moves. The endgame setup endpoint remains available to automated/local tests but no longer appears in player UI.

## Accessibility notes

- The decorative wordmark retains a real level-one heading name.
- Taken colors remain disabled and expose `taken` in their accessible names.
- The compact Home score exposes the full “of 5 Home” label to assistive technology.
- Keyboard focus styling and the Space-to-roll hint remain visible.
- Screenshot review cannot confirm complete keyboard traversal, screen-reader behavior, or motion preferences; automated tests and DOM inspection cover only part of those concerns.
