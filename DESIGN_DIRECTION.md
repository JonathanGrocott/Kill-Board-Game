# Kill — selected design direction

The game owner selected the **Family Game Night** visual direction on 2026-08-08. The source mock is:

`/Users/jg/.codex/generated_images/019fe2bd-ef39-7650-b4c2-7159bea0277c/exec-e81d9e3e-660b-41bb-be2e-8ef5d06f0dcb.png`

## Visual character

- The game should feel like a premium handcrafted family board game on a warm walnut dining table.
- Use a pale maple board, recessed holes, restrained leather and brass details, and glossy swirled glass marbles.
- Preserve the exact functional board geometry and the family Base orientation in `GAME_RULES.md`.
- Keep the board as the dominant visual. Interface chrome should be quiet, warm, and secondary.
- Favor an intimate, nostalgic, tactile mood over an arcade or generic dashboard aesthetic.

## Game feel

- Players pick a material for their set of five marbles before play.
- Players choose a personal rack of one to three cosmetic dice, then select and roll one die at a time.
- The server remains authoritative for randomness; dice and marble styles never alter odds or rules.
- The chosen die visibly tumbles from the active player's side toward a randomized landing point near Center, without a visible dice arena, reveals the server result, and returns to its rack after the move or turn.
- Human and bot rolls use the same tumble-and-reveal sequence. Every bot result stays on the board before its move or pass so remote players never miss it.
- Marble movement should visibly glide between holes.
- Each viewer sees their own Home along the bottom edge and Base immediately to its right; board geometry and dice paths rotate while labels remain upright.
- Keep player-facing copy terse and game-like. Rules and developer testing notes belong in documentation, not the live table UI.
- Use restrained cartoon callouts for meaningful events: `FAT CITYYY!`, `KILL!`, `SIX AGAIN!`, `UP TIGHT!`, and `CONSTIPATED!`.

## Asset sources

Generated production textures and marble materials live in `public/assets/`. Do not replace them with CSS gradients, emoji, placeholder shapes, or a flattened screenshot of the mock.
