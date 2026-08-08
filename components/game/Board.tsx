"use client";

import { BASE_POINTS, CENTER_POINT, DOORSTEPS, FAT_CITIES, HOME_POINTS, POTS, TRACK_POINTS, samePosition } from "@/lib/game/board";
import type { Marble, MoveOption, Player, PlayerColor, Position } from "@/types/game";

interface BoardProps {
  players: Array<Omit<Player, "tokenHash">>;
  marbles: Marble[];
  legalMoves: MoveOption[];
  selectedMarbleId: string | null;
  onMarbleClick: (marbleId: string) => void;
  onMoveChoice: (moveId: string) => void;
  disabled?: boolean;
}

const colorByValue = (record: Record<PlayerColor, number>, value: number) =>
  (Object.entries(record) as Array<[PlayerColor, number]>).find(([, index]) => index === value)?.[0];

function pointFor(marble: Marble, color: PlayerColor) {
  if (marble.position.area === "base") return BASE_POINTS[color][marble.number - 1];
  if (marble.position.area === "track") return TRACK_POINTS[Number(marble.position.index)];
  if (marble.position.area === "home") return HOME_POINTS[color][Number(marble.position.index)];
  return CENTER_POINT;
}

function destinationMove(moves: MoveOption[], position: Position, selectedMarbleId: string | null) {
  const matches = moves.filter((move) => (!selectedMarbleId || move.marbleId === selectedMarbleId) && samePosition(move.destination, position));
  return matches.length === 1 ? matches[0] : null;
}

export function Board({ players, marbles, legalMoves, selectedMarbleId, onMarbleClick, onMoveChoice, disabled }: BoardProps) {
  const validMarbles = new Set(legalMoves.map((move) => move.marbleId));
  const selectedMoves = selectedMarbleId ? legalMoves.filter((move) => move.marbleId === selectedMarbleId) : legalMoves;

  return (
    <div className="kill-board" role="region" aria-label="Kill game board">
      <div className="board-arm board-arm-vertical" />
      <div className="board-arm board-arm-horizontal" />

      {TRACK_POINTS.map((point, index) => {
        const potColor = colorByValue(POTS, index);
        const fatColor = colorByValue(FAT_CITIES, index);
        const doorstepColor = colorByValue(DOORSTEPS, index);
        const move = destinationMove(selectedMoves, { area: "track", index }, selectedMarbleId);
        return (
          <button
            type="button"
            key={`track-${index}`}
            className={`board-space track-space ${potColor ? "is-pot" : ""} ${fatColor ? "is-fat-city" : ""} ${doorstepColor ? "is-doorstep" : ""} ${move ? "is-destination" : ""}`}
            style={{ left: `${point.x}%`, top: `${point.y}%`, "--space-color": `var(--player-${potColor ?? fatColor ?? doorstepColor ?? "neutral"})` } as React.CSSProperties}
            onClick={() => move && onMoveChoice(move.id)}
            disabled={!move || disabled}
            aria-label={move?.label ?? `Board space ${index + 1}`}
          >
            {potColor ? "P" : fatColor ? "F" : doorstepColor ? "D" : ""}
          </button>
        );
      })}

      {(Object.entries(HOME_POINTS) as Array<[PlayerColor, typeof HOME_POINTS.red]>).flatMap(([color, points]) =>
        points.map((point, index) => {
          const move = destinationMove(selectedMoves, { area: "home", index }, selectedMarbleId);
          return (
            <button
              type="button"
              key={`${color}-home-${index}`}
              className={`board-space home-space ${move ? "is-destination" : ""}`}
              style={{ left: `${point.x}%`, top: `${point.y}%`, "--space-color": `var(--player-${color})` } as React.CSSProperties}
              onClick={() => move && onMoveChoice(move.id)}
              disabled={!move || disabled}
              aria-label={move?.label ?? `${color} Home ${index + 1}`}
            />
          );
        })
      )}

      {(Object.entries(BASE_POINTS) as Array<[PlayerColor, typeof BASE_POINTS.red]>).flatMap(([color, points]) =>
        points.map((point, index) => (
          <div
            key={`${color}-base-${index}`}
            className="board-space base-space"
            style={{ left: `${point.x}%`, top: `${point.y}%`, "--space-color": `var(--player-${color})` } as React.CSSProperties}
          />
        ))
      )}

      <button
        type="button"
        className={`board-space center-space ${destinationMove(selectedMoves, { area: "center", index: null }, selectedMarbleId) ? "is-destination" : ""}`}
        style={{ left: `${CENTER_POINT.x}%`, top: `${CENTER_POINT.y}%` }}
        onClick={() => {
          const move = destinationMove(selectedMoves, { area: "center", index: null }, selectedMarbleId);
          if (move) onMoveChoice(move.id);
        }}
        disabled={!destinationMove(selectedMoves, { area: "center", index: null }, selectedMarbleId) || disabled}
        aria-label="Center"
      >C</button>

      {players.map((player) => (
        <div key={`${player.id}-label`} className={`base-label base-label-${player.color}`}>
          <span>{player.name}</span>{player.isBot && <small> BOT</small>}
        </div>
      ))}

      {marbles.map((marble) => {
        const player = players.find((item) => item.id === marble.playerId);
        if (!player) return null;
        const point = pointFor(marble, player.color);
        const valid = validMarbles.has(marble.id);
        return (
          <button
            type="button"
            key={marble.id}
            className={`marble marble-${player.color} ${valid ? "is-valid" : ""} ${selectedMarbleId === marble.id ? "is-selected" : ""}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            onClick={() => valid && onMarbleClick(marble.id)}
            disabled={!valid || disabled}
            aria-label={`${player.name} marble ${marble.number}${valid ? ", legal move available" : ""}`}
          ><span /></button>
        );
      })}

      <div className="board-legend" aria-hidden="true"><span>P</span> Pot <span>F</span> Fat City <span>D</span> Doorstep</div>
    </div>
  );
}
