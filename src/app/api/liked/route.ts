import { NextResponse } from "next/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { likes, videos, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { toCard } from "@/lib/video-queries";

/** GET /api/liked — понравившиеся видео текущего пользователя */
export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const rows = await db
    .select({
      likedAt: likes.createdAt,
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
    .from(likes)
    .innerJoin(videos, eq(likes.videoId, videos.id))
    .innerJoin(users, eq(videos.authorId, users.id))
    .where(
      and(
        eq(likes.userId, user.id),
        isNotNull(likes.videoId),
        eq(likes.value, 1),
      ),
    )
    .orderBy(desc(likes.createdAt))
    .limit(60);

  return NextResponse.json({
    items: rows
      .filter((r) => r.video.visibility !== "private" || r.video.authorId === user.id)
      .map((r) => toCard(r.video, r.author)),
  });
}
