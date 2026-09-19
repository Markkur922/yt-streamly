import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { reactToVideo } from "@/lib/reactions";

/** POST /api/videos/:id/like — лайк (переключаемый) */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [video] = await db
    .select({ id: videos.id })
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  if (!video) return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });

  const result = await reactToVideo(user.id, id, 1);
  return NextResponse.json(result);
}
