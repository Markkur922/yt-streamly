import { NextResponse } from "next/server";
import { asc, eq, inArray, sql, and } from "drizzle-orm";
import { db } from "@/db";
import {
  comments,
  users,
  videos,
  likes,
  notifications,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { CommentData } from "@/lib/types";

const COMMENT_AUTHOR = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  avatarUrl: users.avatarUrl,
};

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/videos/:id/comments — плоский список (дерево строит клиент) */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();

  const rows = await db
    .select({ comment: comments, author: COMMENT_AUTHOR })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.videoId, id))
    .orderBy(asc(comments.createdAt))
    .limit(500);

  let myReactions = new Map<string, number>();
  if (user && rows.length) {
    const ids = rows.map((r) => r.comment.id);
    const mine = await db
      .select({ commentId: likes.commentId, value: likes.value })
      .from(likes)
      .where(and(eq(likes.userId, user.id), inArray(likes.commentId, ids)));
    myReactions = new Map(
      mine.filter((m) => m.commentId).map((m) => [m.commentId as string, m.value]),
    );
  }

  const items: CommentData[] = rows.map((r) => ({
    id: r.comment.id,
    videoId: r.comment.videoId,
    parentId: r.comment.parentId,
    content: r.comment.content,
    likesCount: r.comment.likesCount,
    myReaction: myReactions.get(r.comment.id) ?? 0,
    createdAt: r.comment.createdAt.toISOString(),
    author: r.author,
  }));

  return NextResponse.json({ items, total: items.length });
}

/** POST /api/videos/:id/comments — добавить комментарий */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const rl = rateLimit(`comment:${user.id}`, 20, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "Слишком часто" }, { status: 429 });

  const [video] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  if (!video) return NextResponse.json({ error: "Видео не найдено" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = String(body.content || "").trim().slice(0, 2000);
  const parentId = body.parentId ? String(body.parentId) : null;
  if (!content)
    return NextResponse.json({ error: "Пустой комментарий" }, { status: 400 });

  let parentAuthorId: string | null = null;
  if (parentId) {
    const [parent] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, parentId), eq(comments.videoId, id)))
      .limit(1);
    if (!parent)
      return NextResponse.json({ error: "Родительский комментарий не найден" }, { status: 404 });
    parentAuthorId = parent.authorId;
  }

  const [created] = await db
    .insert(comments)
    .values({ videoId: id, authorId: user.id, parentId, content })
    .returning();

  await db
    .update(videos)
    .set({ commentsCount: sql`${videos.commentsCount} + 1` })
    .where(eq(videos.id, id));

  // Уведомления: автору видео и автору родительского комментария
  const noteRows: (typeof notifications.$inferInsert)[] = [];
  if (video.authorId !== user.id) {
    noteRows.push({
      userId: video.authorId,
      text: `${user.name} прокомментировал(а) ваше видео «${video.title}»`,
      link: `/watch/${video.id}`,
      avatarUrl: user.avatarUrl,
      thumbnailUrl: video.thumbnailUrl,
    });
  }
  if (parentAuthorId && parentAuthorId !== user.id && parentAuthorId !== video.authorId) {
    const [parentOwner] = await db
      .select({ notify: users.notifyReplies })
      .from(users)
      .where(eq(users.id, parentAuthorId))
      .limit(1);
    if (parentOwner?.notify)
      noteRows.push({
        userId: parentAuthorId,
        text: `${user.name} ответил(а) на ваш комментарий`,
        link: `/watch/${video.id}`,
        avatarUrl: user.avatarUrl,
        thumbnailUrl: video.thumbnailUrl,
      });
  }
  if (noteRows.length) await db.insert(notifications).values(noteRows);

  const item: CommentData = {
    id: created.id,
    videoId: created.videoId,
    parentId: created.parentId,
    content: created.content,
    likesCount: created.likesCount,
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
