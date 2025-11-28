# Kill Board Game - Current Game Rules

This document outlines all the gameplay rules currently implemented in the codebase.

---

## Board Layout

- **Track**: 68 spaces (positions 0-67) forming a cross/plus shape
- **Base**: Each player has 6 base spots in a corner where marbles start
- **Home Zone**: Each player has 5 home spaces pointing toward the center (entered from the midpoint of their arm)
- **Center**: A center space exists at position (300, 300)

### Player Starting Positions (Pots)
| Color  | Pot Position | Base Location   | Home Entry Position | Fat City |
|--------|--------------|-----------------|---------------------|----------|
| Red    | 0            | Bottom-Right    | 65                  | 6        |
| Yellow | 17           | Bottom-Left     | 14                  | 23       |
| Green  | 34           | Top-Left        | 31                  | 40       |
| Blue   | 51           | Top-Right       | 48                  | 57       |

---

## Shortcuts

There are two types of shortcuts in the game, both accessible from Fat City positions.

### Fat City Positions (Reference)
| Color  | Fat City Position |
|--------|-------------------|
| Red    | 6                 |
| Yellow | 23                |
| Green  | 40                |
| Blue   | 57                |

---

### Shortcut 1: Fat City Hopping (Best Shortcut!)

When you are **exactly on YOUR Fat City**, you can hop directly to other Fat Cities. Each Fat City counts as 1 space in this shortcut path.

**Requirements:**
- Must be **exactly on YOUR Fat City** (not passing through)
- The shortcut path goes: Red(6) → Yellow(23) → Green(40) → Blue(57) → Red(6)...

**Examples for Red sitting on position 6:**
- Roll 1: Can hop to Yellow's Fat City (position 23)
- Roll 2: Can hop 6→23→40, landing on Green's Fat City (position 40)
- Roll 3: Can hop 6→23→40→57, landing on Blue's Fat City (position 57) - **BEST MOVE IN THE GAME!**

**Why it's powerful:**
- Roll of 3 from your Fat City skips almost the entire board!
- No waiting required (unlike the center which needs a 1 to exit)
- This is optional - you can always choose to move normally on the track instead

---

### Shortcut 2: Center Space

The center space is another shortcut option, but requires rolling 1s to enter and exit.

#### Entering the Center
- You can **only enter the center from YOUR OWN Fat City**
- Must **land exactly** on the center with no remaining movement
- The center counts as **1 space from your Fat City**
- **This is optional** - you can choose to continue on the track or use Fat City hopping instead
- Examples for Red (Fat City = position 6):
  - Red on position 4, rolls 3: Can go 4→5→6→Center (optional) OR 4→5→6→7 (continue on track)
  - Red on position 6, rolls 1: Can go 6→Center (optional) OR 6→23 (Fat City hop) OR 6→7 (track)
  - Red on position 4, rolls 4: MUST go 4→5→6→7→8 (cannot enter center - would have 1 remaining move)

