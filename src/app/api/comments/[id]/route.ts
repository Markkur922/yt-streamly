import { NextResponse } from "next/server";
import { eq, sql, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { comments, videos } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/comments/:id — редактировать (только автор) */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [comment] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  if (!comment)
    return NextResponse.json({ error: "Комментарий не найден" }, { status: 404 });
  if (comment.authorId !== user.id)
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const content = String(body.content || "").trim().slice(0, 2000);
  if (!content)
    return NextResponse.json({ error: "Пустой комментарий" }, { status: 400 });

  const [updated] = await db
    .update(comments)
    .set({ content })
    .where(eq(comments.id, id))
    .returning();
  return NextResponse.json({ comment: updated });
}

/** DELETE /api/comments/:id — удалить (автор комментария или автор видео) */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [comment] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  if (!comment)
    return NextResponse.json({ error: "Комментарий не найден" }, { status: 404 });

  const [video] = await db
    .select({ authorId: videos.authorId })
    .from(videos)
    .where(eq(videos.id, comment.videoId))
    .limit(1);

  if (comment.authorId !== user.id && video?.authorId !== user.id)
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  // Считаем, сколько будет удалено (комментарий + вложенные ответы)
  const children = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.parentId, id));
  const removed = 1 + children.length;

  const idsToDelete = [id, ...children.map((c) => c.id)];
  await db.delete(comments).where(inArray(comments.id, idsToDelete));
  await db
    .update(videos)
    .set({
      commentsCount: sql`greatest(0, ${videos.commentsCount} - ${removed})`,
    })
    .where(and(eq(videos.id, comment.videoId)));

  return NextResponse.json({ ok: true, removed });
}
