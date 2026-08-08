import { loadGame, mutateGame, playerForToken, publicGame } from "@/db";
import { PLAYER_COLORS, type Player } from "@/types/game";
import { addPlayerMarbles, applyMove, playBotStep, rollForPlayer, startGame } from "@/lib/game/rules";

type ActionBody = {
  actionId?: string;
  type?: "add-bot" | "start" | "roll" | "move" | "bot-step";
  moveId?: string;
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
        const bot: Player = {
          id: crypto.randomUUID(), name: `Bot ${game.players.filter((p) => p.isBot).length + 1}`,
          color: PLAYER_COLORS[seat], seat, isBot: true,
        };
        game.players.push(bot);
        addPlayerMarbles(game, bot);
        game.events.push({ id: crypto.randomUUID(), at: Date.now(), message: `${bot.name} joined the room.`, playerId: bot.id });
      } else if (body.type === "start") {
        if (viewer.id !== game.hostPlayerId) throw new Error("Only the host can start the game.");
        startGame(game);
      } else if (body.type === "roll") {
        if (viewer.isBot) throw new Error("Bots roll for themselves.");
        rollForPlayer(game, viewer.id);
      } else if (body.type === "move") {
        if (!body.moveId) throw new Error("Choose a move.");
        applyMove(game, viewer.id, body.moveId);
      } else if (body.type === "bot-step") {
        playBotStep(game);
      }
    });
    return Response.json({ game: await publicGame(state, token) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update game." }, { status: 400 });
  }
}
