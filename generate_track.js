const fs = require('fs');

// Board config
const CENTER = 300;
const STEP = 35; // Space between circles
const ARM_LENGTH = 6; // Circles per arm side?

// We need 68 spaces total.
// 17 per quadrant.
// Quadrant path:
// 1. Start at inner corner (e.g., bottom-left of center)
// 2. Go Out along arm
// 3. Turn corner
// 4. Go Across arm end
// 5. Turn corner
// 6. Go In along arm
// 7. Turn corner (inner)

// Let's try to map 17 spaces.
// 5 Out + 1 Corner + 2 End + 1 Corner + 5 In + 1 Inner Corner? = 15. Short.
// 6 Out + 1 + 2 + 1 + 6 In + 1 = 17?
// Let's try:
// Out: 6 spaces
// End: 3 spaces (Corner + Middle + Corner)
// In: 6 spaces
// Inner Corner: 1 space? No, inner corner is shared?
// 68 / 4 = 17.

// Let's define the path for one arm (e.g., Bottom Arm).
// But track goes AROUND the board.
// Sequence:
// 1. Bottom Arm (Right side) -> Right Arm (Bottom side) -> Right Arm (Top side) -> Top Arm (Right side)...

// Let's define points relative to center.
const coords = [];

// Helper to add point
function add(x, y) {
    coords.push({ x: CENTER + x * STEP, y: CENTER + y * STEP });
}

// Generate 68 points clockwise starting from Red Start (usually right side of bottom arm?)
// Let's assume Red Start is Index 0.
// Red Base is Bottom-Left.
// Red Start is usually at the "Start" hole.
// Let's assume Index 0 is at (Bottom Arm, Right Side, Near Base).

// Let's generate a generic cross perimeter.
// 4 Arms: Bottom, Left, Top, Right.
// Track goes counter-clockwise? Or clockwise?
// Usually clockwise.

// Let's try to match the SVG.
// SVG has 68 circles.
// Let's generate a "Cross" path.

// Bottom Arm (Right Edge): 5 points going UP?
// No, clockwise means:
// Bottom Arm (Left Edge) -> UP
// Left Arm (Bottom Edge) -> LEFT
// Left Arm (End) -> UP
// Left Arm (Top Edge) -> RIGHT
// Top Arm (Left Edge) -> UP
// ...

// Let's try to fit 17 points per quadrant.
// Quadrant = One Arm + connection to next.

// Let's use a simple path generator.
// Start at Bottom-Left Inner Corner.
// x=-1, y=1 (relative to center steps)
// 1. Move DOWN along Left Edge of Bottom Arm (5 steps)
// 2. Move RIGHT along Bottom Edge of Bottom Arm (3 steps)
// 3. Move UP along Right Edge of Bottom Arm (5 steps)
// 4. Move RIGHT along Bottom Edge of Right Arm (5 steps)
// ...

// Wait, 17 * 4 = 68.
// 5 + 3 + 5 + 1 (inner corner) = 14.
// We need 17.
// Maybe 6 + 3 + 6 + 1? = 16.
// Maybe 6 + 4 + 6 + 1? = 17.
// 4 steps at end of arm?
// 6 steps along side?

// Let's try 6 steps along side, 3 steps at end (corner, mid, corner).
// Side: 6 circles.
// End: 3 circles.
// Inner: 1 circle (shared? or skipped?)
// 6 + 3 + 6 = 15.
// Plus 2 "inner" steps to connect?
// 17.

// Let's try:
// Side length = 6 circles.
// End width = 3 circles.
// Inner corner = 1 circle.
// Total = 6 + 3 + 6 + 1 = 16. Still short 1.
// Maybe 7 side? 7+3+7+1 = 18. Too long.

// Let's look at the SVG count again.
// 68 total.
// Maybe the "Start" is separate?
// No, track is continuous.

// Let's try to generate 68 points.
// 17 per side.
// 5 (side) + 1 (corner) + 1 (end) + 1 (corner) + 5 (side) + 1 (inner) = 14.
// 6 + 1 + 1 + 1 + 6 + 1 = 16.
// 6 + 1 + 2 (end) + 1 + 6 + 1 = 17.
// So End width is 4 circles? (Corner, 2 mid, Corner).
// Side length is 6 circles.

// Let's try this geometry:
// Arm Width = 4 circles.
// Arm Length = 6 circles (from inner corner).

