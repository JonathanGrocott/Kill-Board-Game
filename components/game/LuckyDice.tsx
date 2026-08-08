"use client";

import type { CSSProperties } from "react";
import { boardPointForViewer } from "@/lib/game/board";
import type { DieStyle, PlayerColor } from "@/types/game";

export const DIE_LABELS: Record<DieStyle, string> = {
  team: "Team color",
  ivory: "Old faithful",
  amber: "Honey luck",
  forest: "Green streak",
};

export function DieIcon({ value, styleName, color, className = "" }: { value: number; styleName: DieStyle; color?: PlayerColor; className?: string }) {
  return <img className={`die-icon die-${styleName} ${color ? `die-team-${color}` : ""} ${className}`} src={`/assets/die-${value}.png`} alt="" />;
}

interface DiceRackProps {
  styles: DieStyle[];
  color: PlayerColor;
  selected: DieStyle;
  result: number | null;
  rolling: boolean;
  canRoll: boolean;
  onSelect: (style: DieStyle) => void;
  onRoll: () => void;
}

export function DiceRack({ styles, color, selected, result, rolling, canRoll, onSelect, onRoll }: DiceRackProps) {
  const chooseOrRoll = (styleName: DieStyle) => {
    if (styleName === selected && canRoll && !rolling && result === null) onRoll();
    else onSelect(styleName);
  };

  return (
    <div className="dice-rack" aria-label="Your lucky dice">
      <div className="dice-rack-title"><span>Your die</span><small><kbd>SPACE</kbd> TO ROLL</small></div>
      <div className="dice-rack-row">
        {styles.map((styleName, index) => (
          <button
            type="button"
            key={styleName}
            className={`rack-die ${selected === styleName ? "is-selected" : ""} ${rolling && selected === styleName ? "is-away" : ""}`}
            onClick={() => chooseOrRoll(styleName)}
            disabled={rolling || result !== null}
            aria-label={selected === styleName ? `Roll ${DIE_LABELS[styleName]} die` : `Choose ${DIE_LABELS[styleName]} die`}
            aria-pressed={selected === styleName}
          >
            <DieIcon value={[6, 4, 5, 3][index] ?? 6} styleName={styleName} color={color} />
          </button>
        ))}
      </div>
      <button type="button" className="roll-die-button" onClick={onRoll} disabled={!canRoll || rolling || result !== null}>
        {rolling ? "Rolling…" : result !== null ? `Rolled ${result}` : `Roll ${DIE_LABELS[selected]}`}
      </button>
    </div>
  );
}

const DIE_THROW_STARTS: Record<PlayerColor, { x: number; y: number }> = {
  red: { x: 78, y: 104 },
  blue: { x: 22, y: 104 },
  green: { x: 22, y: -4 },
  yellow: { x: 78, y: -4 },
};

const DIE_LANDING_POINTS: Record<PlayerColor, ReadonlyArray<{ x: number; y: number }>> = {
  red: [{ x: 56, y: 56 }, { x: 50, y: 60 }, { x: 60, y: 50 }, { x: 57, y: 54 }, { x: 54, y: 57 }],
  blue: [{ x: 44, y: 56 }, { x: 50, y: 60 }, { x: 40, y: 50 }, { x: 43, y: 54 }, { x: 46, y: 57 }],
  green: [{ x: 44, y: 44 }, { x: 50, y: 40 }, { x: 40, y: 50 }, { x: 43, y: 46 }, { x: 46, y: 43 }],
  yellow: [{ x: 56, y: 44 }, { x: 50, y: 40 }, { x: 60, y: 50 }, { x: 57, y: 46 }, { x: 54, y: 43 }],
};

const THROW_CURVES = [-1.6, 1.2, -.8, 1.7, .5] as const;

export function BoardDie({ styleName, color, result, rolling, landingSlot = 0, viewerColor = "red" }: { styleName: DieStyle; color: PlayerColor; result: number | null; rolling: boolean; landingSlot?: number; viewerColor?: PlayerColor }) {
  const slot = landingSlot % DIE_LANDING_POINTS[color].length;
  const start = boardPointForViewer(DIE_THROW_STARTS[color], viewerColor);
  const landing = boardPointForViewer(DIE_LANDING_POINTS[color][slot], viewerColor);
  const curve = THROW_CURVES[slot];
  const deltaX = landing.x - start.x;
  const deltaY = landing.y - start.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const perpendicularX = (-deltaY / distance) * curve;
  const perpendicularY = (deltaX / distance) * curve;
  const pointAlongThrow = (progress: number) => ({
    x: start.x + deltaX * progress + perpendicularX,
    y: start.y + deltaY * progress + perpendicularY,
  });
  const firstBounce = pointAlongThrow(.43);
  const secondBounce = pointAlongThrow(.76);
  return (
    <div
      className={`board-die ${rolling ? "is-rolling" : "is-settled"}`}
      style={{
        "--die-start-x": `${start.x}%`,
        "--die-start-y": `${start.y}%`,
        "--die-bounce-one-x": `${firstBounce.x}%`,
        "--die-bounce-one-y": `${firstBounce.y}%`,
        "--die-bounce-two-x": `${secondBounce.x}%`,
        "--die-bounce-two-y": `${secondBounce.y}%`,
        "--die-land-x": `${landing.x}%`,
        "--die-land-y": `${landing.y}%`,
      } as CSSProperties}
      aria-live="polite"
    >
      <img className={`board-die-image die-image-${styleName} die-team-${color}`} src={`/assets/die-${rolling ? 6 : result ?? 6}.png`} alt="" />
      {!rolling && result !== null && <span className="rolled-label">Rolled {result}</span>}
    </div>
  );
}
