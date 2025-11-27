# API Contracts: Aggravation Board Game

This directory contains the API contracts for client-server communication.

## Contract Files

- **`rpc-functions.md`**: Supabase RPC (Remote Procedure Call) function signatures
- **`realtime-channels.md`**: Realtime subscription channel schemas
- **`rest-endpoints.md`**: RESTful endpoints (if any custom Edge Functions needed)

## Architecture

All game logic executes **server-side** via PostgreSQL RPC functions to prevent cheating:

1. **Client** sends user action (roll dice, move marble) → Supabase RPC
2. **Server** validates move legality, updates database, returns result
3. **Realtime** broadcasts changes to all subscribed clients
4. **Clients** update UI based on authoritative server state

This ensures:
- **No client-side move validation** (can't be bypassed)
- **Single source of truth** (PostgreSQL database)
- **Atomic transactions** (moves succeed or fail completely)
- **Row Level Security** (players can't modify other players' data)

## Testing

All RPC functions should have:
- Unit tests (SQL test suite via `pg_tap`)
- Integration tests (TypeScript calling RPC with Supabase client)
- Edge case tests (invalid moves, timeout conditions, concurrent access)
