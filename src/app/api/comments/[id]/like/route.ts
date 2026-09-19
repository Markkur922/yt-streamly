import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { likeComment } from "@/lib/reactions";

/** POST /api/comments/:id/like — лайк комментария (переключаемый) */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [comment] = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  if (!comment)
    return NextResponse.json({ error: "Комментарий не найден" }, { status: 404 });

  const result = await likeComment(user.id, id);
  return NextResponse.json(result);
}