// Coordinates (relative to center, in steps):
// Inner corners at (+-2, +-2)?
// If width is 4, center is at 0.
// -2, -1, 0, 1 (4 circles).
// So inner corners are at x=+-2, y=+-2.

// Start at Bottom-Left Inner Corner: (-2, 2).
// 1. Move DOWN (y increases) 6 steps: (-2, 2) to (-2, 7). (6 circles: 2,3,4,5,6,7)
// 2. Move RIGHT (x increases) 3 steps: (-1, 7) to (1, 7). (3 circles: -1, 0, 1) -> Wait, width is 4. -2 to 1.
//    Corner at (-2, 7).
//    End: (-1, 7), (0, 7), (1, 7).
//    Corner at (1, 7).
// 3. Move UP (y decreases) 6 steps: (1, 6) to (1, 1). (6 circles: 6,5,4,3,2,1)
// 4. Inner Corner at (2, 1)? No, (1, 1).
//    Next is Right Arm Bottom Edge.
//    Start at (2, 1).

// Let's trace:
// Side 1 (Left of Bottom Arm): (-2, 2) ... (-2, 7). 6 circles.
// End 1 (Bottom of Bottom Arm): (-2, 7) is corner. (-1, 7), (0, 7), (1, 7). 3 circles?
//    If width is 4, we have -2, -1, 0, 1.
//    So corners are -2 and 1.
//    Between them: -1, 0. (2 circles).
//    Total end circles: 4 (Corner + 2 + Corner).
// Side 2 (Right of Bottom Arm): (1, 7) ... (1, 2). 6 circles.
// Inner Corner: (1, 1)? No, (2, 2) is inner corner of Right Arm?
// We need to bridge (1, 2) to (2, 1).
// One circle at (1, 1)? Or (2, 2)?
// If we put a circle at (1, 1), that's the inner corner.
// Then (2, 1) starts the next arm.

// Count:
// Side 1: 6
// End: 2 (excluding corners)
// Side 2: 6
// Corners: 2 (Outer)
// Inner: 1
// Total: 6 + 2 + 6 + 2 + 1 = 17.
// PERFECT!

// So geometry is:
// Arm Width: 4 circles (indices -2, -1, 0, 1)
// Arm Length: 6 circles (indices 2 to 7)
// Inner Corner: 1 circle at (1, 1), (-1, 1), (-1, -1), (1, -1).

// Let's generate coordinates.
// Clockwise starting from... Red Start.
// Red is Bottom Player.
// Start is usually on the Right side of the Bottom Arm (safe spot).
// Let's start at (1, 2) (Top of Right side of Bottom Arm) and go Clockwise?
// No, standard is Clockwise.
// If Red is Bottom, and moves Clockwise, they move Left->Up->Right...
// So they move along Left side of Bottom Arm?
// No, usually you exit base to the "Start" spot.
// If Red Base is Bottom-Left, Start spot is likely on Left side of Bottom Arm.
// Let's assume index 0 is (-2, 2) (Top of Left side of Bottom Arm).

// Sequence (17 points):
// 1. (-2, 2) to (-2, 7) (Down) -> 6 points
// 2. (-1, 7) to (0, 7) (Right) -> 2 points
// 3. (1, 7) to (1, 2) (Up) -> 6 points
// 4. (1, 1) (Inner Corner) -> 1 point
// 5. (2, 1) ... (Right Arm)

// Wait, (1, 1) connects Bottom Arm to Right Arm?
// Bottom Arm Right Edge is x=1.
// Right Arm Bottom Edge is y=1.
// They meet at (1, 1).
// So (1, 1) is the shared inner corner.

// Let's verify the loop.
// Bottom Arm:
//   Left Edge: x=-2, y=2..7 (6 pts)
//   Bottom Edge: x=-1..0, y=7 (2 pts)
//   Right Edge: x=1, y=7..2 (6 pts)
//   Inner: x=1, y=1 (1 pts)
//   Total: 15 pts?
//   Wait: 6 + 2 + 6 + 1 = 15.
//   We need 17.

// Where are the missing 2 points?
// Maybe Arm Length is 7?
// 7 + 2 + 7 + 1 = 17.
// Let's try Arm Length 7.
// y=2..8.

// Let's generate and print.
const armLength = 7;
const armWidth = 4; // -2 to 1
const inner = 1;

