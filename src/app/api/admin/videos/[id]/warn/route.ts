import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos, users, notifications } from "@/db/schema";
import { requireAdmin, adminForbidden } from "@/lib/auth";

/** POST /api/admin/videos/:id/warn — предупреждение каналу-автору видео */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return adminForbidden();
  const { id } = await ctx.params;

  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  if (!video)
    return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });

  const [updated] = await db
    .update(users)
    .set({ warningsCount: sql`${users.warningsCount} + 1` })
    .where(eq(users.id, video.authorId))
    .returning({ warningsCount: users.warningsCount, name: users.name });

  // Уведомляем автора о предупреждении
  await db.insert(notifications).values({
    userId: video.authorId,
    text: `Модерация выдала предупреждение за видео «${video.title}». Всего предупреждений: ${updated?.warningsCount ?? 1}.`,
    link: `/watch/${video.id}`,
    thumbnailUrl: video.thumbnailUrl,
  });

  return NextResponse.json({
    ok: true,
    warningsCount: updated?.warningsCount ?? 1,
  });
}
