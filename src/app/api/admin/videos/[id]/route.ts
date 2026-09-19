import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { requireAdmin, adminForbidden } from "@/lib/auth";
import { deleteAsset } from "@/lib/storage";
import { CATEGORIES } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/admin/videos/:id — редактировать видео от имени модерации */
export async function PUT(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return adminForbidden();
  const { id } = await ctx.params;

  const [video] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  if (!video)
    return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 3 || t.length > 150)
      return NextResponse.json(
        { error: "Название: от 3 до 150 символов" },
        { status: 400 },
      );
    patch.title = t;
  }
  if (typeof body.description === "string")
    patch.description = body.description.slice(0, 5000);
  if (typeof body.category === "string") {
    if (!CATEGORIES.includes(body.category as never))
      return NextResponse.json({ error: "Неизвестная категория" }, { status: 400 });
    patch.category = body.category;
  }
  if (typeof body.visibility === "string") {
    if (!["public", "unlisted", "private"].includes(body.visibility))
      return NextResponse.json({ error: "Неизвестный тип доступа" }, { status: 400 });
    patch.visibility = body.visibility;
  }

  const [updated] = await db
    .update(videos)
    .set(patch)
    .where(eq(videos.id, id))
    .returning();

  return NextResponse.json({
    video: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      visibility: updated.visibility,
    },
  });
}

/** DELETE /api/admin/videos/:id — удалить видео и его локальные файлы */
export async function DELETE(_req: Request, ctx: Ctx) {
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

  await db.delete(videos).where(eq(videos.id, id));
  // Чистим ассеты: Cloudinary по public_id либо локальные файлы по URL
  await deleteAsset(video.videoPublicId, video.videoUrl, "video");
  await deleteAsset(video.thumbnailPublicId, video.thumbnailUrl, "image");

  return NextResponse.json({ ok: true });
}
