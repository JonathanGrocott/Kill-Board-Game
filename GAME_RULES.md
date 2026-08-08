# Kill — authoritative game rules

This document records the rules confirmed by the game owner on 2026-08-08. It is the source of truth for implementation and future agents. “Kill” is related to Aggravation, but generic Aggravation rules must not override this document.

## Board and vocabulary

- The game has four colored seats and five marbles per seat.
- **Base**: the five safe spaces outside the board where a player's marbles begin and where killed marbles return.
- **Pot**: the player's entry space on the shared perimeter.
- **Perimeter**: the 68 shared spaces traveled clockwise.
- **Fat City**: one special inner-corner space for each player. Fat Cities are part of both the shared board and shortcut network.
- **Driveway**: the nine shared spaces approaching a player's Home. It begins on the Fat City immediately to the right of that player's Home.
- **Doorstep**: the last shared, unsafe space in the Driveway. After reaching it, that player's path turns into Home instead of continuing around the perimeter.
- **Home**: five safe finishing spaces. All five marbles must finish here “Up Tight.”
- **Center**: the single shared shortcut space in the middle.

Only Base and a player's own Home are safe. Pots, Fat Cities, Driveways, Doorsteps, the Center, and every other perimeter position are unsafe shared spaces.

## Turns and dice

1. Play moves clockwise around the board and through the player order.
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
- A player may not land on or pass over their own marble.
- The own-marble blocking rule applies to ordinary movement, Fat City routes, Center exits, Driveways, and Home.
- If every potential path is blocked or would overshoot Home, that marble has no legal move.

## Fat City and shortcut choices

Shortcuts are optional. A player may prefer normal perimeter movement for tactical reasons, including pursuing an opponent.

### Center shortcut

- From the player's own Fat City, the next counted step may optionally enter the Center.
- Therefore a 1 while on Fat City can enter the Center.
- A marble approaching Fat City may also land in the Center if its count reaches Fat City and has exactly one step remaining. Example: from two spaces before Fat City, a 3 counts two steps to Fat City and the third into Center.
- Entering Center must end the move; a route with additional unspent steps is illegal.
- A marble in Center can leave only with a roll of 1.
- On that 1, it may move to any Fat City, subject to normal landing and kill rules.

### Three-count Fat City shortcut

- A marble that begins its move on its own Fat City and rolls exactly 3 may optionally use the inner shortcut.
- The move counts across the other three Fat Cities and finishes on the Fat City immediately to the right of the player's Home.
- That destination is the beginning of the player's Driveway.
- A player's own marble on any intermediate or destination Fat City blocks this shortcut.
- Opponents on intermediate Fat Cities may be passed; an opponent on the destination is killed.
- The player may instead use the 3 for normal clockwise perimeter movement.

## Driveway, Doorstep, and Home

- A marble can approach Home by traveling the outside perimeter or by using Fat City/Center shortcuts.
- The nine-space Driveway begins at the Fat City to the right of the player's Home and ends at the Doorstep.
- Once a marble reaches its Doorstep, its forward path turns into its own five-space Home; it does not continue around the perimeter.
- Movement into and within Home must use the full roll. Overshooting the fifth/deepest Home space is illegal.
- Marbles already in Home continue moving deeper on later turns.
- Marbles cannot pass or share a space with their own marbles in Home. This can create a blocked or “constipated” Home that requires small rolls to pack the marbles Up Tight.
- Marbles in Home cannot be killed.

## Winning

The first player to place all five marbles safely into the five Home spaces wins. The finished arrangement is called **Up Tight**.

## Digital-game decisions

- Four seats are available in every room.
- A room may be played by 2–4 humans, or vacant seats may be filled with bots. Solo practice creates one human and three bots.
- Humans use guest display names only; no account or personal details are required.
- The server rolls dice and validates every action.
- Bots choose from the same server-generated legal moves as humans.
- Game records are temporary and are deleted after completion or abandonment.
