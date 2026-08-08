import { createGame, publicGame } from "@/db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; practice?: boolean };
    const { state, token } = await createGame(body.name ?? "", body.practice === true);
    return Response.json({ game: await publicGame(state, token), token }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not create game." }, { status: 400 });
  }
}
