import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { playlists, playlistVideos, videos } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function ownedPlaylist(id: string, userId: string) {
  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, id))
    .limit(1);
  if (!playlist) return { error: "Плейлист не найден", status: 404 as const };
  if (playlist.ownerId !== userId) return { error: "Нет прав", status: 403 as const };
  return { playlist };
}

/** POST /api/playlists/:id/videos — добавить видео в плейлист */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const check = await ownedPlaylist(id, user.id);
  if ("error" in check)
    return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json().catch(() => ({}));
  const videoId = String(body.videoId || "");
  if (!videoId)
    return NextResponse.json({ error: "videoId обязателен" }, { status: 400 });

  const [video] = await db
    .select({ id: videos.id })
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);
  if (!video) return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });

  const [existing] = await db
    .select({ id: playlistVideos.id })
    .from(playlistVideos)
    .where(
      and(
        eq(playlistVideos.playlistId, id),
        eq(playlistVideos.videoId, videoId),
      ),
    )
    .limit(1);
  if (existing)
    return NextResponse.json({ ok: true, already: true });

  const [max] = await db
    .select({ m: sql<number>`coalesce(max(${playlistVideos.position}), -1)` })
    .from(playlistVideos)
    .where(eq(playlistVideos.playlistId, id));

  await db.insert(playlistVideos).values({
    playlistId: id,
    videoId,
    position: Number(max?.m ?? -1) + 1,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/playlists/:id/videos — удалить видео из плейлиста (body: videoId) */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const check = await ownedPlaylist(id, user.id);
  if ("error" in check)
    return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json().catch(() => ({}));
  const videoId = String(body.videoId || "");
  if (!videoId)
    return NextResponse.json({ error: "videoId обязателен" }, { status: 400 });

  await db
    .delete(playlistVideos)
    .where(
      and(
        eq(playlistVideos.playlistId, id),
        eq(playlistVideos.videoId, videoId),
      ),
    );

  return NextResponse.json({ ok: true });
}
