import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, videos, users, notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { CommentData } from "@/lib/types";

/** POST /api/comments/:id/reply — ответить на комментарий */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const rl = rateLimit(`comment:${user.id}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Слишком часто" }, { status: 429 });

  const [parent] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  if (!parent)
    return NextResponse.json({ error: "Комментарий не найден" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = String(body.content || "").trim().slice(0, 2000);
  if (!content)
    return NextResponse.json({ error: "Пустой комментарий" }, { status: 400 });

  // Ответ всегда привязывается к корневому комментарию (один уровень вложенности, как на YouTube)
  const rootParentId = parent.parentId ?? parent.id;

  const [created] = await db
    .insert(comments)
    .values({
      videoId: parent.videoId,
      authorId: user.id,
      parentId: rootParentId,
      content,
    })
    .returning();

  await db
    .update(videos)
    .set({ commentsCount: sql`${videos.commentsCount} + 1` })
    .where(eq(videos.id, parent.videoId));

  if (parent.authorId !== user.id) {
    const [video] = await db
      .select({ title: videos.title, thumbnailUrl: videos.thumbnailUrl })
      .from(videos)
      .where(eq(videos.id, parent.videoId))
      .limit(1);
    const [owner] = await db
      .select({ notify: users.notifyReplies })
      .from(users)
      .where(eq(users.id, parent.authorId))
      .limit(1);
    if (owner?.notify)
      await db.insert(notifications).values({
        userId: parent.authorId,
        text: `${user.name} ответил(а) на ваш комментарий${video ? ` к видео «${video.title}»` : ""}`,
        link: `/watch/${parent.videoId}`,
        avatarUrl: user.avatarUrl,
        thumbnailUrl: video?.thumbnailUrl ?? null,
      });
  }

  const item: CommentData = {
    id: created.id,
    videoId: created.videoId,
    parentId: created.parentId,
    content: created.content,
    likesCount: 0,
    myReaction: 0,
    createdAt: created.createdAt.toISOString(),
    author: {
      id: user.id,
      handle: user.handle,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  };
  return NextResponse.json({ comment: item }, { status: 201 });
}
