import { NextResponse } from "next/server";
import { and, desc, eq, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { videos, users } from "@/db/schema";
import { toCard } from "@/lib/video-queries";

const AUTHOR_FIELDS = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  avatarUrl: users.avatarUrl,
  subscribersCount: users.subscribersCount,
  isVerified: users.isVerified,
};

/**
 * GET /api/videos/:id/related — рекомендованные видео.
 * Скоринг: совпадение категории + пересечение тегов + популярность.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const [source] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  if (!source)
    return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });

  const candidates = await db
    .select({ video: videos, author: AUTHOR_FIELDS })
    .from(videos)
    .innerJoin(users, eq(videos.authorId, users.id))
    .where(and(eq(videos.visibility, "public"), ne(videos.id, id)))
    .orderBy(desc(videos.views))
    .limit(120);

  const tagSet = new Set(source.tags ?? []);
  const scored = candidates.map((c) => {
    const shared = (c.video.tags ?? []).filter((t) => tagSet.has(t)).length;
    const sameCategory = c.video.category === source.category ? 1 : 0;
    const sameAuthor = c.video.authorId === source.authorId ? 1 : 0;
    const score =
      shared * 4 + sameCategory * 3 + sameAuthor * 2 + Math.log10(c.video.views + 10);
    return { ...c, score };
  });
  scored.sort((a, b) => b.score - a.score);

  let picked = scored.filter((s) => s.score > Math.log10(10) + 0.5).slice(0, 12);
  if (picked.length < 6) {
    const fresh = await db
      .select({ video: videos, author: AUTHOR_FIELDS })
      .from(videos)
      .innerJoin(users, eq(videos.authorId, users.id))
      .where(
        and(
          eq(videos.visibility, "public"),
          ne(videos.id, id),
          notInArray(videos.id, picked.map((p) => p.video.id)),
        ),
      )
      .orderBy(desc(videos.createdAt))
      .limit(12 - picked.length);
    picked = [...picked, ...fresh.map((f) => ({ ...f, score: 0 }))];
  }

  return NextResponse.json({
    items: picked.map((p) => toCard(p.video, p.author)),
  });
}
