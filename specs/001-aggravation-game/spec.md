# Feature Specification: Multiplayer Aggravation Board Game

**Feature Branch**: `001-aggravation-game`  
**Created**: 2025-11-26  
**Status**: Draft  
**Input**: User description: "Fast, simple, multiplayer online version of the classic Aggravation marble-and-dice board game. The experience should work in any modern browser and on mobile phones with no installation. The codebase must use only open-source technologies, deploy easily to Vercel, and use Supabase for database, auth, and real-time multiplayer. The game should look modern and setup for 4 players."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play Complete Game (Priority: P1)

Four players join a game lobby, take turns rolling dice and moving marbles around the board according to Aggravation rules, and play until one player gets all their marbles home to win.

**Why this priority**: This is the core game experience - without this, there is no product. It delivers the complete value proposition of playing Aggravation online with friends.

**Independent Test**: Can be fully tested by having 4 users join a game, complete a full playthrough following official Aggravation rules (dice roll, marble movement, sending opponents back to start, shortcuts, home zone), and declaring a winner when one player gets all marbles home.

**Acceptance Scenarios**:

1. **Given** 4 players have joined a game lobby, **When** the game starts, **Then** each player sees their colored marbles in starting positions, the board is displayed correctly, and the first player can roll the dice
2. **Given** it's a player's turn, **When** they roll the dice, **Then** the dice shows a random number 1-6, and they can select which of their marbles to move (if valid moves exist)
3. **Given** a player selects a marble to move, **When** they move it the rolled number of spaces, **Then** the marble animates to the new position and updates in real-time for all players
4. **Given** a player's marble lands on an opponent's marble, **When** the move completes, **Then** the opponent's marble returns to their start zone (gets "aggravated") and all players see this happen
5. **Given** a player rolls exactly the number needed to enter home, **When** they move the marble home, **Then** the marble moves to the home zone and is counted toward their victory condition
6. **Given** a player gets all 4 marbles into home zone, **When** the last marble enters, **Then** the game ends, that player is declared winner, and all players see the victory screen

---

### User Story 2 - Quick Game Creation & Joining (Priority: P2)

A user creates a new game with a shareable link, friends join via that link without accounts, and the game starts when enough players have joined.

**Why this priority**: Reduces friction to play - users shouldn't need to create accounts, navigate complex menus, or coordinate outside the app. This enables the "fast and simple" requirement.

**Independent Test**: Can be tested by one user creating a game, copying the shareable link, sending it to 3 friends, having them join, and automatically starting when 4 players are present.

**Acceptance Scenarios**:

1. **Given** a user opens the game URL, **When** they choose "Create Game", **Then** a new game lobby is created, they are assigned a color, and shown a shareable link
2. **Given** a game lobby exists with less than 4 players, **When** another user opens the shareable link, **Then** they join the lobby, are assigned an available color, and all existing players see them join
3. **Given** a lobby has 2-3 players, **When** a new player joins, **Then** all players see the updated player list with names and colors
4. **Given** exactly 4 players are in the lobby, **When** the host clicks "Start Game", **Then** the game board appears for all players and gameplay begins
5. **Given** a user tries to join a full game (4 players), **When** they open the link, **Then** they see a message that the game is full

---

### User Story 3 - Real-Time Multiplayer Experience (Priority: P3)

All players see game state changes instantly as they happen - dice rolls, marble movements, turn changes, and game events appear synchronized across all connected devices.

**Why this priority**: Essential for competitive play and social experience. Delays or desyncs break immersion and cause confusion about whose turn it is.

**Independent Test**: Can be tested by having 4 players on different devices/browsers make moves simultaneously, verifying all see updates within 200ms, and checking that disconnected players are handled gracefully.

**Acceptance Scenarios**:

1. **Given** multiple players are in an active game, **When** one player rolls the dice, **Then** all other players see the dice result within 200ms
2. **Given** a player moves a marble, **When** the move animates, **Then** all players see the same animation synchronized
3. **Given** a player's turn ends, **When** the next player's turn begins, **Then** all players see the turn indicator update and only the current player can interact
4. **Given** a player disconnects mid-game, **When** 30 seconds pass, **Then** their turn is automatically skipped and game continues with remaining players
5. **Given** a disconnected player reconnects, **When** they rejoin, **Then** they see the current game state accurately and can resume playing on their turn

---

### User Story 4 - Mobile-Friendly Touch Experience (Priority: P4)

Players on mobile phones can tap to roll dice, tap marbles to select them, and tap destination spaces to move, with the interface adapting to small screens.

**Why this priority**: "Works on mobile phones" is an explicit requirement. Mobile users are a primary audience for casual board games.

