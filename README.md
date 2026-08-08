# Kill

A temporary-room, guest-only online version of the family marble game **Kill**. Four seats can be filled by friends or bots. The first player to get all five marbles safely Home and **Up Tight** wins.

## Rules

Read [GAME_RULES.md](GAME_RULES.md) before changing gameplay. The rules were captured directly from the game owner and intentionally differ from generic Aggravation rules.

## Architecture

- React App Router site compiled by vinext for Codex Sites
- Codex Sites D1 for temporary room state
- Server-authoritative dice, legal moves, kills, turns, bots, and victory
- Guest display names with private per-device player tokens; no accounts
- Polling-based synchronization suited to turn-based play

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run lint
npm run build
```

No environment variables or external services are required. Local D1 data is stored by Wrangler and hosted D1 is provisioned by Codex Sites.
