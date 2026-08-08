import type { PlayerColor, Position } from "@/types/game";

export const TRACK_LENGTH = 68;
export const MARBLES_PER_PLAYER = 5;
export const HOME_SPACES = 5;

export const POTS: Record<PlayerColor, number> = {
  red: 0,
  blue: 17,
  green: 34,
  yellow: 51,
};

export const FAT_CITIES: Record<PlayerColor, number> = {
  red: 6,
  blue: 23,
  green: 40,
  yellow: 57,
};

export const DOORSTEPS: Record<PlayerColor, number> = {
  red: 65,
  blue: 14,
  green: 31,
  yellow: 48,
};

export const DRIVEWAY_STARTS: Record<PlayerColor, number> = {
  red: 57,
  blue: 6,
  green: 23,
  yellow: 40,
};

export interface BoardPoint { x: number; y: number }

const VIEW_ROTATION_QUARTERS: Record<PlayerColor, number> = {
  red: 0,
  blue: 1,
  green: 2,
  yellow: 3,
};

/** Rotates board geometry so the viewer's own Home is always at the bottom. */
export function boardPointForViewer(point: BoardPoint, viewerColor: PlayerColor = "red"): BoardPoint {
  let rotated = point;
  for (let turn = 0; turn < VIEW_ROTATION_QUARTERS[viewerColor]; turn += 1) {
    rotated = { x: 50 + (rotated.y - 50), y: 50 - (rotated.x - 50) };
  }
  return rotated;
}

export function getTrackPoints(): BoardPoint[] {
  const points: BoardPoint[] = [];
  const center = 50;
  const step = 5.45;
  const inner = 2.5;
  const tip = 8.5;
  const push = (x: number, y: number) => points.push({ x: center + x * step, y: center + y * step });

  for (let y = tip; y >= inner; y--) push(-inner, y);
  for (let x = -inner - 1; x >= -tip; x--) push(x, inner);
  for (let y = inner - 1; y >= -inner; y--) push(-tip, y);
  for (let x = -tip + 1; x <= -inner; x++) push(x, -inner);
  for (let y = -inner - 1; y >= -tip; y--) push(-inner, y);
  for (let x = -inner + 1; x <= inner; x++) push(x, -tip);
  for (let y = -tip + 1; y <= -inner; y++) push(inner, y);
  for (let x = inner + 1; x <= tip; x++) push(x, -inner);
  for (let y = -inner + 1; y <= inner; y++) push(tip, y);
  for (let x = tip - 1; x >= inner; x--) push(x, inner);
  for (let y = inner + 1; y <= tip; y++) push(inner, y);
  for (let x = inner - 1; x >= -inner + 1; x--) push(x, tip);
  return points;
}

export const TRACK_POINTS = getTrackPoints();

export const HOME_POINTS: Record<PlayerColor, BoardPoint[]> = {
  red: [91, 85.5, 80, 74.5, 69].map((y) => ({ x: 50, y })),
  blue: [9, 14.5, 20, 25.5, 31].map((x) => ({ x, y: 50 })),
  green: [9, 14.5, 20, 25.5, 31].map((y) => ({ x: 50, y })),
  yellow: [91, 85.5, 80, 74.5, 69].map((x) => ({ x, y: 50 })),
};

export const BASE_POINTS: Record<PlayerColor, BoardPoint[]> = {
  red: [{x:74,y:79},{x:80,y:73},{x:86,y:79},{x:77,y:85},{x:83,y:85}],
  blue: [{x:14,y:79},{x:20,y:76},{x:26,y:79},{x:17,y:85},{x:23,y:85}],
  green: [{x:14,y:21},{x:20,y:15},{x:26,y:21},{x:17,y:27},{x:23,y:27}],
  yellow: [{x:74,y:21},{x:80,y:15},{x:86,y:21},{x:77,y:27},{x:83,y:27}],
};

export const CENTER_POINT = { x: 50, y: 50 };

export function samePosition(a: Position, b: Position) {
  return a.area === b.area && a.index === b.index;
}

export function positionKey(position: Position) {
  return `${position.area}:${position.index ?? "x"}`;
}

export function describeTrackSpace(index: number, color?: PlayerColor) {
  if (color && POTS[color] === index) return "Pot";
  if (Object.values(FAT_CITIES).includes(index)) return "Fat City";
  if (color && DOORSTEPS[color] === index) return "Doorstep";
  return `space ${index + 1}`;
}
