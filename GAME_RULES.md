# Kill — authoritative game rules

This document records the rules confirmed by the game owner on 2026-08-08. It is the source of truth for implementation and future agents. “Kill” is related to Aggravation, but generic Aggravation rules must not override this document.

## Board and vocabulary

- The game has four colored seats and five marbles per seat.
- **Base**: the five safe spaces outside the board where a player's marbles begin and where killed marbles return. Each player's Base sits immediately to the right of that player's Home from the player's seated/viewing orientation.
- **Pot**: the player's entry space on the shared perimeter.
- **Perimeter**: the 68 shared spaces traveled clockwise.
- **Fat City**: one special inner-corner space for each player. Fat Cities are part of both the shared board and shortcut network.
- **Driveway**: the nine shared spaces approaching a player's Home. It begins on the Fat City immediately to the right of that player's Home.
- **Doorstep**: the last shared, unsafe space in the Driveway. After reaching it, that player's path turns into Home instead of continuing around the perimeter.
- **Home**: five safe finishing spaces. All five marbles must finish here “Up Tight.”
- **Center**: the single shared shortcut space in the middle.

Only Base and a player's own Home are safe. Pots, Fat Cities, Driveways, Doorsteps, the Center, and every other perimeter position are unsafe shared spaces.

## Turns and dice

1. Play moves clockwise by occupied board color: Red → Blue → Green → Yellow → Red, skipping any unoccupied colors. The host rolls first; later turns follow this color order regardless of join order or seat number.
2. A player rolls once on their turn.
3. If one legal move exists, the player must take it. If several exist, the player chooses. If none exist, the turn ends.
4. A roll of 6 grants another roll only after the 6 is used in a legal move. Usable consecutive sixes may continue without a fixed limit.
5. A roll of 1 does not grant another roll.

## Leaving Base

- A marble may leave Base only on a 1 or 6.
- Leaving Base consumes the entire roll and places the marble directly on its Pot.
- If the player's own marble occupies the Pot, no other marble may leave Base.
- An opponent on the Pot is killed when a marble enters it.
- Leaving Base with a usable 6 grants another roll.

## Ordinary movement, blocking, and kills

- Marbles move clockwise.
- Opponent marbles may be passed.
- Landing exactly on an opponent kills it and returns it to its Base.
- Killing a player's fifth marble while it is waiting on Doorstep for its final three-roll challenge is called a **Doorstep Killing**. It clears the challenge and is celebrated as `DOORSTEP KILLING!`; this is considered the worst and most painful kind of kill.
- For a non-Doorstep kill, if the kill returns the victim's last active marble so that all five are back in Base, the usual `KILL!` celebration is replaced by `WELCOME TO THE GAME!`.
- A player may not land on or pass over their own marble.
- The own-marble blocking rule applies to ordinary movement, Fat City routes, Center exits, Driveways, and Home.
- If every potential path is blocked or would overshoot Home, that marble has no legal move.
- When a move leaves three marbles belonging to three different players on three consecutive perimeter spaces, including the marble just moved, celebrate `3-WAY-SNIFF!`.
- When a moved marble finishes beside an opponent on that opponent's Driveway, the game occasionally celebrates `SNIFF-SNIFF!`. This is intentionally intermittent table flavor, not a rule that changes movement.

## Fat City and shortcut choices

Shortcuts are optional. A player may prefer normal perimeter movement for tactical reasons, including pursuing an opponent.

### Center shortcut

- From the player's own Fat City, the next counted step may optionally enter the Center.
- Therefore a 1 while on Fat City can enter the Center.
- A marble approaching Fat City may also land in the Center if its count reaches Fat City and has exactly one step remaining. Example: from two spaces before Fat City, a 3 counts two steps to Fat City and the third into Center.
- Entering Center must end the move; a route with additional unspent steps is illegal.
- A marble in Center can leave only with a roll of 1.
- On that 1, it may move to any Fat City, subject to normal landing and kill rules.

### One-to-three-count Fat City shortcut

- A marble that begins its move on its own Fat City and rolls 1, 2, or 3 may optionally use the inner shortcut.
- A 1 moves to the first Fat City clockwise. On the same roll, entering Center or taking normal perimeter movement remain separate legal choices.
- A 2 moves across two Fat Cities and finishes on the second Fat City clockwise.
- Choosing that two-count shortcut is called **Cut Across Shorty** and is celebrated as `CUT ACROSS SHORTY!`.
- A 3 moves across all three other Fat Cities and finishes on the Fat City immediately to the right of the player's Home. That destination begins the player's Driveway.
- A player's own marble on any intermediate or destination Fat City blocks this shortcut.
- Opponents on intermediate Fat Cities may be passed; an opponent on the destination is killed.
- The player may instead use the 3 for normal clockwise perimeter movement.
- The `FAT CITYYY!` celebration is ownership-specific: it appears only when a marble ends a move on that marble owner's Fat City, never merely because it reaches another color's Fat City.

## Driveway, Doorstep, and Home