**Independent Test**: Can be tested by playing a complete game on an iPhone and Android phone using only touch gestures, verifying all controls are accessible and the board is fully visible.

**Acceptance Scenarios**:

1. **Given** a user opens the game on a mobile browser, **When** the page loads, **Then** the board fits the screen width, all UI elements are touch-sized (min 44px), and no horizontal scrolling is required
2. **Given** it's a player's turn on mobile, **When** they tap the dice, **Then** the dice rolls and the result is clearly visible
3. **Given** a player has valid moves, **When** they tap a marble, **Then** the marble highlights and shows available destination spaces
4. **Given** a marble is selected, **When** they tap a valid destination space, **Then** the marble moves there with smooth animation
5. **Given** a game is in progress, **When** the user rotates their device, **Then** the board reorients and remains playable

---

### User Story 5 - Guest Authentication (Priority: P5)

Users can enter a display name to play without creating an account, with the option to optionally sign in for persistent identity across sessions.

**Why this priority**: Removes barrier to entry while allowing users who play frequently to maintain identity. Balances simplicity with user choice.

**Independent Test**: Can be tested by joining a game as a guest with only a name, playing successfully, then optionally signing in via Supabase Auth to claim the same identity in future games.

**Acceptance Scenarios**:

1. **Given** a user opens the game for the first time, **When** they create or join a game, **Then** they are prompted to enter a display name (required, 2-20 characters)
2. **Given** a user enters a valid display name, **When** they confirm, **Then** they join the game as a guest and their name is visible to other players
3. **Given** a user is playing as a guest, **When** they click "Sign In", **Then** they see authentication options (email/password, Google, GitHub via Supabase Auth)
4. **Given** a guest user signs in, **When** authentication succeeds, **Then** their display name is preserved and they receive a persistent user ID
5. **Given** a signed-in user returns later, **When** they open the game, **Then** they are automatically logged in with their saved identity

---

### Edge Cases

- What happens when a player disconnects mid-game? (Auto-skip their turns after 30s timeout, allow reconnection to resume)
- What happens when a player's turn timer expires? (Turn automatically passes to next player, timer resets for new player)
- What happens when a player rolls and has no valid moves? (Turn automatically passes to next player)
- What happens when only 2-3 players join a lobby? (Game can start with 2+ players, empty positions remain inactive)
- What happens when the game host disconnects? (Host role transfers to next player in turn order)
- What happens when a player tries to make an illegal move? (Move is rejected client-side, marble returns to original position, no turn consumed)
- What happens when two players try to interact simultaneously? (Server authoritative game state resolves conflicts, first valid action wins)
- What happens when a user opens multiple tabs with the same game? (All tabs sync to same state, only one can control at a time)
- What happens when the browser tab loses focus during a player's turn? (Turn timer continues, other players see game state)

## Requirements *(mandatory)*

### Functional Requirements

#### Game Mechanics

- **FR-001**: System MUST implement official Aggravation rules: 4 players, 4 marbles each, dice roll 1-6, move marbles clockwise around board
- **FR-002**: System MUST enforce marble movement rules: exact roll to enter home, landing on opponent sends them to start, marbles move only forward
- **FR-003**: System MUST track turn order and enforce that only the current player can roll dice and move marbles
- **FR-004**: System MUST enforce 60-second turn timer with 10-second warning; automatically pass turn if time expires
- **FR-005**: System MUST detect win condition when one player gets all 4 marbles into home zone and end the game
- **FR-006**: System MUST implement shortcuts - when a marble completes one full lap, it can take the center shortcut to home

#### Multiplayer & Real-Time

- **FR-007**: System MUST support 2-4 players per game session
- **FR-008**: System MUST broadcast all game state changes to all connected players within 200ms using Supabase Realtime
- **FR-009**: System MUST handle player disconnections gracefully by auto-skipping turns after 30s timeout
- **FR-010**: System MUST allow disconnected players to reconnect and resume their position in the game
- **FR-011**: System MUST use server-authoritative game state to prevent cheating and resolve conflicts

#### Game Lobby & Session Management

- **FR-012**: System MUST allow users to create a new game lobby and receive a unique shareable URL
- **FR-013**: System MUST allow users to join an existing game via shareable URL until lobby is full (4 players)
- **FR-014**: System MUST assign each player a unique color (red, blue, green, yellow) on joining
- **FR-015**: System MUST display all connected players in the lobby with their names and colors
- **FR-016**: System MUST allow the game host to start the game when 2+ players are present
- **FR-017**: System MUST automatically delete game sessions 24 hours after last activity to maintain database hygiene

#### Authentication

