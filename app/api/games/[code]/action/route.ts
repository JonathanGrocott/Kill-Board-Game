import { loadGame, mutateGame, playerForToken, publicGame } from "@/db";
import { DEFAULT_DIE_STYLES, DIE_STYLES, MARBLE_STYLES, PLAYER_COLORS, type DieStyle, type MarbleStyle, type Player, type PlayerColor } from "@/types/game";
import { addPlayerMarbles, applyMove, choosePlayerColor, playBotStep, resolveDoorstepChallenge, rollForPlayer, setupEndgameTest, startGame } from "@/lib/game/rules";

type ActionBody = {
  actionId?: string;
  type?: "add-bot" | "customize" | "start" | "roll" | "move" | "bot-step" | "resolve-doorstep" | "setup-endgame";
  moveId?: string;
  marbleStyle?: MarbleStyle;
  color?: PlayerColor;
  diceStyles?: DieStyle[];
  dieStyle?: DieStyle;
  expectedUpdatedAt?: number;
  expectedPlayerId?: string | null;
  expectedDice?: number | null;
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const body = await request.json() as ActionBody;
    const token = request.headers.get("x-player-token");
    if (!body.actionId || !body.type) throw new Error("Invalid action.");
    const initial = await loadGame(code);
    const initialViewer = await playerForToken(initial.state, token);
    if (!initialViewer) throw new Error("You are not a player in this game.");

    const state = await mutateGame(code, body.actionId, async (game) => {
      const viewer = await playerForToken(game, token);
      if (!viewer) throw new Error("You are not a player in this game.");
      if (body.type === "add-bot") {
        if (viewer.id !== game.hostPlayerId) throw new Error("Only the host can add bots.");
        if (game.status !== "waiting" || game.players.length >= 4) throw new Error("No bot seat is available.");
        const seat = game.players.length;
        const color = PLAYER_COLORS.find((candidate) => !game.players.some((player) => player.color === candidate));
        if (!color) throw new Error("No color is available.");
        const bot: Player = {
          id: crypto.randomUUID(), name: `Bot ${game.players.filter((p) => p.isBot).length + 1}`,
          color, seat, isBot: true,
          marbleStyle: MARBLE_STYLES[seat % MARBLE_STYLES.length],
          diceStyles: [...DEFAULT_DIE_STYLES],
          selectedDieStyle: "team",
        };
        game.players.push(bot);
        addPlayerMarbles(game, bot);
        game.events.push({ id: crypto.randomUUID(), at: Date.now(), message: `${bot.name} joined the room.`, playerId: bot.id });
      } else if (body.type === "customize") {
        if (game.status !== "waiting") throw new Error("Kits lock when the game starts.");
        if (!body.color || !PLAYER_COLORS.includes(body.color)) throw new Error("Choose a marble color.");
        if (!body.marbleStyle || !MARBLE_STYLES.includes(body.marbleStyle)) throw new Error("Choose a marble style.");
        const diceStyles = [...new Set(body.diceStyles ?? [])].filter((style): style is DieStyle => DIE_STYLES.includes(style));
        if (diceStyles.length < 1 || diceStyles.length > 3) throw new Error("Choose between one and three dice.");
        if (!diceStyles.includes("team")) throw new Error("Keep your team-color die in the rack.");
        choosePlayerColor(game, viewer.id, body.color);
        viewer.marbleStyle = body.marbleStyle;
        viewer.diceStyles = diceStyles;
        viewer.selectedDieStyle = diceStyles.includes(body.dieStyle as DieStyle) ? body.dieStyle : diceStyles[0];
      } else if (body.type === "start") {
        if (viewer.id !== game.hostPlayerId) throw new Error("Only the host can start the game.");
        startGame(game);
      } else if (body.type === "roll") {
        if (viewer.isBot) throw new Error("Bots roll for themselves.");
        const diceStyles = viewer.diceStyles?.length ? viewer.diceStyles : [...DEFAULT_DIE_STYLES];
        if (body.dieStyle && diceStyles.includes(body.dieStyle)) viewer.selectedDieStyle = body.dieStyle;
        rollForPlayer(game, viewer.id);
      } else if (body.type === "move") {
        if (!body.moveId) throw new Error("Choose a move.");
        applyMove(game, viewer.id, body.moveId);
      } else if (body.type === "setup-endgame") {
        if (process.env.NODE_ENV === "production") throw new Error("Endgame setup is available only during local development.");
        if (viewer.id !== game.hostPlayerId) throw new Error("Only the host can load a test position.");
        setupEndgameTest(game);
      } else if (body.type === "resolve-doorstep") {
        if (
          body.expectedUpdatedAt !== game.updatedAt ||
          body.expectedPlayerId !== game.currentPlayerId ||
          body.expectedDice !== game.dice
        ) return false;
        resolveDoorstepChallenge(game, viewer.id);
        return true;
      } else if (body.type === "bot-step") {
        if (viewer.id !== game.hostPlayerId) throw new Error("Only the host can advance bots.");
        if (
          body.expectedUpdatedAt !== game.updatedAt ||
          body.expectedPlayerId !== game.currentPlayerId ||
          body.expectedDice !== game.dice
        ) return false;
        playBotStep(game);
        return true;
      }
    });
    return Response.json({ game: await publicGame(state, token) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update game." }, { status: 400 });
  }
}