- A marble can approach Home by traveling the outside perimeter or by using Fat City/Center shortcuts.
- The nine-space Driveway begins at the Fat City to the right of the player's Home and ends at the Doorstep.
- Once a marble reaches its Doorstep, its forward path turns into its own five-space Home; it does not continue around the perimeter.
- Movement into and within Home must use the full roll. Overshooting the fifth/deepest Home space is illegal.
- Marbles already in Home continue moving deeper on later turns.
- Marbles cannot pass or share a space with their own marbles in Home. This can create a blocked or “constipated” Home that requires small rolls to pack the marbles Up Tight.
- `CONSTIPATED!` applies only when Home is not packed contiguously against the deepest Up Tight space and an otherwise valid path into or within Home is blocked by the player's own Home marble. A packed Home, merely overshooting Home, or having an unrelated unusable roll is not constipation.
- Marbles in Home cannot be killed.

### Three Doorstep tries

- When a player already has four marbles Up Tight in Home and lands their fifth marble exactly on their Doorstep, they begin a three-chance challenge. Normal turn order continues, so every other player still takes their turns between that player's chances.
- This final configuration is called the **Bung Hole** and is celebrated as `BUNG HOLE!`.
- **Auto-Bung** occurs when the fifth marble is already waiting on Doorstep and a move within Home packs the other four marbles Up Tight, automatically creating the same three-chance challenge. The move is celebrated as `AUTO-BUNG!`.
- On each of that player's next three turns, they roll once for a 1. A 1 moves the Doorstep marble into the remaining Home spot and wins the game.
- Other roll values do not move a marble and consume one chance, then play advances to the next player. The game announces `1/3 TRIES`, `2/3 TRIES`, and `FINAL TRY` on those three rolls.
- If the third roll is not a 1, the Doorstep marble immediately moves to that player's Pot and normal turn order resumes. If an opponent occupies the Pot, that opponent is killed under the normal landing rule.

## Winning

The first player to place all five marbles safely into the five Home spaces wins. The finished arrangement is called **Up Tight**.

## Digital-game decisions

- Four seats are available in every room.
- A room may be played by 2–4 humans, or vacant seats may be filled with bots. Solo practice creates one human and three bots.
- Humans use guest display names only; no account or personal details are required.
- The server rolls dice and validates every action.
- Before the game, each human may choose one marble material and a rack of one to three cosmetic dice. The player chooses one die to roll at a time. These choices are visual only and never affect the server-generated result.
- Before the game, each human may also choose any team color not held by another human. In a bot game, choosing a bot's color swaps that bot to the human's previous color. Color determines the player's physical board position and clockwise turn order; it does not change who rolls first.
- Every joined player sees a viewer-relative board: their own Home is centered along the bottom edge, their Base remains immediately to its right, and the rest of the board rotates around Center. Board labels and dice remain upright.
- Every seat starts with its matching team-color die selected so observers can identify the roller. Human players may keep up to two additional dice in their rack and switch freely.
- Rolling 6, then 6, then 3 within one uninterrupted extended turn is the celebrated `6-6-3!`. The sequence is based on the player's actual roll chain; it does not require choosing particular routes.
- The third consecutive 6 in one uninterrupted extended turn is celebrated once as `6-AGAIN. JOE ROLL?`. The ordinary `SIX AGAIN!` callout does not cover this special animation after the move.
- Bots choose from the same server-generated legal moves as humans.
- Bot turns are host-driven in two visible phases: first roll and reveal the die, then move or pass. Duplicate or stale bot-step requests must never skip the visible result.
- Every roll is retained as a short-lived structured game event containing the roller, result, and selected die style. Other players replay that throw even if the roller completes their move between polling refreshes; human and bot rolls must both remain visibly attributable.
- A known remote result uses its actual numbered die face throughout the throw animation. While that result is being presented, the turn-status card temporarily shows the roller's name and `ROLLED N`, then returns to the current player.
- A human may execute a legal move by clicking either the marble being moved or its highlighted destination. When the destination contains an opponent, that opponent's marble is itself the clickable `KILL` target.
- Clicking a Pot for a legal Base exit automatically chooses any one of the equivalent Base marbles. On a human turn before rolling, clicking the open board also rolls the selected die; the die button and Space bar remain available.
- A marble occupying Center remains visible while dice travel from the active player's side to a randomized safe landing position near Center.
- Local development exposes a host-only endgame test control that places four marbles per player Up Tight and each fifth marble one space before its Doorstep. This control must not be available in a production/Sites build.
- The host configures the human turn timer before starting: Off, 1 minute, 2 minutes, or 5 minutes. The default is 2 minutes. When a human has not rolled by the deadline, the server rolls automatically; it never chooses a legal move for that human. Bots keep their normal visible automated turn flow.
- Active games include temporary table chat for human players. Messages are plain text, normalized to 160 characters, and the game retains only the most recent 60.
- Phone layouts prioritize legible marbles and table chat: the board and compact controls share the viewport, nonessential move history is hidden, and chat remains visible without scrolling on common portrait and landscape sizes when no exceptional move-choice panel is open.
- Game records, including chat, are temporary and are deleted after completion or abandonment.
