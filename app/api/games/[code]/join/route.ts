import { joinGame, publicGame } from "@/db";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const body = await request.json() as { name?: string; actionId?: string };
    if (!body.actionId) throw new Error("Missing request identifier.");
    const { state, token } = await joinGame(code, body.name ?? "", body.actionId);
    return Response.json({ game: await publicGame(state, token), token });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not join game." }, { status: 400 });
  }
}
