# Implementation Plan: Multiplayer Aggravation Board Game

**Branch**: `001-aggravation-game` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-aggravation-game/spec.md`

## Summary

Build a fast, simple, multiplayer online Aggravation marble-and-dice board game that works in any modern browser and mobile devices with no installation. The application will use Next.js 15 with React 19 for the frontend, Supabase for database/auth/realtime, and deploy to Vercel. All technologies will be open-source and free to host on their respective free tiers. The game supports 2-4 players (human or bot), real-time synchronization via Supabase Realtime, guest authentication, and mobile-responsive design.

## Technical Context

**Language/Version**: TypeScript 5.3+, JavaScript (ES2022)
**Primary Dependencies**: Next.js 15, React 19, Supabase JS Client v2, Tailwind CSS 3.4+
**Storage**: Supabase PostgreSQL (relational database for game sessions, players, moves)
**Testing**: Vitest (unit tests), Playwright (E2E tests), React Testing Library (component tests)
**Target Platform**: Web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+), Mobile browsers (iOS Safari, Chrome Android)
**Project Type**: Web application (Next.js app with frontend + Supabase backend)
**Performance Goals**: <2s page load, <200ms real-time sync, 60fps animations, <100MB memory
**Constraints**: <500ms API p95, WCAG 2.1 AA accessibility, 10 concurrent sessions minimum, mobile-first responsive design
**Scale/Scope**: MVP for 10 concurrent games (40 players), Supabase free tier (500MB database, 2GB bandwidth), Vercel free tier

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Code Quality (Principle I)

- ✅ **Self-Documenting Code**: TypeScript with strict typing enforces clear naming; React component names describe UI purpose
- ✅ **Single Responsibility**: React components follow single-purpose pattern; game logic separated into hooks/utilities
- ✅ **DRY Principle**: Shared game logic (move validation, board state) extracted into reusable modules
- ✅ **Error Handling**: Supabase client errors caught explicitly; user-facing errors shown with actionable messages
- ✅ **Type Safety**: TypeScript strict mode enabled; Supabase types auto-generated from database schema

**Status**: PASS - TypeScript + React architecture naturally enforces code quality principles

### User Experience Consistency (Principle II)

- ✅ **Design System**: Tailwind CSS + shadcn/ui components provide consistent design tokens
- ✅ **Interaction Patterns**: Standard UI patterns for forms, buttons, modals across all features
- ✅ **Response Time Feedback**: Loading states for Supabase queries >200ms; optimistic UI updates
- ✅ **Error Messages**: User-friendly error boundaries; network errors explained in plain language
- ✅ **Accessibility**: shadcn/ui components are WCAG 2.1 AA compliant; keyboard navigation built-in

**Status**: PASS - Component library + Tailwind ensures consistent UX

### Performance Requirements (Principle III)

- ✅ **Page Load**: Next.js 15 with App Router + automatic code splitting achieves <2s load
- ✅ **Time to Interactive**: Server Components reduce JS bundle; React 19 concurrent features improve TTI
- ✅ **API Response Time**: Supabase hosted database + connection pooling achieves <500ms p95
- ✅ **Memory Footprint**: Lightweight game state (< 10KB per game) stays under 100MB budget
- ✅ **Rendering Performance**: Framer Motion for 60fps animations; React.memo for marble components

**Status**: PASS - Next.js + Supabase architecture meets all performance benchmarks

### Complexity Tracking

No constitutional violations. All requirements can be met with standard architecture patterns.

## Phase 0: Research & Design (COMPLETED)

### Research Artifacts

All technology choices documented in **[research.md](./research.md)**:
- ✅ **Frontend Framework**: Next.js 15 with React 19 (Server Components, App Router)
- ✅ **Styling**: Tailwind CSS 3.4+ with shadcn/ui (accessibility, consistency)
- ✅ **Backend**: Supabase (PostgreSQL + Auth + Realtime in one service)
- ✅ **Real-Time**: Supabase Realtime (WebSocket, <200ms sync)
- ✅ **Authentication**: Supabase Auth (guest mode + OAuth)
- ✅ **Animations**: Framer Motion (60fps marble movements)
- ✅ **Testing**: Vitest + Playwright + React Testing Library
- ✅ **Deployment**: Vercel (zero-config Next.js deployment)

**Decision Rationale**: All choices optimize for:
1. Constitutional performance requirements (<2s load, <200ms sync, 60fps)
2. Free hosting (Vercel + Supabase free tiers)
3. Open-source requirement (all MIT/Apache 2.0 licensed)
4. Developer productivity (integrated solutions, auto-generated types)

### Data Model

Complete database schema documented in **[data-model.md](./data-model.md)**:
- ✅ **4 Core Tables**: `game_sessions`, `players`, `marbles`, `move_history`
- ✅ **9 Indexes**: Optimized for game lookups, position detection, session cleanup
- ✅ **6 RLS Policies**: Database-level authorization prevents cheating
- ✅ **3 Database Functions**: Turn timeout check, bot move generation, update triggers
- ✅ **Realtime Channels**: Lobby updates, game state sync, presence tracking
- ✅ **Auto-Generated Types**: TypeScript types from schema for type safety

**Key Design Decisions**:
- UUIDs for primary keys (security)
- Cascade deletes (automatic cleanup)
- Generated columns for auto_delete_at (24-hour session cleanup)
- Check constraints for data integrity (status enums, dice 1-6)

### API Contracts

Complete contract specifications in **[contracts/](./contracts/)**:

**RPC Functions** ([rpc-functions.md](./contracts/rpc-functions.md)):
- ✅ **Game Management**: `create_game_session`, `join_game_session`, `add_bot_player`
- ✅ **Turn Execution**: `roll_dice`, `move_marble`, `pass_turn`, `execute_bot_turn`
- ✅ **Utilities**: `get_game_state`, `update_player_presence`

**Realtime Channels** ([realtime-channels.md](./contracts/realtime-channels.md)):
- ✅ **Lobby Channel**: Player join events, game start detection
- ✅ **Game Channel**: Marble moves, turn changes, dice rolls, presence tracking
- ✅ **Broadcast Events**: Low-latency dice rolls (~50ms), turn warnings

### Developer Quickstart

Complete setup guide in **[quickstart.md](./quickstart.md)**:
- ✅ **Prerequisites**: Node.js, Supabase CLI, Docker
- ✅ **8-Step Setup**: Clone → Install → Supabase → Env vars → Migrations → Types → Dev server → Verify
- ✅ **Common Issues**: Port conflicts, Docker setup, environment variables
- ✅ **Deployment**: Vercel + Supabase production setup
- ✅ **Development Workflow**: Commands, testing, linting

## Phase 1: Constitution Re-Check (POST-DESIGN)

### Code Quality (Principle I) - PASS

- ✅ **Type Safety**: Auto-generated Supabase types ensure end-to-end type safety
- ✅ **Self-Documenting**: RPC function names describe intent (`roll_dice`, `move_marble`)
- ✅ **Single Responsibility**: Each RPC function performs one atomic game action
- ✅ **DRY Principle**: Game logic centralized in PostgreSQL functions (single source of truth)
- ✅ **Error Handling**: RPC functions use explicit exceptions (`INVALID_MOVE`, `NOT_YOUR_TURN`)

**Validation**: TypeScript strict mode + auto-generated types from schema enforces this at compile time.

### User Experience Consistency (Principle II) - PASS

- ✅ **Design System**: shadcn/ui components provide consistent buttons, cards, inputs
- ✅ **Interaction Patterns**: Standard lobby → game flow matches user expectations
- ✅ **Response Feedback**: Broadcast events provide <100ms dice roll feedback (faster than DB sync)
- ✅ **Error Messages**: User-friendly exceptions (e.g., "Game is full" vs SQL error codes)
- ✅ **Accessibility**: shadcn/ui is WCAG 2.1 AA compliant; 44px touch targets for marbles

**Validation**: Component library + Tailwind responsive utilities ensure consistency.

### Performance Requirements (Principle III) - PASS

- ✅ **Page Load <2s**: Next.js Server Components reduce initial JS bundle; Vercel edge CDN
- ✅ **API Response <500ms**: Supabase connection pooling + indexed queries achieve this
- ✅ **Real-Time Sync <200ms**: Supabase Realtime WebSocket measured at ~50-150ms latency
- ✅ **60fps Animations**: Framer Motion uses GPU-accelerated CSS transforms
- ✅ **Memory <100MB**: Lightweight game state (~10KB/game × 10 concurrent = 100KB data)

**Validation**: Architecture choices (Server Components, indexed DB queries, WebSocket sync) meet all targets.

### Final Gate: APPROVED ✅

All constitutional principles satisfied. Proceed to implementation.

## Project Structure

### Documentation (this feature)

```text
specs/001-aggravation-game/
├── plan.md              # This file (implementation plan)
├── research.md          # ✅ Technology research and decisions
├── data-model.md        # ✅ Database schema and entity relationships
├── quickstart.md        # ✅ Developer setup and run instructions
├── contracts/           # ✅ API contracts
│   ├── README.md        #    Contract overview and testing strategy
│   ├── rpc-functions.md #    Supabase RPC function signatures and SQL
│   └── realtime-channels.md # Realtime channel subscriptions and payloads
└── tasks.md             # 🔄 Implementation task breakdown (NEXT STEP)
```

### Source Code (repository root)

```text
# Next.js 15 App Router structure
/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Landing page (create/join game)
│   ├── game/
│   │   └── [id]/
│   │       ├── page.tsx          # Game lobby and active game
│   │       └── loading.tsx       # Loading state
│   ├── api/                      # API routes (if needed beyond Supabase)
│   │   └── auth/
│   │       └── [...nextauth]/route.ts  # NextAuth integration
│   └── globals.css               # Global Tailwind CSS
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components (Button, Card, etc.)
│   ├── game/
│   │   ├── Board.tsx             # Game board SVG with marbles
│   │   ├── Marble.tsx            # Individual marble component
│   │   ├── Dice.tsx              # Animated dice roller
│   │   ├── TurnIndicator.tsx    # Current player turn display
│   │   ├── TurnTimer.tsx        # 60-second countdown timer
│   │   ├── MoveHistory.tsx      # Recent moves log
│   │   └── VictoryScreen.tsx    # Winner celebration
│   ├── lobby/
│   │   ├── PlayerList.tsx        # Connected players display
│   │   ├── ShareLink.tsx         # Shareable game URL
│   │   └── AddBotButton.tsx     # Add bot player control
│   └── auth/
│       ├── GuestNamePrompt.tsx   # Guest name input
│       └── SignInButton.tsx      # Optional sign-in
│
├── lib/                          # Utility libraries
│   ├── supabase/
│   │   ├── client.ts             # Supabase client (browser)
│   │   ├── server.ts             # Supabase client (server)
│   │   ├── database.types.ts     # Auto-generated TypeScript types
│   │   └── realtime.ts           # Realtime channel helpers
│   ├── game/
│   │   ├── rules.ts              # Aggravation game rules logic
│   │   ├── moves.ts              # Valid move calculation
│   │   ├── bot.ts                # Bot AI (random move selection)
│   │   └── board.ts              # Board position calculations
│   └── utils/
│       ├── cn.ts                 # Tailwind class name utility
│       └── errors.ts             # Error handling utilities
│
├── hooks/                        # React hooks
│   ├── useGameState.ts           # Game state management
│   ├── useRealtimeSync.ts        # Supabase Realtime subscription
│   ├── useAuth.ts                # Authentication state
│   └── useTurnTimer.ts           # Turn countdown timer
│
├── types/                        # TypeScript type definitions
│   ├── game.ts                   # Game, Player, Marble types
│   ├── supabase.ts               # Extended Supabase types
│   └── api.ts                    # API response types
│
├── supabase/                     # Supabase configuration
│   ├── migrations/               # Database migration files
│   │   └── 001_initial_schema.sql
│   ├── functions/                # Edge Functions (if needed)
│   └── config.toml               # Supabase CLI config
│
├── tests/                        # Test files
│   ├── unit/
│   │   ├── game/
│   │   │   ├── rules.test.ts
│   │   │   ├── moves.test.ts
│   │   │   └── bot.test.ts
│   │   └── components/
│   │       └── Board.test.tsx
│   ├── integration/
│   │   ├── game-flow.test.ts     # Complete game playthrough
│   │   └── realtime-sync.test.ts # Multi-client sync
│   └── e2e/
│       ├── create-join-game.spec.ts
│       └── play-game.spec.ts
│
├── public/                       # Static assets
│   ├── images/
│   └── sounds/                   # Optional sound effects
│
├── .env.local.example            # Environment variables template
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Vitest configuration
├── playwright.config.ts          # Playwright configuration
├── package.json                  # Dependencies
└── README.md                     # Project documentation
```

**Structure Decision**: Web application using Next.js 15 App Router. All backend logic handled by Supabase (database, auth, realtime). No separate backend server needed - Next.js Server Components + Supabase RPC functions provide server-side logic. Mobile responsiveness achieved through Tailwind CSS responsive utilities.

---

## Summary & Next Steps

### Planning Phase Complete ✅

This implementation plan has completed Phase 0 (Research) and Phase 1 (Design):

**Artifacts Created**:
1. ✅ **[research.md](./research.md)** - Complete technology stack research and decision rationale
2. ✅ **[data-model.md](./data-model.md)** - PostgreSQL schema with 4 tables, 9 indexes, 6 RLS policies, 3 functions
3. ✅ **[contracts/](./contracts/)** - API contracts (10 RPC functions, 3 Realtime channels)
4. ✅ **[quickstart.md](./quickstart.md)** - Developer setup guide (8 steps to running locally)
5. ✅ **Agent Context Updated** - GitHub Copilot instructions updated with Next.js/React/Supabase/TypeScript stack

**Constitutional Validation**: All 3 principles PASS (Code Quality, UX Consistency, Performance Requirements)

### Ready for Implementation

**Next Command**: Generate tasks.md with implementation breakdown:
```bash
# From repository root
/speckit.tasks
```

This will create `/specs/001-aggravation-game/tasks.md` with:
- Setup phase (Next.js project, Supabase initialization)
- Foundation phase (database schema, RPC functions, type generation)
- User Story phases (P1: Core Gameplay → P6: Bot Players)
- Each task with acceptance criteria and estimated complexity

**Implementation Approach**:
- **Phase 2**: Setup (Next.js + Supabase + Tailwind + shadcn/ui)
- **Phase 3**: Foundation (Database migrations, RPC functions, types)
- **Phase 4**: User Story P1 (Core game mechanics - MVP)
- **Phase 5**: User Story P2-P6 (Lobby, realtime, mobile, auth, bots)
- **Phase 6**: Testing & Deployment

**Technology Stack Summary**:
- Frontend: Next.js 15, React 19, TypeScript 5.3+, Tailwind CSS 3.4+, shadcn/ui, Framer Motion
- Backend: Supabase (PostgreSQL, Auth, Realtime)
- Testing: Vitest, Playwright, React Testing Library
- Deployment: Vercel (frontend), Supabase (backend)
- All open-source, all free tier compatible

**Performance Targets**:
- Page load: <2s ✓ (Next.js Server Components + Vercel CDN)
- Real-time sync: <200ms ✓ (Supabase Realtime WebSocket)
- Animations: 60fps ✓ (Framer Motion GPU acceleration)
- API response: <500ms ✓ (Indexed PostgreSQL queries)

**Branch**: `001-aggravation-game` (current)  
**Spec**: [spec.md](./spec.md) (41 functional requirements, 6 user stories)  
**Plan**: [plan.md](./plan.md) (this file)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations identified. All requirements can be implemented using standard patterns within the Next.js + Supabase architecture. No complexity exceptions needed.
