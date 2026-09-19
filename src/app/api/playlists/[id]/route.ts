import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playlists, playlistVideos, videos, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { toCard } from "@/lib/video-queries";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/playlists/:id — плейлист с видео */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();

  const [row] = await db
    .select({
      playlist: playlists,
      owner: { id: users.id, handle: users.handle, name: users.name },
    })
    .from(playlists)
    .innerJoin(users, eq(playlists.ownerId, users.id))
    .where(eq(playlists.id, id))
    .limit(1);

  if (!row)
    return NextResponse.json({ error: "Плейлист не найден" }, { status: 404 });
  const isOwner = user?.id === row.playlist.ownerId;
  if (row.playlist.visibility === "private" && !isOwner)
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const vidRows = await db
    .select({
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
    .from(playlistVideos)
    .innerJoin(videos, eq(playlistVideos.videoId, videos.id))
    .innerJoin(users, eq(videos.authorId, users.id))
    .where(eq(playlistVideos.playlistId, id))
    .orderBy(asc(playlistVideos.position))
    .limit(200);

  const visible = isOwner
    ? vidRows
    : vidRows.filter((v) => v.video.visibility === "public");

  return NextResponse.json({
    playlist: {
      id: row.playlist.id,
      title: row.playlist.title,
      description: row.playlist.description,
      visibility: row.playlist.visibility,
      createdAt: row.playlist.createdAt.toISOString(),
      owner: row.owner,
      videosCount: vidRows.length,
      thumbnailUrl: visible[0]?.video.thumbnailUrl ?? null,
      videos: visible.map((v) => toCard(v.video, v.author)),
      isOwner,
    },
  });
}

/** PUT /api/playlists/:id — обновить (только владелец) */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, id))
    .limit(1);
  if (!playlist)
    return NextResponse.json({ error: "Плейлист не найден" }, { status: 404 });
  if (playlist.ownerId !== user.id)
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim())
    patch.title = body.title.trim().slice(0, 120);
  if (typeof body.description === "string")
    patch.description = body.description.slice(0, 1000);
  if (["public", "unlisted", "private"].includes(String(body.visibility)))
    patch.visibility = String(body.visibility);

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "Нет изменений" }, { status: 400 });

  const [updated] = await db
    .update(playlists)
    .set(patch)
    .where(eq(playlists.id, id))
    .returning();
  return NextResponse.json({ playlist: updated });
}

/** DELETE /api/playlists/:id — удалить (только владелец) */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [playlist] = await db
    .select({ ownerId: playlists.ownerId })
    .from(playlists)
    .where(eq(playlists.id, id))
    .limit(1);
  if (!playlist)
    return NextResponse.json({ error: "Плейлист не найден" }, { status: 404 });
  if (playlist.ownerId !== user.id)
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  await db.delete(playlists).where(eq(playlists.id, id));
  return NextResponse.json({ ok: true });
}
