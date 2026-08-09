# Kill design QA

## Evidence

- Source visual truth: `design-qa-assets/family-game-night-source.png`
- Browser-rendered implementation: `design-qa-assets/implementation-final.jpg`
- Full-view comparison: `design-qa-assets/full-comparison.jpg`
- Focused board/dice comparison: `design-qa-assets/focused-comparison.jpg`
- Latest dice-throw motion capture: `design-qa-assets/dice-throw-board-motion.png`
- Latest source/motion comparison: `design-qa-assets/dice-throw-comparison.png`
- Source pixels: 1487 × 1058.
- Implementation capture pixels: 1280 × 720 (the in-app browser's normalized screenshot output).
- CSS viewport: 1280 × 720 at device pixel ratio 2. The page reported a 1280 × 720 viewport, a 608 × 608 board, and no document overflow before capture.
- Comparison normalization: each full view was scaled to 1000 px wide and vertically padded to 712 px without distortion. Focused center-board regions were cropped from the visible source and implementation, then normalized to 760 × 560 each.
- State: four-player game against three bots; Jay has three dice, Green Streak remains selected across turns, and the full board and dice controls are visible without page scrolling.
- Latest motion state: Jay's die is visibly entering from the lower-right player side along a slightly curved line toward a randomized landing pocket near Center. The motion capture is 656 × 503 px; the side-by-side comparison canvas is 1600 × 640 px and preserves both images' aspect ratios without cropping.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation uses Georgia for the warm editorial/display voice and Trebuchet/system sans for compact controls. It preserves the source hierarchy, italic player names, small uppercase room/turn labels, and readable in-board progress. The exact unnamed mock fonts are not available; the selected fallbacks preserve the intended character and optical weight.
- Spacing and layout rhythm: the board remains a true square so its 68 perimeter positions retain equal spacing. This intentionally differs from the slightly perspective-stretched mock. At 1280 × 720, the complete board and dice controls fit in the viewport; only the growing Table Talk history scrolls independently. The mobile layout still stacks the controls without horizontal overflow.
- Colors and visual tokens: walnut, honey maple, oxblood felt, aged leather, brass, ivory, and the four player colors closely match the source. Semantic player colors remain distinct and readable.
- Image quality and asset fidelity: generated walnut/maple textures, three glass-marble materials, and six result-specific translucent 3D dice assets are sharp and correctly cropped. The final dice masks remove the chroma-key halo while preserving the resin depth. No visible generated asset is replaced with placeholder art.
- Copy and content: the top-level title is now simply `KILL`; room identity, turn identity, Home progress, concise dice guidance, and the game's vocabulary remain clear. The explanatory Pot/Fat City/Doorstep legend has intentionally moved out of the board and into the future instructions. Extra Table Talk history is an intentional functional addition below the primary controls.
- Interaction fidelity: a player can choose a marble material, select one to three cosmetic dice, keep one lucky die selected across turns, roll it by clicking the selected die, pressing Space, the board, or the roll button, watch it enter from that player's own side and tumble toward Center, read the exact server result, move a marble, see the die return, and receive event callouts. Five landing pockets and five subtle curve variants per player keep throws varied without crossing the protected Center.

## Comparison history

### Iteration 1

- Earlier P2: the central roll used a flat dice icon, which did not match the source's tactile translucent cube.
- Fix: generated six result-specific amber resin dice, keyed and masked them as production assets, connected the visible face to the server roll, and kept the full tumble/land/return sequence.
- Post-fix evidence: `design-qa-assets/focused-comparison.jpg` shows a physical translucent result-specific die in the felt arena.

### Iteration 2

- Earlier P2: the control region read like an opaque dashboard rail and the landing page retained the older flat-paper art direction.
- Fix: softened the rail into the walnut tabletop, restyled the landing and lobby with the same walnut/maple/leather system, and moved player identity/progress onto the board as in the source.
- Post-fix evidence: `design-qa-assets/full-comparison.jpg` and the browser-rendered flow show one coherent Family Game Night system.

### Iteration 3

- Earlier P2: the chosen die required a separate selection/roll rhythm, the game header retained the concept-board title, and a small board legend competed with the playfield.
- Fix: made the lucky die persistent, added selected-die click and Space-bar rolling, retained the physical roll button, simplified the title to `KILL`, removed the board legend, and constrained the desktop shell to the viewport while leaving Table Talk independently scrollable.
- Post-fix evidence: `design-qa-assets/full-comparison.jpg` shows the full 1280 × 720 board and dice controls without document overflow; browser interaction checks confirmed both click-to-roll and Space-to-roll with the same selected Green Streak die.

### Iteration 4

- Earlier P2: the permanent circular felt dice arena made the roll feel like a UI animation rather than a player physically throwing a die onto the board.
- Fix: removed the visible arena, expanded the transparent throw layer across the board, mapped each seat to its own entry edge, and added randomized safe landing pockets plus small perpendicular curve offsets. Landing paths stay on the throwing player's side of Center, so the `C` and any Center marble remain visible.
- Post-fix evidence: `design-qa-assets/dice-throw-comparison.png` shows the source tabletop alongside Jay's live lower-right throw. `design-qa-assets/dice-throw-board-motion.png` shows the die entering from Jay's side with no artificial roll-area graphic and with Center unobstructed.

## Primary interactions tested

- Create solo practice with three bots.
- Pick Cat's Eye marbles, choose dice, save the kit, and start.
- Select a different lucky die.
- Confirm the same die remains selected across turns.
- Roll by clicking the already-selected die.
- Roll the same die again with the Space bar on the next turn.
- Roll with the die visibly traveling from the active player's side toward Center.
- Confirm the visible settled face and label match the authoritative server result.
- Move a legal marble and confirm the die returns to its rack.
- Use a 6 and confirm `SIX AGAIN!` plus the extra roll.
- Confirm bots expose separate roll and move phases so their dice can be seen.
- Confirm no stale callout replays after a reload.
- Check landing and game browser logs: no warnings or errors.
- Check the active game at 1280 × 720: document dimensions exactly match the viewport, the board and dice controls are fully visible, the board legend is absent, and the header reads `KILL`.
- Check mobile landing at 390 × 844: no horizontal overflow.
- Roll from the board during Jay's live turn and capture the die in motion from the lower-right player side.
- Confirm the visible throw path and landing-pocket geometry do not cross Center.
- Check browser warnings and errors after the live throw: none.

## Follow-up polish

- P3: optional sound and haptic toggles could add more physical game-night feel later.
- P3: decorative table props from the concept were omitted to keep the live board uncluttered and responsive.

## Final result

final result: passed
