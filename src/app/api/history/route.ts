import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { watchHistory, videos, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { toCard } from "@/lib/video-queries";

/** GET /api/history — история просмотров (с датой просмотра) */
export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const rows = await db
    .select({
      watchedAt: watchHistory.watchedAt,
      video: videos,
      author: {
        id: users.id,
        handle: users.handle,
        name: users.name,
        avatarUrl: users.avatarUrl,
        subscribersCount: users.subscribersCount,
        isVerified: users.isVerified,
      },
    })
    .from(watchHistory)
    .innerJoin(videos, eq(watchHistory.videoId, videos.id))
    .innerJoin(users, eq(videos.authorId, users.id))
    .where(eq(watchHistory.userId, user.id))
    .orderBy(desc(watchHistory.watchedAt))
    .limit(60);

  return NextResponse.json({
    items: rows.map((r) => ({
      ...toCard(r.video, r.author),
      watchedAt: r.watchedAt.toISOString(),
    })),
  });
}

/** DELETE /api/history — очистить историю */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  await db.delete(watchHistory).where(eq(watchHistory.userId, user.id));
  return NextResponse.json({ ok: true });
}