// Bottom Arm (Red)
// Starts at x=-2, y=2.
// 1. Down: (-2, 2) to (-2, 8) -> 7 pts
// 2. Right: (-1, 8) to (0, 8) -> 2 pts
// 3. Up: (1, 8) to (1, 2) -> 7 pts
// 4. Inner: (1, 1) -> 1 pt
// Total: 17.

// Right Arm (Blue)
// Starts at x=2, y=1.
// 1. Right: (2, 1) to (8, 1) -> 7 pts
// 2. Up: (8, 0) to (8, -1) -> 2 pts
// 3. Left: (8, -2) to (2, -2) -> 7 pts
// 4. Inner: (1, -2) -> 1 pt (Wait, inner corner is (1, -2)?)
//   Right Arm Top Edge is y=-2.
//   Top Arm Right Edge is x=1.
//   Meet at (1, -2). Yes.

// Top Arm (Green)
// Starts at x=1, y=-3? No, y=-3 is inside arm.
// Top Arm Right Edge is x=1.
// Starts at (1, -3) to (1, -9).
// ...

// Let's write the script to generate this.

const points = [];

// Helper to push point
function p(x, y) {
    points.push({ x: CENTER + x * STEP, y: CENTER + y * STEP });
}

// 1. Bottom Arm (Red) - Clockwise?
// If Red Base is Bottom-Left, and moves Clockwise.
// Start should be near Base.
// (-2, 2) is near Base.
// Path: Down -> Right -> Up -> Inner.
for (let y = 2; y <= 8; y++) p(-2, y); // Down (Left Edge)
for (let x = -1; x <= 0; x++) p(x, 8); // Right (Bottom Edge)
for (let y = 8; y >= 2; y--) p(1, y); // Up (Right Edge)
p(1, 1); // Inner

// 2. Left Arm (Yellow) - Wait, Clockwise from Bottom goes to LEFT?
// No, Clockwise from 6 o'clock goes to 9 o'clock?
// 6 -> 9 is Clockwise.
// So Bottom -> Left -> Top -> Right.
// Let's check.
// Clock: 12 -> 3 -> 6 -> 9.
// Board: Top -> Right -> Bottom -> Left.
// So Bottom -> Left is Clockwise.

// So next is Left Arm.
// Starts at x=-1, y=1?
// Inner corner was (1, 1). That connects Bottom and Right.
// So Bottom -> Right is COUNTER-CLOCKWISE.
// Aggravation is usually Clockwise?
// Let's check rules. "Move marbles clockwise around the board".
// So Bottom -> Left -> Top -> Right -> Bottom.

// So my sequence should be:
// Bottom Arm (Right Edge) -> Down?
// No, if moving clockwise:
// Start at Bottom Arm (Left Edge) -> Up?
// No, Left Edge is x=-2.
// If we are at (-2, 8) (Bottom-Left corner of arm), moving clockwise means moving UP towards center.
// So:
// 1. Up: (-2, 8) to (-2, 2)
// 2. Inner: (-2, 1)?
// 3. Left Arm (Bottom Edge): (-2, 1) to (-8, 1)?

// Let's re-orient.
// Red Base: Bottom-Left.
// Start Position: usually index 0.
// Path: Clockwise.
// So Red moves from Bottom-Left -> Top-Left -> Top-Right -> Bottom-Right.
// So Bottom Arm -> Left Arm -> Top Arm -> Right Arm.

// Let's trace Bottom Arm segment for Red.
// Starts at "Start" hole. Usually near base.
// Let's say Start is (-2, 8) (Bottom-Left tip).
// Path:
// 1. Up along Left Edge: (-2, 8) to (-2, 2). (7 pts)
// 2. Inner Corner: (-2, 1). (1 pt)
//    Connects to Left Arm Bottom Edge.
// 3. Left Arm Bottom Edge: (-3, 1) to (-9, 1)?
//    Wait, Left Arm is x negative.
//    Width 4: y=-1 to 2? No, y=-2 to 1.
//    So Bottom Edge is y=1.
//    Left Edge is x=-8.
//    Top Edge is y=-2.
//    Right Edge (inner) is x=-2.

//    Path continues:
//    Left Arm Bottom Edge: (-3, 1) to (-8, 1). (6 pts)
//    Left Arm End: (-9, 1)? No, corner.
//    Let's stick to the 7-2-7-1 pattern.

