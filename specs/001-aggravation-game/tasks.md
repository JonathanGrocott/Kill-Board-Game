# Tasks: Multiplayer Aggravation Board Game

**Input**: Design documents from `/specs/001-aggravation-game/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: NOT REQUESTED - No test tasks included per spec assumptions

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

---

## Phase 1: Project Setup

**Purpose**: Initialize Next.js 15 project with TypeScript, Tailwind CSS, and Supabase

- [X] T001 Initialize Next.js 15 project with TypeScript in repository root via `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir`
- [X] T002 Install core dependencies: `npm install @supabase/supabase-js@latest @supabase/ssr framer-motion zustand`
- [X] T003 [P] Install development dependencies: `npm install -D @types/node vitest @vitest/ui @playwright/test`
- [X] T004 [P] Configure TypeScript strict mode in tsconfig.json with paths for lib/, components/, hooks/, types/
- [X] T005 [P] Initialize Supabase CLI project via `npx supabase init` to create supabase/ directory
- [X] T006 [P] Setup Tailwind CSS config in tailwind.config.ts with custom theme colors for 4-player game (red, blue, green, yellow)
- [X] T007 Create .env.local.example template with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY placeholders
- [X] T008 Setup shadcn/ui via `npx shadcn-ui@latest init` and configure components.json for Tailwind integration
- [X] T009 [P] Create project directory structure: app/, components/, lib/, hooks/, types/, supabase/, tests/ per plan.md
- [X] T010 [P] Setup ESLint and Prettier configs in .eslintrc.json and .prettierrc with Next.js and TypeScript rules

**Checkpoint**: Basic Next.js project initialized with TypeScript, Tailwind, Supabase CLI, and folder structure

---

## Phase 2: Foundation (Database & Auth)

**Purpose**: Core database schema, RPC functions, authentication, and type safety infrastructure

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 Create database migration 001_initial_schema.sql in supabase/migrations/ with game_sessions, players, marbles, move_history tables per data-model.md
- [X] T012 Add database indexes to migration: idx_game_sessions_auto_delete, idx_game_sessions_status, idx_players_game_session, idx_players_user_id, idx_marbles_position per data-model.md
- [X] T013 Add Row Level Security policies to migration: game_sessions (view, create, update), players (view), marbles (view, update) per data-model.md
- [X] T014 Create update_updated_at_column() trigger function in migration for game_sessions.updated_at per data-model.md
- [X] T015 Create check_turn_timeout() function in supabase/migrations/002_turn_functions.sql for 60-second turn timer validation per data-model.md
- [X] T016 Create generate_bot_move() function in supabase/migrations/002_turn_functions.sql for random valid marble selection per data-model.md
- [X] T017 Create create_game_session() RPC function in supabase/migrations/003_rpc_game_management.sql per contracts/rpc-functions.md
- [X] T018 [P] Create join_game_session() RPC function in supabase/migrations/003_rpc_game_management.sql per contracts/rpc-functions.md
- [X] T019 [P] Create add_bot_player() RPC function in supabase/migrations/003_rpc_game_management.sql per contracts/rpc-functions.md
- [X] T020 Create roll_dice() RPC function in supabase/migrations/004_rpc_turn_execution.sql per contracts/rpc-functions.md
- [X] T021 Create move_marble() RPC function in supabase/migrations/004_rpc_turn_execution.sql with position calculation and collision detection per contracts/rpc-functions.md
- [X] T022 [P] Create pass_turn() RPC function in supabase/migrations/004_rpc_turn_execution.sql per contracts/rpc-functions.md
- [X] T023 [P] Create execute_bot_turn() RPC function in supabase/migrations/004_rpc_turn_execution.sql per contracts/rpc-functions.md
- [X] T024 [P] Create get_game_state() RPC function in supabase/migrations/005_rpc_utilities.sql per contracts/rpc-functions.md
- [X] T025 [P] Create update_player_presence() RPC function in supabase/migrations/005_rpc_utilities.sql per contracts/rpc-functions.md
- [X] T026 Apply migrations locally via `npx supabase db reset` to create schema
- [X] T027 Generate TypeScript types from Supabase schema via `npx supabase gen types typescript --local > lib/supabase/database.types.ts`
- [X] T028 Create Supabase client (browser) in lib/supabase/client.ts with createBrowserClient from @supabase/ssr per quickstart.md
- [X] T029 [P] Create Supabase client (server) in lib/supabase/server.ts with createServerClient from @supabase/ssr per quickstart.md
- [X] T030 [P] Setup Supabase Auth guest mode helpers in lib/auth/guest.ts for anonymous sign-in with display_name metadata per research.md
- [X] T031 Create base TypeScript types in types/game.ts: Game, Player, Marble, GameStatus, PlayerColor, PositionType enums per data-model.md
- [X] T032 [P] Create error handling utilities in lib/utils/errors.ts for user-friendly Supabase error messages per plan.md

**Checkpoint**: Database schema complete, RPC functions deployed, TypeScript types generated, Supabase clients configured

---

## Phase 3: User Story 1 - Play Complete Game (Priority: P1) 🎯 MVP

**Goal**: Implement core Aggravation gameplay - 4 players can roll dice, move marbles, send opponents to base, use shortcuts, win by getting all marbles home

**Independent Test**: 4 users join a game, complete a full playthrough following Aggravation rules (dice roll, marble movement, captures, shortcuts, home zone), and declare a winner when one player gets all 4 marbles home

### Game Logic & Rules

- [X] T033 [P] [US1] Implement board position calculations in lib/game/board.ts: main track (0-67), shortcut entry/exit, home zone coordinates per data-model.md
- [X] T034 [P] [US1] Implement move validation logic in lib/game/moves.ts: valid marble selection based on dice roll, base exit (1 or 6), exact home entry per spec.md FR-002
- [X] T035 [US1] Implement game rules engine in lib/game/rules.ts: turn order, capture logic (send to base), shortcut eligibility (after 1 lap), win condition (4 marbles home) per spec.md FR-001
- [X] T036 [US1] Create position calculation helper in lib/game/board.ts: calculate new position given current position + dice roll, handle track wraparound and shortcut transitions per data-model.md

### Core UI Components

- [X] T037 [P] [US1] Install shadcn/ui Button component via `npx shadcn-ui@latest add button` and customize for game actions in components/ui/button.tsx
- [X] T038 [P] [US1] Install shadcn/ui Card component via `npx shadcn-ui@latest add card` for player cards and game board container in components/ui/card.tsx
- [X] T039 [US1] Create Board component in components/game/Board.tsx: SVG game board with 68 track spaces, 4 home zones, 4 starting bases, shortcuts per spec.md FR-024
- [X] T040 [US1] Create Marble component in components/game/Marble.tsx: individual marble SVG with Framer Motion position animations, player color styling per spec.md FR-026
- [X] T041 [US1] Create Dice component in components/game/Dice.tsx: animated dice roll display (1-6), onClick handler to trigger roll_dice RPC per spec.md FR-025
- [X] T042 [P] [US1] Create TurnIndicator component in components/game/TurnIndicator.tsx: shows current player name and color, "Your Turn" highlight per spec.md FR-028
- [X] T043 [P] [US1] Create TurnTimer component in components/game/TurnTimer.tsx: 60-second countdown, 10-second warning animation per spec.md FR-030

### Game State Management

- [X] T044 [US1] Create useGameState hook in hooks/useGameState.ts: manages local game state (selected marble, highlighted spaces), calls Supabase RPC functions per plan.md
- [X] T045 [US1] Create useRealtimeSync hook in hooks/useRealtimeSync.ts: subscribes to game:{gameId} channel for marble moves, turn changes, dice rolls per contracts/realtime-channels.md
- [X] T046 [US1] Implement Realtime channel setup in lib/supabase/realtime.ts: helper functions for lobby, game, and turn channels per contracts/realtime-channels.md

### Game Page Implementation

- [X] T047 [US1] Create game play page in app/game/[id]/play/page.tsx: renders Board, Dice, TurnIndicator, TurnTimer, subscribes to Realtime, handles user interactions per plan.md
- [X] T048 [US1] Implement dice roll handler in app/game/[id]/play/page.tsx: calls roll_dice RPC, broadcasts dice_rolled event, updates UI with valid marbles per contracts/rpc-functions.md
- [X] T049 [US1] Implement marble selection handler in app/game/[id]/play/page.tsx: highlights selected marble, shows valid destination spaces, calls move_marble RPC per spec.md FR-027
- [X] T050 [US1] Implement marble move animation in components/game/Marble.tsx: Framer Motion layout animation from old position to new position, 500ms duration per research.md
- [X] T051 [US1] Implement capture animation in components/game/Board.tsx: show captured marble returning to base with bounce effect per spec.md acceptance scenario 1.4
- [X] T052 [US1] Create VictoryScreen component in components/game/VictoryScreen.tsx: displays winner name/color, confetti animation, "New Game" button per spec.md FR-032
- [X] T053 [US1] Implement win condition detection in app/game/[id]/play/page.tsx: listen for game.status = 'completed', show VictoryScreen modal per spec.md FR-005

### Game Flow Integration

- [X] T054 [US1] Implement turn progression logic in app/game/[id]/play/page.tsx: listen for current_turn_player_id changes, enable/disable controls per spec.md FR-003
- [X] T055 [US1] Implement turn timeout handler in hooks/useTurnTimer.ts: call pass_turn RPC when 60 seconds expire, show warning at 50 seconds per spec.md FR-004
- [X] T056 [US1] Add move history display in components/game/MoveHistory.tsx: scrollable log of recent moves, captures, dice rolls per spec.md FR-031
- [X] T057 [US1] Implement shortcut logic in lib/game/rules.ts: detect when marble completes 1 lap, allow shortcut entry on next move per spec.md FR-006

**Checkpoint**: At this point, User Story 1 should be fully functional - 4 players can play a complete game from start to win

---

## Phase 4: User Story 2 - Quick Game Creation & Joining (Priority: P2)

**Goal**: Enable users to create games with shareable links and join via links without accounts

**Independent Test**: One user creates a game, copies the shareable link, sends it to 3 friends, they join, game auto-starts when 4 players present

### Lobby Components

- [ ] T058 [P] [US2] Install shadcn/ui Input component via `npx shadcn-ui@latest add input` for display name entry in components/ui/input.tsx
- [ ] T059 [P] [US2] Create GuestNamePrompt component in components/auth/GuestNamePrompt.tsx: modal asking for display name (2-20 chars), validates input per spec.md FR-019
- [ ] T060 [US2] Create PlayerList component in components/lobby/PlayerList.tsx: displays all joined players with names, colors, "Bot" badge per spec.md FR-015
- [ ] T061 [US2] Create ShareLink component in components/lobby/ShareLink.tsx: copy game URL to clipboard, show "Copied!" feedback per spec.md FR-012

### Home Page

- [ ] T062 [US2] Create home page in app/page.tsx: "Create Game" and "Join Game" buttons, hero text explaining Aggravation per spec.md SC-007
- [ ] T063 [US2] Implement create game handler in app/page.tsx: prompt for display name, call create_game_session RPC, redirect to /game/[id] per spec.md acceptance scenario 2.1
- [ ] T064 [US2] Implement join game flow in app/page.tsx: prompt for game ID or parse from URL param, prompt for display name, call join_game_session RPC per spec.md acceptance scenario 2.2

### Lobby Page

- [X] T065 [US2] Create game lobby page in app/game/[id]/page.tsx: shows PlayerList, ShareLink, "Start Game" button (host only), waits for 4 players per spec.md
- [X] T066 [US2] Subscribe to lobby:{gameId} Realtime channel in app/game/[id]/page.tsx: listen for player JOIN events, update PlayerList live per contracts/realtime-channels.md
- [X] T067 [US2] Implement auto-start logic in app/game/[id]/page.tsx: detect when game.status changes to 'active', navigate to /game/[id]/play per spec.md acceptance scenario 2.4
- [X] T068 [US2] Show "Game Full" message in app/game/[id]/page.tsx: when trying to join and player_count = num_players per spec.md acceptance scenario 2.5
- [X] T069 [US2] Implement shareable link generation in app/game/[id]/page.tsx: use window.location.href, show copy button per spec.md FR-012

### Guest Authentication

- [X] T070 [US2] Implement guest sign-in in lib/auth/guest.ts: call supabase.auth.signInAnonymously with display_name in metadata per research.md
- [X] T071 [US2] Create useAuth hook in hooks/useAuth.ts: manages auth state, provides signInAsGuest and signOut functions per plan.md
- [X] T072 [US2] Add auth state check to app/page.tsx: if not authenticated, show GuestNamePrompt before allowing game creation/join per spec.md FR-019

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can create/join games quickly and play

---

## Phase 5: User Story 3 - Real-Time Multiplayer Experience (Priority: P3)

**Goal**: All players see game state changes instantly (<200ms) - dice rolls, marble movements, turn changes, game events synchronized

**Independent Test**: 4 players on different devices make moves simultaneously, verify all see updates within 200ms, disconnected players handled gracefully

### Real-Time Synchronization

- [X] T073 [US3] Optimize Realtime subscriptions in hooks/useRealtimeSync.ts: batch marble updates, debounce presence updates to 10s per contracts/realtime-channels.md performance section
- [X] T074 [US3] Implement dice roll broadcast in app/game/[id]/play/page.tsx: send dice_rolled event via broadcast channel for <100ms latency per contracts/realtime-channels.md
- [X] T075 [US3] Implement marble move broadcast in app/game/[id]/play/page.tsx: send marble_moved event with animation data per contracts/realtime-channels.md
- [X] T076 [US3] Add Realtime connection indicator in components/game/ConnectionStatus.tsx: show "Connected", "Reconnecting...", "Disconnected" states per plan.md

### Presence & Disconnection Handling

- [X] T077 [US3] Implement presence tracking in hooks/useRealtimeSync.ts: track player online status via presence channel, update is_connected in database per contracts/realtime-channels.md
- [X] T078 [US3] Create presence heartbeat in hooks/useRealtimeSync.ts: call update_player_presence RPC every 10 seconds per contracts/rpc-functions.md
- [X] T079 [US3] Add disconnection indicator in components/lobby/PlayerList.tsx: show red dot or "Disconnected" text for is_connected = false players per spec.md FR-010
- [ ] T080 [US3] Implement auto-skip on disconnect in backend via scheduled job or Edge Function: check last_seen_at, call pass_turn after 30s per spec.md FR-009 **[Requires Supabase Edge Function - deferred]**
- [X] T081 [US3] Implement reconnection flow in hooks/useRealtimeSync.ts: call get_game_state RPC on reconnect to sync missed updates per spec.md acceptance scenario 3.5

### Synchronization Quality

- [X] T082 [US3] Add latency monitoring in lib/utils/monitoring.ts: log time between RPC call and Realtime event receipt, target <200ms per spec.md SC-003
- [ ] T083 [US3] Implement optimistic UI updates in app/game/[id]/play/page.tsx: show local player's move immediately, rollback if RPC fails per research.md state management **[Enhancement - deferred]**
- [ ] T084 [US3] Add conflict resolution in hooks/useRealtimeSync.ts: server state wins, show error toast if optimistic update rejected per spec.md FR-011 **[Enhancement - deferred]**

**Checkpoint**: All user stories should now have real-time sync - players see each other's actions instantly

---

## Phase 6: User Story 4 - Mobile-Friendly Touch Experience (Priority: P4)

**Goal**: Players on mobile phones can tap to roll dice, tap marbles to select them, tap destination spaces to move - interface adapts to small screens

**Independent Test**: Play a complete game on iPhone and Android using only touch gestures, verify all controls accessible and board fully visible

### Mobile Responsiveness

- [X] T085 [P] [US4] Add responsive breakpoints to tailwind.config.ts: mobile-first design, tablet (768px), desktop (1024px) per research.md
- [X] T086 [US4] Make Board component responsive in components/game/Board.tsx: scale SVG viewBox to fit screen width, maintain aspect ratio per spec.md FR-034
- [X] T087 [US4] Implement touch-friendly marble selection in components/game/Marble.tsx: minimum 44x44px touch target, visual feedback on tap per spec.md FR-035
- [X] T088 [US4] Optimize Dice component for mobile in components/game/Dice.tsx: larger touch target, prevent double-tap zoom per spec.md FR-033

### Layout Adaptations

- [X] T089 [US4] Create mobile layout in app/game/[id]/play/page.tsx: board fills screen height, controls at bottom, landscape support per spec.md FR-036
- [X] T090 [US4] Add orientation detection in app/game/[id]/play/page.tsx: adjust board size for portrait vs landscape, CSS media queries per research.md
- [X] T091 [US4] Optimize PlayerList for mobile in components/lobby/PlayerList.tsx: horizontal scroll or compact vertical layout per spec.md FR-034
- [X] T092 [US4] Make VictoryScreen mobile-friendly in components/game/VictoryScreen.tsx: fullscreen modal, large text, easy-to-tap buttons per spec.md

### Touch Interactions

- [X] T093 [US4] Add touch gesture support in components/game/Board.tsx: tap marble to select, tap space to move, Framer Motion drag gestures per research.md Framer Motion
- [X] T094 [US4] Prevent mobile browser zoom in app/globals.css: add viewport meta tag with user-scalable=no, maximum-scale=1 per spec.md FR-033
- [ ] T095 [US4] Test on mobile devices: verify no horizontal scrolling, all elements accessible, 60fps animations maintained per spec.md SC-006

**Checkpoint**: Game should be fully playable on mobile with touch-only input

---

## Phase 7: User Story 5 - Guest Authentication (Priority: P5)

**Goal**: Users can enter display name to play without account, optional sign-in for persistent identity

**Independent Test**: Join a game as guest with only a name, play successfully, then optionally sign in via Supabase Auth to claim same identity in future games

### Guest Flow

- [X] T096 [US5] Enhance GuestNamePrompt in components/auth/GuestNamePrompt.tsx: show "Play as Guest" vs "Sign In" options per spec.md FR-021
- [X] T097 [US5] Store guest display name in Supabase Auth metadata via lib/auth/guest.ts: options.data.display_name per research.md authentication section
- [X] T098 [US5] Retrieve guest name from auth.users metadata in useAuth hook hooks/useAuth.ts: display in UI without database query per spec.md FR-020

### Optional Sign-In

- [X] T099 [P] [US5] Install shadcn/ui Dialog component via `npx shadcn-ui@latest add dialog` for sign-in modal in components/ui/dialog.tsx
- [X] T100 [US5] Create SignInButton component in components/auth/SignInButton.tsx: shows "Sign In" button if guest, opens sign-in dialog per spec.md FR-021
- [X] T101 [US5] Implement email/password auth in lib/auth/email.ts: supabase.auth.signUp and signInWithPassword per research.md
- [X] T102 [P] [US5] Implement Google OAuth in lib/auth/oauth.ts: supabase.auth.signInWithOAuth({ provider: 'google' }) per research.md
- [X] T103 [P] [US5] Implement GitHub OAuth in lib/auth/oauth.ts: supabase.auth.signInWithOAuth({ provider: 'github' }) per research.md

### Guest-to-User Migration

- [X] T104 [US5] Implement upgrade flow in lib/auth/guest.ts: preserve display_name when guest signs in, update user_id in players table per spec.md FR-023
- [X] T105 [US5] Add session persistence in hooks/useAuth.ts: auto-login on return visit if signed in, maintain guest state across page reloads per spec.md FR-022

### Privacy Compliance

- [X] T106 [US5] Add data deletion on game cleanup: ensure guest data deleted when game_sessions auto-deleted after 24 hours per spec.md FR-020
- [X] T107 [US5] Display privacy notice in GuestNamePrompt: inform users guest data is minimal (name + session ID) and temporary per spec.md FR-020

**Checkpoint**: Users can play as guests or sign in, data privacy requirements met

---

## Phase 8: User Story 6 - Bot Players for Testing & Solo Play (Priority: P6)

**Goal**: Users can add bot players to fill empty slots, enabling solo play and automated testing. Bots make random valid moves automatically.

**Independent Test**: Create a game, add 1-3 bot players, start game, verify bots automatically take turns by rolling dice and making random valid moves until game completion

### Bot Player Management

- [X] T108 [US6] Create AddBotButton component in components/lobby/AddBotButton.tsx: "Add Bot" button in lobby, calls add_bot_player RPC per spec.md FR-016
- [X] T109 [US6] Update PlayerList component in components/lobby/PlayerList.tsx: show "Bot" badge for is_bot = true players, distinguish from humans per spec.md FR-029
- [X] T110 [US6] Add bot generation logic in RPC add_bot_player: set display_name = "Bot 1", "Bot 2", etc., increment based on existing bot count per spec.md acceptance scenario 6.1

### Bot AI Implementation

- [X] T111 [US6] Implement bot turn detection in app/game/[id]/play/page.tsx: when current_turn_player.is_bot = true, auto-trigger execute_bot_turn after 2s delay per spec.md acceptance scenario 6.2
- [X] T112 [US6] Verify generate_bot_move function in supabase/migrations/002_turn_functions.sql: randomly select valid marble, handle no valid moves case per data-model.md
- [X] T113 [US6] Verify execute_bot_turn RPC in supabase/migrations/004_rpc_turn_execution.sql: call roll_dice → generate_bot_move → move_marble sequence per contracts/rpc-functions.md

### Bot Behavior

- [X] T114 [US6] Add bot move delay in app/game/[id]/play/page.tsx: 2s before dice roll, 1s before marble move for natural feel per spec.md FR-008
- [X] T115 [US6] Implement bot pass turn in execute_bot_turn RPC: if generate_bot_move returns NULL (no valid moves), call pass_turn immediately per spec.md acceptance scenario 6.4
- [X] T116 [US6] Add bot visual feedback in components/game/Board.tsx: show "Bot is thinking..." indicator during bot turn delay per spec.md FR-029

### Solo Play Support

- [X] T117 [US6] Update lobby validation in app/game/[id]/page.tsx: allow game start with 1 human + 3 bots (total 4 players) per spec.md acceptance scenario 6.5
- [X] T118 [US6] Add solo play tutorial in app/page.tsx: "Practice with Bots" button that creates game and adds 3 bots automatically per spec.md user story 6 rationale

**Checkpoint**: Bot players fully functional - users can practice solo or test without coordinating multiple humans

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements affecting multiple user stories, deployment, and documentation

### Performance Optimization

- [X] T119 [P] Add React.memo to Marble component in components/game/Marble.tsx: prevent re-renders when position unchanged per research.md performance
- [ ] T120 [P] Optimize Board SVG rendering in components/game/Board.tsx: reduce DOM nodes, use CSS transforms for animations per spec.md SC-012
- [ ] T121 Implement code splitting in app/ pages: use Next.js dynamic imports for heavy components (Board, VictoryScreen) per research.md Next.js features
- [X] T122 Add loading states in app/game/[id]/loading.tsx: skeleton UI while game data loads per plan.md UX consistency

### Error Handling

- [X] T123 [P] Create error boundaries in app/error.tsx and app/game/[id]/error.tsx: catch React errors, show user-friendly messages per plan.md code quality
- [ ] T124 [P] Add user-facing error messages in lib/utils/errors.ts: map Supabase errors to actionable text (e.g., "Game is full" instead of "GAME_FULL") per spec.md FR-026
- [ ] T125 Implement retry logic in lib/supabase/client.ts: auto-retry failed RPC calls up to 3 times per plan.md performance requirements

### Accessibility

- [ ] T126 [P] Add ARIA labels to Board component in components/game/Board.tsx: screen reader announces current turn, marble positions per spec.md WCAG 2.1 AA
- [ ] T127 [P] Implement keyboard navigation in components/game/Board.tsx: arrow keys to select marble, Enter to move per plan.md accessibility
- [ ] T128 Add focus indicators to all interactive elements: visible outline on focus, complies with WCAG 2.1 AA contrast per research.md shadcn/ui

### Deployment

- [ ] T129 Create production Supabase project at supabase.com: note project URL and anon key per quickstart.md deployment section
- [ ] T130 Push database migrations to production via `npx supabase db push`: apply all migrations from supabase/migrations/ per quickstart.md
- [ ] T131 Configure Vercel project: connect GitHub repo, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables per quickstart.md
- [ ] T132 Deploy to Vercel via `vercel --prod`: verify deployment succeeds, test production URL per spec.md FR-038
- [ ] T133 Setup Supabase OAuth providers in dashboard: add Google and GitHub OAuth credentials, configure redirect URLs per research.md authentication

### Documentation

- [ ] T134 [P] Update README.md in repository root: add project description, setup instructions, deployment guide from quickstart.md
- [ ] T135 [P] Add code comments to complex functions: board position calculations, move validation, RPC functions per plan.md code quality
- [ ] T136 Verify quickstart.md accuracy: test all 8 setup steps on fresh clone, update any outdated commands per spec.md SC-011

### Final Validation

- [ ] T137 Run through complete game flow: create game → add bots → play to win → verify all user stories functional per spec.md success criteria
- [ ] T138 Test on multiple browsers: Chrome, Firefox, Safari, Edge - verify FR-040 compatibility per spec.md technical requirements
- [ ] T139 Test mobile devices: iOS Safari, Chrome Android - verify touch controls, responsive layout per spec.md FR-033
- [ ] T140 Performance check: measure page load (<2s), Realtime latency (<200ms), animation FPS (60fps) per spec.md SC-003, SC-004, SC-012

**Checkpoint**: Production-ready application deployed to Vercel, all user stories complete, performance targets met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundation (Phase 2) - Core gameplay MVP
- **User Story 2 (Phase 4)**: Depends on Foundation (Phase 2) - Can start after Foundation, integrates with US1
- **User Story 3 (Phase 5)**: Depends on US1 completion - Adds real-time to existing gameplay
- **User Story 4 (Phase 6)**: Depends on US1 completion - Adds mobile support to existing gameplay
- **User Story 5 (Phase 7)**: Depends on Foundation (Phase 2) - Can start after Foundation, parallel to US1-4
- **User Story 6 (Phase 8)**: Depends on US1 completion - Bots need gameplay to be functional first
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only - No other story dependencies
- **US2 (P2)**: Foundation only - No other story dependencies (creates entry point for US1)
- **US3 (P3)**: Requires US1 (needs gameplay to add real-time to)
- **US4 (P4)**: Requires US1 (needs gameplay to make mobile-friendly)
- **US5 (P5)**: Foundation only - Can be parallel to US1-4
- **US6 (P6)**: Requires US1 (bots need gameplay logic to execute)

### Recommended Execution Order

**MVP First (Fastest to playable game)**:
1. Phase 1: Setup
2. Phase 2: Foundation
3. Phase 3: User Story 1 (Core Gameplay) ← STOP HERE FOR MVP
4. Deploy and validate MVP
5. Phase 4: User Story 2 (Lobby/Entry)
6. Phase 5: User Story 3 (Real-time improvements)
7. Phase 6: User Story 4 (Mobile support)
8. Phase 7: User Story 5 (Auth)
9. Phase 8: User Story 6 (Bots)
10. Phase 9: Polish

**Parallel Team Strategy** (with 3+ developers):
- Phase 1-2: All together (Foundation)
- After Foundation:
  - Dev A: User Story 1 (Core Gameplay)
  - Dev B: User Story 2 (Lobby) + User Story 5 (Auth)
  - Dev C: User Story 6 (Bots - waits for US1 merge)
- After US1 complete:
  - Dev A: User Story 3 (Real-time)
  - Dev B: User Story 4 (Mobile)
  - Dev C: User Story 6 (Bots)
- Merge order: US1 → US2 → US5 → US3 → US4 → US6 → Polish

### Within Each User Story

- UI components can be built in parallel (marked with [P])
- Logic/utilities can be built in parallel (marked with [P])
- Integration tasks must wait for dependencies
- Always complete story before moving to next priority

### Parallel Opportunities

**Setup Phase**:
- T003, T004, T005, T006, T008, T009, T010 can all run in parallel

**Foundation Phase**:
- T018-T019 (RPC game management functions) parallel
- T022-T025 (RPC utilities) parallel
- T028-T032 (Client setup and utilities) parallel

**User Story 1**:
- T033-T034 (Game logic) parallel
- T037-T038 (shadcn components) parallel
- T042-T043 (TurnIndicator, TurnTimer) parallel

**User Story 2**:
- T058-T059 (UI components) parallel

**User Story 4**:
- T085 can start immediately (config change)

**User Story 5**:
- T099 (Dialog component) parallel with other tasks
- T102-T103 (OAuth providers) parallel

**User Story 6**:
- All bot tasks sequential (depend on gameplay being complete)

**Polish**:
- T119-T120, T123-T124, T126-T128, T134-T135 all parallel

---

## Parallel Example: Foundation Phase

```bash
# After T011-T016 complete, launch these in parallel:
Task T018: "Create join_game_session() RPC"
Task T019: "Create add_bot_player() RPC"
Task T022: "Create pass_turn() RPC"
Task T023: "Create execute_bot_turn() RPC"
Task T024: "Create get_game_state() RPC"
Task T025: "Create update_player_presence() RPC"

