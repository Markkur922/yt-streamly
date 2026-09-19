import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playlists, playlistVideos, videos, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import type { PlaylistData } from "@/lib/types";

/**
 * GET /api/playlists?mine=1&videoId=<id> — мои плейлисты (+ флаг containsVideo)
 * GET /api/playlists?channelId=<id> — публичные плейлисты канала
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";
  const channelId = url.searchParams.get("channelId") || "";
  const videoId = url.searchParams.get("videoId") || "";
  const user = await getSessionUser();

  if (mine && !user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const ownerFilter = mine
    ? eq(playlists.ownerId, user!.id)
    : channelId
      ? and(eq(playlists.ownerId, channelId), eq(playlists.visibility, "public"))
      : eq(playlists.visibility, "public");

  const rows = await db
    .select({
      playlist: playlists,
      owner: { id: users.id, handle: users.handle, name: users.name },
    })
    .from(playlists)
    .innerJoin(users, eq(playlists.ownerId, users.id))
    .where(ownerFilter)
    .orderBy(desc(playlists.createdAt))
    .limit(100);

  const items: PlaylistData[] = await Promise.all(
    rows.map(async ({ playlist, owner }) => {
      const vids = await db
        .select({
          id: videos.id,
          thumbnailUrl: videos.thumbnailUrl,
          visibility: videos.visibility,
        })
        .from(playlistVideos)
        .innerJoin(videos, eq(playlistVideos.videoId, videos.id))
        .where(eq(playlistVideos.playlistId, playlist.id))
        .orderBy(asc(playlistVideos.position));
      const firstPublic = vids.find((v) => v.visibility === "public");
      return {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        visibility: playlist.visibility,
        createdAt: playlist.createdAt.toISOString(),
        owner,
        videosCount: vids.length,
        thumbnailUrl: firstPublic?.thumbnailUrl ?? null,
        containsVideo: videoId ? vids.some((v) => v.id === videoId) : undefined,
      };
    }),
  );

  return NextResponse.json({ items });
}

/** POST /api/playlists — создать плейлист */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim().slice(0, 120) || "Новый плейлист";
  const description = String(body.description || "").slice(0, 1000);
  const visibility = ["public", "unlisted", "private"].includes(String(body.visibility))
    ? String(body.visibility)
    : "private";

  const [created] = await db
    .insert(playlists)
    .values({ ownerId: user.id, title, description, visibility })
    .returning();

  return NextResponse.json({ playlist: created }, { status: 201 });
}
