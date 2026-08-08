# Kill project instructions

Before changing gameplay, read `GAME_RULES.md`. It is the authoritative rules source captured directly from the game owner. Do not substitute generic Aggravation or Trouble rules.

## Product scope

- Five marbles per player.
- Four seats per room; seats may be humans with guest names or bots.
- No accounts and no permanent player profiles.
- Codex Sites is the only hosting target. Use the Sites D1 binding for temporary room state.
- A private player token authorizes actions. Never expose tokens in shared game state or URLs.
- Completed rooms expire after a short victory-viewing grace period; abandoned rooms expire automatically.

## Engineering constraints

- The server is authoritative for dice, legal moves, kills, turn order, bot actions, and victory.
- Model the board as a graph with optional branches. Do not reduce the rules to a single modulo-track calculation.
- A player's own marble blocks both landing and passage on every route, including shortcuts and Home.
- Keep the pure rules engine independent from D1 and route handlers so it can be exhaustively tested.
- Any rule ambiguity must be resolved with the game owner and recorded in `GAME_RULES.md` before implementation.
