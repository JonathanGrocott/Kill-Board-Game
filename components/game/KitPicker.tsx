"use client";

import { useState } from "react";
import { DieIcon, DIE_LABELS } from "@/components/game/LuckyDice";
import { DIE_STYLES, MARBLE_STYLES, PLAYER_COLORS, type DieStyle, type MarbleStyle, type PlayerColor } from "@/types/game";

const MARBLE_LABELS: Record<MarbleStyle, string> = {
  swirl: "Classic swirl",
  "cat-eye": "Cat's eye",
  pearl: "Pearl fire",
};

const COLOR_LABELS: Record<PlayerColor, string> = { red: "Red", blue: "Blue", green: "Green", yellow: "Yellow" };

interface KitPickerProps {
  color: PlayerColor;
  availableColors: PlayerColor[];
  marbleStyle: MarbleStyle;
  diceStyles: DieStyle[];
  selectedDieStyle: DieStyle;
  disabled?: boolean;
  onSave: (kit: { color: PlayerColor; marbleStyle: MarbleStyle; diceStyles: DieStyle[]; dieStyle: DieStyle }) => void;
}

export function KitPicker({ color, availableColors, marbleStyle, diceStyles, selectedDieStyle, disabled, onSave }: KitPickerProps) {
  const [selectedColor, setSelectedColor] = useState(color);
  const [marbles, setMarbles] = useState(marbleStyle);
  const [dice, setDice] = useState<DieStyle[]>(diceStyles);
  const [lucky, setLucky] = useState(selectedDieStyle);

  function toggleDie(styleName: DieStyle) {
    if (dice.includes(styleName)) {
      if (styleName === "team") return;
      if (dice.length === 1) return;
      const next = dice.filter((item) => item !== styleName);
      setDice(next);
      if (lucky === styleName) setLucky(next[0]);
    } else if (dice.length < 3) {
      setDice([...dice, styleName]);
    }
  }

  return (
    <section className="kit-picker" aria-label="Pick your marbles and dice">
      <div className="kit-heading"><span>Marbles & dice</span></div>
      <div className="kit-section">
        <h2>Marble color</h2>
        <div className="marble-color-grid">
          {PLAYER_COLORS.map((colorName) => {
            const available = availableColors.includes(colorName);
            return (
              <button type="button" key={colorName} className={`marble-color-choice color-choice-${colorName} ${selectedColor === colorName ? "is-selected" : ""}`} onClick={() => setSelectedColor(colorName)} disabled={!available || disabled} aria-label={`${COLOR_LABELS[colorName]}${available ? "" : ", taken"}`} aria-pressed={selectedColor === colorName}>
                <i /><b>{COLOR_LABELS[colorName]}</b>{!available && <small>Taken</small>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="kit-section">
        <h2>Finish</h2>
        <div className="marble-style-grid">
          {MARBLE_STYLES.map((styleName) => (
            <button type="button" key={styleName} className={`marble-style ${marbles === styleName ? "is-selected" : ""}`} onClick={() => setMarbles(styleName)} aria-pressed={marbles === styleName}>
              <span className={`kit-marble-row marble-color-${selectedColor}`}>
                {[1, 2, 3, 4, 5].map((number) => <img key={number} src={`/assets/marble-${styleName}.png`} alt="" />)}
              </span>
              <b>{MARBLE_LABELS[styleName]}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="kit-section">
        <h2>Dice rack <small>{dice.length}/3</small></h2>
        <div className="dice-style-grid">
          {DIE_STYLES.map((styleName, index) => {
            const chosen = dice.includes(styleName);
            return (
              <button type="button" key={styleName} className={`dice-style ${chosen ? "is-selected" : ""} ${lucky === styleName ? "is-lucky" : ""}`} onClick={() => toggleDie(styleName)} aria-pressed={chosen}>
                <DieIcon value={[6, 5, 4, 3][index]} styleName={styleName} color={selectedColor} />
                <span><b>{DIE_LABELS[styleName]}</b></span>
              </button>
            );
          })}
        </div>
        <div className="lucky-choice">
          <span>Roll first</span>
          {dice.map((styleName) => <button type="button" key={styleName} onClick={() => setLucky(styleName)} className={lucky === styleName ? "is-selected" : ""}>{DIE_LABELS[styleName]}</button>)}
        </div>
      </div>
      <button type="button" className="button save-kit-button" disabled={disabled || !availableColors.includes(selectedColor)} onClick={() => onSave({ color: selectedColor, marbleStyle: marbles, diceStyles: dice, dieStyle: lucky })}>Lock it in</button>
    </section>
  );
}
