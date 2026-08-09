"use client";

import { BASE_POINTS, CENTER_POINT, DOORSTEPS, FAT_CITIES, HOME_POINTS, POTS, TRACK_POINTS, boardPointForViewer, samePosition } from "@/lib/game/board";
import type { ReactNode } from "react";
import type { Marble, MoveOption, Player, PlayerColor, Position } from "@/types/game";

interface BoardProps {
  players: Array<Omit<Player, "tokenHash">>;
  marbles: Marble[];
  legalMoves: MoveOption[];
  selectedMarbleId: string | null;
  onMarbleClick: (marbleId: string) => void;
  onDestinationClick: (position: Position) => void;
  onBoardRoll?: () => void;
  canRoll?: boolean;
  diceRolling?: boolean;
  disabled?: boolean;
  diceStage?: ReactNode;
  callout?: string | null;
  viewerColor?: PlayerColor;
}

const BASE_LABEL_POINTS: Record<PlayerColor, { x: number; y: number }> = {
  red: { x: 80, y: 91 },
  blue: { x: 20, y: 91 },
  green: { x: 20, y: 9 },
  yellow: { x: 80, y: 9 },
};

const colorByValue = (record: Record<PlayerColor, number>, value: number) =>
  (Object.entries(record) as Array<[PlayerColor, number]>).find(([, index]) => index === value)?.[0];

function pointFor(marble: Marble, color: PlayerColor) {
  if (marble.position.area === "base") return BASE_POINTS[color][marble.number - 1];
  if (marble.position.area === "track") return TRACK_POINTS[Number(marble.position.index)];
  if (marble.position.area === "home") return HOME_POINTS[color][Number(marble.position.index)];
  return CENTER_POINT;
}

function movesToDestination(moves: MoveOption[], position: Position) {
  return moves.filter((move) => samePosition(move.destination, position));
}

