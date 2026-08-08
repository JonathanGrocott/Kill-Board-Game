import type { MoveOption } from "@/types/game";

export function automaticDestinationMove(moves: MoveOption[]) {
  if (moves.length === 1) return moves[0];
  if (moves.length > 1 && moves.every((move) => move.kind === "base-exit")) return moves[0];
  return null;
}
