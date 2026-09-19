import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { videos, users, subscriptions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getVideoReaction } from "@/lib/reactions";
import { toCard } from "@/lib/video-queries";
import { CATEGORIES } from "@/lib/constants";

const AUTHOR_FIELDS = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  avatarUrl: users.avatarUrl,
  subscribersCount: users.subscribersCount,
  isVerified: users.isVerified,
};

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/videos/:id — получить видео по ID */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();

  const [row] = await db
    .select({ video: videos, author: AUTHOR_FIELDS })
    .from(videos)
    .innerJoin(users, eq(videos.authorId, users.id))
    .where(eq(videos.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });
  if (row.video.visibility === "private" && row.video.authorId !== user?.id)
    return NextResponse.json({ error: "Видео недоступно" }, { status: 403 });

  const myReaction = user ? await getVideoReaction(user.id, id) : 0;
  let isSubscribed = false;
  if (user && user.id !== row.video.authorId) {
    const [sub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.subscriberId, user.id),
          eq(subscriptions.channelId, row.video.authorId),
        ),
      )
      .limit(1);
    isSubscribed = !!sub;
  }
  if (user && user.id === row.video.authorId) isSubscribed = true;

  return NextResponse.json({
    video: { ...toCard(row.video, row.author), myReaction, isSubscribed },
  });
}

/** PUT /api/videos/:id — обновить видео (только автор) */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [video] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  if (!video) return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });
  if (video.authorId !== user.id)
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 3 || t.length > 150)
      return NextResponse.json({ error: "Название: от 3 до 150 символов" }, { status: 400 });
    patch.title = t;
  }
  if (typeof body.description === "string")
    patch.description = body.description.slice(0, 5000);
  if (typeof body.category === "string" && CATEGORIES.includes(body.category as never))
    patch.category = body.category;
  if (Array.isArray(body.tags))
    patch.tags = (body.tags as unknown[]).map(String).slice(0, 15);
  if (typeof body.visibility === "string" && ["public", "unlisted", "private"].includes(body.visibility))
    patch.visibility = body.visibility;
  if (typeof body.thumbnailUrl === "string" || body.thumbnailUrl === null)
    patch.thumbnailUrl = body.thumbnailUrl;

  const [updated] = await db
    .update(videos)
    .set(patch)
    .where(eq(videos.id, id))
    .returning();

  const [author] = await db
    .select(AUTHOR_FIELDS)
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return NextResponse.json({ video: toCard(updated, author ?? user) });
}

/** DELETE /api/videos/:id — удалить видео (только автор) */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [video] = await db
    .select({ authorId: videos.authorId })
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  if (!video) return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });
  if (video.authorId !== user.id)
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const [full] = await db
    .select({
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      videoPublicId: videos.videoPublicId,
      thumbnailPublicId: videos.thumbnailPublicId,
    })
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  await db.delete(videos).where(and(eq(videos.id, id)));
  const { deleteAsset } = await import("@/lib/storage");
  await deleteAsset(full?.videoPublicId, full?.videoUrl, "video");
  await deleteAsset(full?.thumbnailPublicId, full?.thumbnailUrl, "image");
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