export function Board({ players, marbles, legalMoves, selectedMarbleId, onMarbleClick, onDestinationClick, onBoardRoll, canRoll, diceRolling, disabled, diceStage, callout, viewerColor = "red" }: BoardProps) {
  const validMarbles = new Set(legalMoves.map((move) => move.marbleId));
  const selectedMoves = selectedMarbleId ? legalMoves.filter((move) => move.marbleId === selectedMarbleId) : legalMoves;
  const playerColorByMarbleId = new Map(marbles.map((marble) => [marble.id, players.find((player) => player.id === marble.playerId)?.color]));
  const visibleMovesToDestination = (moves: MoveOption[], position: Position, homeColor?: PlayerColor) =>
    movesToDestination(moves, position).filter((move) => position.area !== "home" || playerColorByMarbleId.get(move.marbleId) === homeColor);
  const centerPosition: Position = { area: "center", index: null };
  const centerMoves = visibleMovesToDestination(selectedMoves, centerPosition);

  return (
    <div className={`kill-board ${diceStage ? "has-dice" : ""} ${diceRolling ? "is-dice-rolling" : ""} ${canRoll ? "can-roll" : ""}`} role="region" aria-label="Kill game board">
      <div className="board-arm board-arm-vertical" />
      <div className="board-arm board-arm-horizontal" />
      <button type="button" className="board-roll-surface" onClick={onBoardRoll} disabled={!canRoll || disabled || !onBoardRoll} aria-label="Roll selected die on the board" />

      {TRACK_POINTS.map((point, index) => {
        const displayPoint = boardPointForViewer(point, viewerColor);
        const potColor = colorByValue(POTS, index);
        const fatColor = colorByValue(FAT_CITIES, index);
        const doorstepColor = colorByValue(DOORSTEPS, index);
        const position: Position = { area: "track", index };
        const destinationMoves = visibleMovesToDestination(selectedMoves, position);
        const isDestination = destinationMoves.length > 0;
        return (
          <button
            type="button"
            key={`track-${index}`}
            className={`board-space track-space ${potColor ? "is-pot" : ""} ${fatColor ? "is-fat-city" : ""} ${doorstepColor ? "is-doorstep" : ""} ${isDestination ? "is-destination" : ""}`}
            style={{ left: `${displayPoint.x}%`, top: `${displayPoint.y}%`, "--space-color": `var(--player-${potColor ?? fatColor ?? doorstepColor ?? "neutral"})` } as React.CSSProperties}
            onClick={() => isDestination && onDestinationClick(position)}
            disabled={!isDestination || disabled}
            aria-label={destinationMoves.length === 1 ? destinationMoves[0].label : isDestination ? `Choose a move to board space ${index + 1}` : `Board space ${index + 1}`}
          >
            {potColor ? "P" : fatColor ? "F" : doorstepColor ? "D" : ""}
          </button>
        );
      })}

      {(Object.entries(HOME_POINTS) as Array<[PlayerColor, typeof HOME_POINTS.red]>).flatMap(([color, points]) =>
        points.map((point, index) => {
          const displayPoint = boardPointForViewer(point, viewerColor);
          const position: Position = { area: "home", index };
          const destinationMoves = visibleMovesToDestination(selectedMoves, position, color);
          const isDestination = destinationMoves.length > 0;
          return (
            <button
              type="button"
              key={`${color}-home-${index}`}
              className={`board-space home-space ${isDestination ? "is-destination" : ""}`}
              style={{ left: `${displayPoint.x}%`, top: `${displayPoint.y}%`, "--space-color": `var(--player-${color})` } as React.CSSProperties}
              onClick={() => isDestination && onDestinationClick(position)}
              disabled={!isDestination || disabled}
              aria-label={destinationMoves.length === 1 ? destinationMoves[0].label : isDestination ? `Choose a move to ${color} Home ${index + 1}` : `${color} Home ${index + 1}`}
            />
          );
        })
      )}

      {(Object.entries(BASE_POINTS) as Array<[PlayerColor, typeof BASE_POINTS.red]>).flatMap(([color, points]) =>
        points.map((point, index) => {
          const displayPoint = boardPointForViewer(point, viewerColor);
          return (
          <div
            key={`${color}-base-${index}`}
            className="board-space base-space"
            style={{ left: `${displayPoint.x}%`, top: `${displayPoint.y}%`, "--space-color": `var(--player-${color})` } as React.CSSProperties}
          />
          );
        })
      )}

      <button
        type="button"
        className={`board-space center-space ${centerMoves.length ? "is-destination" : ""}`}
        style={{ left: `${CENTER_POINT.x}%`, top: `${CENTER_POINT.y}%` }}
        onClick={() => { if (centerMoves.length) onDestinationClick(centerPosition); }}
        disabled={!centerMoves.length || disabled}
        aria-label="Center"
      >C</button>

      {diceStage && <div className="dice-arena">{diceStage}</div>}
      {callout && <div className={`game-callout callout-${callout.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{callout}</div>}

      {players.map((player) => {
        const labelPoint = boardPointForViewer(BASE_LABEL_POINTS[player.color], viewerColor);
        return (
        <div key={`${player.id}-label`} className="base-label" style={{ left: `${labelPoint.x}%`, top: `${labelPoint.y}%`, "--space-color": `var(--player-${player.color})` } as React.CSSProperties}>
          <span>{player.name}</span>
          <small>{player.isBot ? "BOT · " : ""}{marbles.filter((marble) => marble.playerId === player.id && marble.position.area === "home").length}/5 HOME</small>
        </div>
        );
      })}

      {marbles.map((marble) => {
        const player = players.find((item) => item.id === marble.playerId);
        if (!player) return null;
        const point = boardPointForViewer(pointFor(marble, player.color), viewerColor);
        const valid = validMarbles.has(marble.id);
        const destinationMoves = visibleMovesToDestination(selectedMoves, marble.position, marble.position.area === "home" ? player.color : undefined);
        const isDestination = destinationMoves.length > 0;
        const isKillTarget = destinationMoves.some((move) => move.capturesPlayerId === marble.playerId);
        return (
          <button
            type="button"
            key={marble.id}
            className={`marble marble-${player.color} ${marble.position.area === "center" ? "is-in-center" : ""} ${valid ? "is-valid" : ""} ${isDestination ? "is-destination-target" : ""} ${isKillTarget ? "is-kill-target" : ""} ${selectedMarbleId === marble.id ? "is-selected" : ""}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            onClick={() => valid ? onMarbleClick(marble.id) : isDestination && onDestinationClick(marble.position)}
            disabled={(!valid && !isDestination) || disabled}
            aria-label={isKillTarget ? `Kill ${player.name}'s marble ${marble.number}` : `${player.name} marble ${marble.number}${valid ? ", legal move available" : ""}`}
          ><img src={`/assets/marble-${player.marbleStyle ?? "swirl"}.png`} alt="" /></button>
        );
      })}
    </div>
  );
}
