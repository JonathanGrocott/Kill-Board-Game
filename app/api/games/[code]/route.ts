import { loadGame, publicGame } from "@/db";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const { state } = await loadGame(code);
    const token = request.headers.get("x-player-token");
    return Response.json({ game: await publicGame(state, token) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load game." }, { status: 404 });
  }
}