- **FR-018**: System MUST allow guest access by collecting only a display name (2-20 characters, no account required)
- **FR-019**: System MUST collect minimal data for guest players (display name and session ID only) and delete all guest data when game session is deleted
- **FR-020**: System MUST support optional sign-in via Supabase Auth with email/password, Google OAuth, and GitHub OAuth
- **FR-021**: System MUST persist signed-in user identity across sessions using Supabase Auth tokens
- **FR-022**: System MUST allow guest users to convert to signed-in users mid-session without losing game state

#### User Interface

- **FR-023**: System MUST render a complete Aggravation game board with starting zones, main track, shortcuts, and home zones for 4 players
- **FR-024**: System MUST display dice roll results with animation
- **FR-025**: System MUST animate marble movements along the board path
- **FR-026**: System MUST highlight valid destination spaces when a marble is selected
- **FR-027**: System MUST display current turn indicator showing which player is active
- **FR-028**: System MUST display turn timer countdown with visual warning when 10 seconds remain
- **FR-029**: System MUST display game history log showing recent moves and events
- **FR-030**: System MUST display victory screen when a player wins with option to start new game

#### Mobile & Responsive

- **FR-031**: System MUST be fully playable on mobile browsers (iOS Safari, Chrome Android) with touch-only input
- **FR-032**: System MUST adapt UI layout for screen sizes from 375px width (iPhone SE) to 1920px+ (desktop)
- **FR-033**: System MUST use touch targets minimum 44x44px for all interactive elements on mobile
- **FR-034**: System MUST support both portrait and landscape orientations on mobile devices

#### Technical Requirements

- **FR-035**: System MUST be built with open-source technologies only (no proprietary licenses)
- **FR-036**: System MUST deploy to Vercel with zero manual configuration beyond environment variables
- **FR-037**: System MUST use Supabase for all backend needs (PostgreSQL database, Auth, Realtime)
- **FR-038**: System MUST work in modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) without polyfills
- **FR-039**: System MUST require no installation - direct browser access only

### Key Entities

- **Game Session**: Represents one complete game, contains game ID, status (lobby/active/completed), winner, created timestamp, host player reference
- **Player**: Represents one participant, contains player ID, display name, color assignment (red/blue/green/yellow), authentication status (guest/signed-in), connection status (connected/disconnected)
- **Marble**: Represents one game piece, contains position on board (0-67 for main track, special values for start/home), player ownership, lap count
- **Game State**: Represents current game condition, contains current turn (player reference), dice value, marble positions for all players, move history
- **Move**: Represents one game action, contains timestamp, player reference, marble moved, start position, end position, special events (opponent aggravated, marble home, etc.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a game and share the link in under 5 seconds from landing page
- **SC-002**: Four players can join a lobby and start playing within 30 seconds of the first player creating the game
- **SC-003**: Game state updates appear on all connected clients within 200ms of the triggering action
- **SC-004**: Page loads and becomes interactive within 2 seconds on 10 Mbps connection
- **SC-005**: Complete game (approximately 20-30 turns) completes without errors or desyncs across all 4 players
- **SC-006**: Game is fully playable on mobile devices with touch-only input, no horizontal scrolling required
- **SC-007**: 90% of users can understand how to create/join a game without instructions
- **SC-008**: Application deploys to Vercel in under 5 minutes from code push
- **SC-009**: Game supports 10 concurrent game sessions (40 players total) without performance degradation
- **SC-010**: Disconnected players can reconnect and resume gameplay within 10 seconds of reconnection
- **SC-011**: Zero configuration required beyond setting Supabase environment variables for deployment
- **SC-012**: UI maintains 60fps during marble movement animations on mobile devices

## Assumptions

- Users have stable internet connection (minimum 1 Mbps for real-time gameplay)
- Players understand basic Aggravation rules (we're not teaching the game from scratch)
- Modern browser with JavaScript enabled and WebSocket support
- Supabase free tier is sufficient for initial deployment (can upgrade if needed)
- Vercel free tier deployment is acceptable for MVP
- Games are casual/social - no ranking system or competitive matchmaking needed initially
- No AI opponent needed - human players only
- English language only for MVP (internationalization can be added later)
- No in-game chat needed initially (players coordinate via external means)
- Standard 4-player Aggravation board layout (not 6-player variant)

## Clarifications

### Session 2025-11-26

- Q: How long should game sessions persist before automatic cleanup? → A: Games persist for 24 hours after last activity, then auto-delete
- Q: What data is collected about guest players and how long is it retained? → A: Minimal data collection (display name + session ID only), deleted with game session
- Q: Is there a time limit for active players to take their turn? → A: 60 seconds per turn with 10-second warning, auto-pass if exceeded