//    If we start at (-2, 8) and go UP:
//    (-2, 8)..(-2, 2) -> 7 pts.
//    (-2, 1) -> 1 pt.
//    Next is Left Arm.
//    (-3, 1)..(-9, 1)? -> 7 pts.
//    (-9, 0)..(-9, -1) -> 2 pts (End).
//    (-9, -2)..(-3, -2) -> 7 pts (Top Edge).
//    (-2, -2) -> 1 pt (Inner).

//    Next is Top Arm.
//    (-2, -3)..(-2, -9) -> 7 pts (Left Edge).
//    (-1, -9)..(0, -9) -> 2 pts (End).
//    (1, -9)..(1, -3) -> 7 pts (Right Edge).
//    (1, -2) -> 1 pt (Inner).

//    Next is Right Arm.
//    (2, -2)..(8, -2) -> 7 pts (Top Edge).
//    (9, -2)..(9, -1)? No, x=8 is end.
//    (8, -1)..(8, 0) -> 2 pts (End).
//    (8, 1)..(2, 1) -> 7 pts (Bottom Edge).
//    (1, 1) -> 1 pt (Inner).

//    Next is Bottom Arm (Right Edge).
//    (1, 2)..(1, 8) -> 7 pts.
//    (0, 8)..(-1, 8) -> 2 pts (End).
//    (-2, 8) -> Back to start.

// Total points:
// Bottom Left Edge: 7
// Inner: 1
// Left Bottom Edge: 7
// Left End: 2
// Left Top Edge: 7
// Inner: 1
// Top Left Edge: 7
// Top End: 2
// Top Right Edge: 7
// Inner: 1
// Right Top Edge: 7
// Right End: 2
// Right Bottom Edge: 7
// Inner: 1
// Bottom Right Edge: 7
// Bottom End: 2
// Total: 4 * (7 + 1 + 7 + 2) = 68?
// 7+1=8. 8+7=15. 15+2=17.
// 17 * 4 = 68.
// PERFECT!

// So the path is:
// Start at (-2, 8).
// 1. Up (-2, 8 -> 2)
// 2. Inner (-2, 1)
// 3. Left (-3 -> -9, 1)
// 4. Up (-9, 0 -> -1) (End)
// 5. Right (-9 -> -3, -2)
// 6. Inner (-2, -2)
// 7. Up (-2, -3 -> -9)
// 8. Right (-1 -> 0, -9) (End)
// 9. Down (1, -9 -> -3)
// 10. Inner (1, -2)
// 11. Right (2 -> 8, -2)
// 12. Down (8, -1 -> 0) (End)
// 13. Left (8 -> 2, 1)
// 14. Inner (1, 1)
// 15. Down (1, 2 -> 8)
// 16. Left (0 -> -1, 8) (End)

// This generates 68 points clockwise.
// Red Start is usually index 0.
// If Red is Bottom-Left, index 0 is (-2, 8).

// Let's generate this JSON.
const track = [];
// 1. Up (-2, 8 -> 2)
for (let y = 8; y >= 2; y--) p(-2, y);
// 2. Inner (-2, 1)
p(-2, 1);
// 3. Left (-3 -> -9, 1)
for (let x = -3; x >= -9; x--) p(x, 1);
// 4. Up (-9, 0 -> -1)
for (let y = 0; y >= -1; y--) p(-9, y);
// 5. Right (-9 -> -3, -2)
for (let x = -9; x <= -3; x++) p(x, -2);
// 6. Inner (-2, -2)
p(-2, -2);
// 7. Up (-2, -3 -> -9)
for (let y = -3; y >= -9; y--) p(-2, y);
// 8. Right (-1 -> 0, -9)
for (let x = -1; x <= 0; x++) p(x, -9);
// 9. Down (1, -9 -> -3)
for (let y = -9; y <= -3; y++) p(1, y);
// 10. Inner (1, -2)
p(1, -2);
// 11. Right (2 -> 8, -2)
for (let x = 2; x <= 8; x++) p(x, -2);
// 12. Down (8, -1 -> 0)
for (let y = -1; y <= 0; y++) p(8, y);
// 13. Left (8 -> 2, 1)
for (let x = 8; x >= 2; x--) p(x, 1);
// 14. Inner (1, 1)
p(1, 1);
// 15. Down (1, 2 -> 8)
for (let y = 2; y <= 8; y++) p(1, y);
// 16. Left (0 -> -1, 8)
for (let x = 0; x >= -1; x--) p(x, 8);

console.log(JSON.stringify(points, null, 2));
