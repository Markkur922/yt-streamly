import { NextResponse } from "next/server";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { videos, users, subscriptions, notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { toCard } from "@/lib/video-queries";
import { CATEGORIES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

const AUTHOR_FIELDS = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  avatarUrl: users.avatarUrl,
  subscribersCount: users.subscribersCount,
  isVerified: users.isVerified,
};

/** GET /api/videos — список видео с пагинацией, фильтрами и сортировкой */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    24,
    Math.max(1, parseInt(url.searchParams.get("limit") || "12", 10) || 12),
  );
  const category = url.searchParams.get("category") || "";
  const sort = url.searchParams.get("sort") || "new";
  const channelId = url.searchParams.get("channelId") || "";
  const mine = url.searchParams.get("mine") === "1";
  const subs = url.searchParams.get("subs") === "1";

  const user = await getSessionUser();
  if ((mine || subs) && !user)
    return NextResponse.json(
      { error: "Требуется авторизация" },
      { status: 401 },
    );

  const conditions: SQL[] = [];
  if (mine) {
    conditions.push(eq(videos.authorId, user!.id));
  } else {
    conditions.push(eq(videos.visibility, "public"));
  }
  if (channelId) conditions.push(eq(videos.authorId, channelId));
  if (category && category !== "Все")
    conditions.push(eq(videos.category, category));
  if (subs && user)
    conditions.push(
      sql`${videos.authorId} in (select channel_id from subscriptions where subscriber_id = ${user.id})`,
    );

  const order =
    sort === "popular"
      ? desc(videos.views)
      : sort === "trending"
        ? desc(sql`${videos.views} + ${videos.likesCount} * 5`)
        : desc(videos.createdAt);

  const rows = await db
    .select({ video: videos, author: AUTHOR_FIELDS })
    .from(videos)
    .innerJoin(users, eq(videos.authorId, users.id))
    .where(and(...conditions))
    .orderBy(order)
    .limit(limit + 1)
    .offset((page - 1) * limit);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((r) => toCard(r.video, r.author));

  return NextResponse.json({ items, page, hasMore });
}

/** POST /api/videos — создание видео (метаданные после загрузки файла) */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const rl = rateLimit(`upload:${user.id}`, 20, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "Слишком часто" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const videoUrl = String(body.videoUrl || "").trim();
  const description = String(body.description || "").slice(0, 5000);
  const category = CATEGORIES.includes(body.category as never)
    ? String(body.category)
    : "Развлечения";
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[]).map(String).slice(0, 15)
    : [];
  const thumbnailUrl = body.thumbnailUrl ? String(body.thumbnailUrl) : null;
  const durationSeconds =
    Math.max(0, Math.floor(Number(body.durationSeconds) || 0)) || 0;
  const visibility = ["public", "unlisted", "private"].includes(
    String(body.visibility),
  )
    ? String(body.visibility)
    : "public";
  const qualities = Array.isArray(body.qualities)
    ? (body.qualities as { label: string; url: string }[])
        .filter((q) => q && q.label && q.url)
        .slice(0, 6)
    : [];

  if (title.length < 3 || title.length > 150)
    return NextResponse.json(
      { error: "Название: от 3 до 150 символов" },
      { status: 400 },
    );
  if (!videoUrl)
    return NextResponse.json({ error: "Нет видеофайла" }, { status: 400 });

  const [video] = await db
    .insert(videos)
    .values({
      authorId: user.id,
      title,
      description,
      category,
      tags,
      thumbnailUrl,
      videoUrl,
      durationSeconds,
      visibility,
      qualities: qualities.length
        ? qualities
        : [{ label: "Авто", url: videoUrl }],
    })
    .returning();

  // Уведомляем подписчиков канала о новом видео
  if (visibility === "public") {
    const subs = await db
      .select({ subscriberId: subscriptions.subscriberId })
      .from(subscriptions)
      .where(eq(subscriptions.channelId, user.id))
      .limit(500);
    if (subs.length) {
      await db.insert(notifications).values(
        subs.map((s) => ({
          userId: s.subscriberId,
          text: `${user.name} опубликовал(а) новое видео: «${title}»`,
          link: `/watch/${video.id}`,
          avatarUrl: user.avatarUrl,
          thumbnailUrl,
        })),
      );
    }
  }

  const [author] = await db
    .select(AUTHOR_FIELDS)
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return NextResponse.json(
    { video: toCard(video, author ?? { ...user }) },
    { status: 201 },
  );
}
