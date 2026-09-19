import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos, watchHistory } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

/** PUT /api/videos/:id/view — увеличить счётчик просмотров (+ история) */
export async function PUT(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const [updated] = await db
    .update(videos)
    .set({ views: sql`${videos.views} + 1` })
    .where(eq(videos.id, id))
    .returning({ views: videos.views });

  if (!updated)
    return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });

  const user = await getSessionUser();
  if (user) {
    await db
      .insert(watchHistory)
      .values({ userId: user.id, videoId: id })
      .onConflictDoUpdate({
        target: [watchHistory.userId, watchHistory.videoId],
        set: { watchedAt: new Date() },
      });
  }

  return NextResponse.json({ views: updated.views });
}