# After migrations applied, launch these in parallel:
Task T028: "Create Supabase client (browser)"
Task T029: "Create Supabase client (server)"
Task T030: "Setup guest auth helpers"
Task T031: "Create base TypeScript types"
Task T032: "Create error handling utilities"
```

---

## Implementation Strategy

### MVP First (Recommended)

**Goal**: Playable game in minimum time

1. Complete Phase 1: Setup (~2 hours)
2. Complete Phase 2: Foundation (~8 hours)
3. Complete Phase 3: User Story 1 Core Gameplay (~16 hours)
4. **STOP and VALIDATE**: Play a complete 4-player game
5. Deploy MVP to Vercel
6. Get user feedback before building more

**MVP Delivers**: FR-001 through FR-006 (core Aggravation rules), basic UI, 4-player gameplay

### Incremental Delivery (Recommended)

**Goal**: Ship value continuously

1. MVP (Setup + Foundation + US1) → Deploy → Test
2. Add US2 (Lobby + Quick Join) → Deploy → Test with real users
3. Add US5 (Guest Auth) → Deploy → Collect feedback
4. Add US3 (Real-time improvements) → Deploy → Measure latency
5. Add US4 (Mobile) → Deploy → Test on devices
6. Add US6 (Bots) → Deploy → Enable solo play
7. Polish → Final deploy

**Each increment adds value without breaking previous features**

### Feature Flag Strategy (Optional)

If deploying frequently:
- US3 (Real-time): Feature flag for broadcast events (fallback to polling)
- US4 (Mobile): Feature flag for mobile layout (fallback to desktop)
- US6 (Bots): Feature flag for bot players (allow testing with users first)

---

## Summary

**Total Tasks**: 140
- Setup: 10 tasks
- Foundation: 22 tasks (CRITICAL PATH)
- User Story 1 (Core Gameplay): 25 tasks (MVP)
- User Story 2 (Lobby): 15 tasks
- User Story 3 (Real-time): 12 tasks
- User Story 4 (Mobile): 11 tasks
- User Story 5 (Auth): 12 tasks
- User Story 6 (Bots): 11 tasks
- Polish: 22 tasks

**Parallel Opportunities**: 35 tasks marked [P] can run in parallel within their phase

**Estimated Timeline** (single developer):
- Setup: 2 hours
- Foundation: 8 hours
- US1 (MVP): 16 hours
- US2: 8 hours
- US3: 6 hours
- US4: 6 hours
- US5: 6 hours
- US6: 6 hours
- Polish: 10 hours
- **Total**: ~68 hours (~9 working days)

**MVP Timeline** (Setup + Foundation + US1): ~26 hours (~3.5 working days)

**Technology Stack**:
- Frontend: Next.js 15, React 19, TypeScript 5.3+, Tailwind CSS 3.4+, shadcn/ui, Framer Motion
- Backend: Supabase (PostgreSQL, Auth, Realtime)
- Deployment: Vercel
- All open-source, all free tier

**Performance Targets**:
- Page load: <2s ✓ (T132 validation)
- Real-time sync: <200ms ✓ (T082 monitoring)
- Animations: 60fps ✓ (T140 validation)
- API response: <500ms ✓ (indexed queries in Foundation)

**Next Action**: Start with T001 (Initialize Next.js project)
