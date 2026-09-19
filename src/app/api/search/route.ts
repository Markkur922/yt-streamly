import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { videos, users, playlists } from "@/db/schema";
import { toCard } from "@/lib/video-queries";
import { rateLimit } from "@/lib/rate-limit";

const AUTHOR_FIELDS = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  avatarUrl: users.avatarUrl,
  subscribersCount: users.subscribersCount,
  isVerified: users.isVerified,
};

const PERIOD_SQL: Record<string, string> = {
  hour: "1 hour",
  day: "1 day",
  week: "1 week",
  month: "1 month",
  year: "1 year",
};

/** GET /api/search?q=...&type=video|channel|playlist&sort=relevance|date|views&duration=...&period=... */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = rateLimit(`search:${ip}`, 60, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "Слишком часто" }, { status: 429 });

  const q = (url.searchParams.get("q") || "").trim().slice(0, 200);
  const mode = url.searchParams.get("mode") || "";
  if (!q) return NextResponse.json({ items: [], channels: [], playlists: [] });

  // --- Автодополнение ---
  if (mode === "suggest") {
    const rows = await db
      .select({ title: videos.title })
      .from(videos)
      .where(and(eq(videos.visibility, "public"), ilike(videos.title, `%${q}%`)))
      .orderBy(desc(videos.views))
      .limit(6);
    const chRows = await db
      .select({ name: users.name })
      .from(users)
      .where(ilike(users.name, `%${q}%`))
      .limit(3);
    const suggestions = Array.from(
      new Set([...chRows.map((r) => r.name), ...rows.map((r) => r.title)]),
    ).slice(0, 8);
    return NextResponse.json({ suggestions });
  }

  const type = url.searchParams.get("type") || "all";
  const sort = url.searchParams.get("sort") || "relevance";
  const duration = url.searchParams.get("duration") || "any";
  const period = url.searchParams.get("period") || "any";
  const pattern = `%${q}%`;

  // --- Видео ---
  const videoConds: SQL[] = [
    eq(videos.visibility, "public"),
    or(
      ilike(videos.title, pattern),
      ilike(videos.description, pattern),
      sql`array_to_string(${videos.tags}, ' ') ilike ${pattern}`,
    )!,
  ];
  if (duration === "short") videoConds.push(sql`${videos.durationSeconds} < 240`);
  if (duration === "medium")
    videoConds.push(sql`${videos.durationSeconds} between 240 and 1200`);
  if (duration === "long") videoConds.push(sql`${videos.durationSeconds} > 1200`);
  if (PERIOD_SQL[period])
    videoConds.push(
      sql`${videos.createdAt} > now() - interval '${sql.raw(PERIOD_SQL[period])}'`,
    );

  const videoOrder =
    sort === "date"
      ? desc(videos.createdAt)
      : desc(videos.views); // relevance ≈ популярность (без полнотекстового движка в демо)

  const videoRows =
    type === "channel" || type === "playlist"
      ? []
      : await db
          .select({ video: videos, author: AUTHOR_FIELDS })
          .from(videos)
          .innerJoin(users, eq(videos.authorId, users.id))
          .where(and(...videoConds))
          .orderBy(videoOrder)
          .limit(40);

  // --- Каналы ---
  const channelRows =
    type === "video" || type === "playlist"
      ? []
      : await db
          .select({
            id: users.id,
            handle: users.handle,
            name: users.name,
            avatarUrl: users.avatarUrl,
            description: users.description,
            subscribersCount: users.subscribersCount,
          })
          .from(users)
          .where(or(ilike(users.name, pattern), ilike(users.handle, pattern)))
          .orderBy(desc(users.subscribersCount))
          .limit(12);

  // --- Плейлисты ---
  const playlistRows =
    type === "video" || type === "channel"
      ? []
      : await db
          .select({
            playlist: playlists,
            owner: { id: users.id, handle: users.handle, name: users.name },
          })
          .from(playlists)
          .innerJoin(users, eq(playlists.ownerId, users.id))
          .where(
            and(
              eq(playlists.visibility, "public"),
              ilike(playlists.title, pattern),
            ),
          )
          .orderBy(desc(playlists.createdAt))
          .limit(10);

  return NextResponse.json({
    items: videoRows.map((r) => toCard(r.video, r.author)),
    channels: channelRows,
    playlists: playlistRows.map((r) => ({
      id: r.playlist.id,
      title: r.playlist.title,
      description: r.playlist.description,
      createdAt: r.playlist.createdAt.toISOString(),
      owner: r.owner,
    })),
  });
}
