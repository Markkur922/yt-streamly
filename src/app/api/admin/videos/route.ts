import { NextResponse } from "next/server";
import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { videos, users } from "@/db/schema";
import { requireAdmin, adminForbidden } from "@/lib/auth";

/** GET /api/admin/videos?search= — все видео платформы (только админ) */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return adminForbidden();

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim().slice(0, 120);

  const conditions = search
    ? or(
        ilike(videos.title, `%${search}%`),
        ilike(videos.description, `%${search}%`),
        ilike(users.name, `%${search}%`),
        ilike(users.handle, `%${search}%`),
      )
    : undefined;

  const rows = await db
    .select({
      video: videos,
      author: {
        id: users.id,
        handle: users.handle,
        name: users.name,
        avatarUrl: users.avatarUrl,
        isVerified: users.isVerified,
        isBanned: users.isBanned,
        warningsCount: users.warningsCount,
      },
    })
    .from(videos)
    .innerJoin(users, eq(videos.authorId, users.id))
    .where(conditions)
    .orderBy(desc(videos.createdAt))
    .limit(200);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.video.id,
      title: r.video.title,
      description: r.video.description,
      category: r.video.category,
      visibility: r.video.visibility,
      thumbnailUrl: r.video.thumbnailUrl,
      videoUrl: r.video.videoUrl,
      durationSeconds: r.video.durationSeconds,
      views: r.video.views,
      likesCount: r.video.likesCount,
      createdAt: r.video.createdAt.toISOString(),
      author: r.author,
    })),
    total: rows.length,
  });
}