#### Exiting the Center
- Must roll exactly **1** to exit
- Can exit to **ANY Fat City** (yours or any opponent's)
- Player **chooses** which Fat City to exit to
- If you roll anything other than 1 while in the center, you cannot move (turn passes or use another marble)

#### Center Strategy
- **Common strategy**: Exit to the Fat City furthest ahead (clockwise) to skip the most track
- Example: Red in center, rolls 1 → exits to position 57 (Blue's Fat City) to shortcut most of the board
- **Aggressive strategy**: Exit to a Fat City occupied by an opponent to capture (kill) their marble
- The choice of exit Fat City is entirely up to the player - it's a strategic decision

---

### Shortcut Comparison

| Shortcut Type | Entry Requirement | Best Roll | Flexibility |
|---------------|-------------------|-----------|-------------|
| Fat City Hopping | Must be ON your Fat City | 3 (skips 3 Fat Cities) | Can use any roll 1-6 |
| Center Space | Pass through your Fat City, land exactly | 1 to enter, 1 to exit | Choose any exit Fat City |

---

## Marble Movement Rules

### 1. Exiting Base
- A marble can **only exit the base** on a roll of **1 or 6**
- When exiting, the marble moves to the player's **starting position (Pot)**

### 2. Track Movement
- Marbles move **clockwise** around the 68-space track
- Movement is calculated as: `newPosition = (currentPosition + diceRoll) % 68`
- Marbles move the **exact number of spaces** shown on the dice

### 3. Cannot Land on Own Marble
- You **cannot land on a space** occupied by your own marble
- The move is invalid if it would result in landing on your own marble

### 4. Cannot Pass Own Marble
- You **cannot pass (jump over)** your own marble during movement on the track
- You CAN pass opponent marbles
- This rule only applies to track movement, not base exits or home zone

### 5. Capturing Opponent Marbles
- If you land on an **opponent's marble on the track**, their marble is sent back to their base
- Captures can happen on **any track space** including: Pot, Fat City, Shortcut, and Center
- **Only the Home Zone is safe** from captures

### 6. Safe Spaces
- **Home zones** are the ONLY safe spaces
- Marbles in the home zone **cannot be captured**
- All other positions (Pot, Fat City, Shortcut, Center, regular track) are **NOT safe**

### 7. Home Zone Entry
- A marble can enter the home zone **only after completing 1 full lap** around the track
- Each player enters home from a specific **entry position** on the track (midpoint of their arm):
  | Color  | Home Entry Position |
  |--------|---------------------|
  | Red    | 65                  |
  | Yellow | 14                  |
  | Green  | 31                  |
  | Blue   | 48                  |
- You do **NOT need to land exactly** on the entry position - passing through it counts
- Movement is **continuous** - count each space on track AND in home zone
- Example: Red at position 63, rolls 4: 63→64(1), 64→65(2), 65→Home0(3), Home0→Home1(4) = lands on Home 1
- **Cannot enter home if**:
  - The roll would overshoot all available home spaces (home has only 5 spots, indices 0-4)
  - The destination home space is occupied by your own marble
- Example: Red marble on position 65 with a roll of 6 cannot enter home (would land on Home 5, but only 0-4 exist)

### 8. Home Zone Movement
- Home zone has **5 spaces** (indices 0-4)
- Marbles can move within the home zone with the dice roll
- **Cannot overshoot** - if your roll would take you past the last space (index 4), the move is invalid
- Marbles in home zone are **safe from capture**

---

## Turn Rules

### 1. Turn Order
- Players take turns in order: Red → Blue → Green → Yellow → Red...
- Turn order is determined by `position_order` field

### 2. Rolling Dice
- Can only roll dice **on your turn**
- Dice values are 1-6
- **Rolling a 6**: If you roll a 6 AND make a valid move, you get to **roll again**
- This can chain indefinitely - keep rolling as long as you roll 6s and make valid moves
- Example: Roll 6 → exit base to Pot → Roll 6 again → move to Fat City → Roll 5 → move normally → turn ends

### 3. Moving After Rolling
- Must roll dice before moving a marble
- After rolling, select a valid marble to move (if any valid moves exist)
- If no valid moves exist, turn passes to next player (even if you rolled a 6)

### 4. Turn Timeout
- Each turn has a **60 second** time limit
- Warning shown at **10 seconds** remaining
- Turn auto-passes if timeout occurs

---

## Win Condition

- A player wins when **4 marbles reach the home zone**
- Currently tracked by `marbles_home` counter on the player
- Note: Board has 5 home spaces but win requires only 4 marbles

---

## Bot Players

- Bot players automatically roll dice within 2 seconds
- Bots randomly select a valid marble to move
- Bots complete their move within 1 second after rolling
- If bots have no valid moves, their turn passes immediately

---

## Rules NOT Currently Implemented

1. **Backward Movement** - Not implemented
2. **Player choice for center exit** - Currently exits to a predetermined Fat City; should let player choose

---

## Recently Implemented Rules (2025-11-28)

1. ✅ **Roll 6 = Extra Turn** - Player keeps rolling when they roll 6 and make a valid move
2. ✅ **Fat City Hopping** - Can hop between Fat Cities when on your own Fat City
3. ✅ **Center Space Shortcut** - Can enter center from own Fat City, exit with roll of 1
4. ✅ **Home Entry from Track** - Enters home from positions 65/14/31/48 with continuous movement
5. ✅ **Captures everywhere except Home** - Pot, Fat City, Center are all capturable

---

## Questions for Review

1. Should marbles be able to move backward?
2. What happens if you can't move any marble? (Currently: turn passes)
3. Is the win condition 4 or 5 marbles home?
4. Any other special movement rules?

---

*Last updated: November 28, 2025*
