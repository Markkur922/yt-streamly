import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { likes, videos, comments } from "@/db/schema";

/** Переключение лайка/дизлайка видео. Возвращает новые счётчики и реакцию. */
export async function reactToVideo(
  userId: string,
  videoId: string,
  value: 1 | -1,
) {
  const [existing] = await db
    .select()
    .from(likes)
    .where(
      and(
        eq(likes.userId, userId),
        eq(likes.videoId, videoId),
        isNull(likes.commentId),
      ),
    )
    .limit(1);

  let dLikes = 0;
  let dDislikes = 0;
  let myReaction = 0;

  if (!existing) {
    await db.insert(likes).values({ userId, videoId, value });
    if (value === 1) dLikes = 1;
    else dDislikes = 1;
    myReaction = value;
  } else if (existing.value === value) {
    await db.delete(likes).where(eq(likes.id, existing.id));
    if (value === 1) dLikes = -1;
    else dDislikes = -1;
    myReaction = 0;
  } else {
    await db.update(likes).set({ value }).where(eq(likes.id, existing.id));
    dLikes = value;
    dDislikes = -value;
    myReaction = value;
  }

  const [updated] = await db
    .update(videos)
    .set({
      likesCount: sql`greatest(0, ${videos.likesCount} + ${dLikes})`,
      dislikesCount: sql`greatest(0, ${videos.dislikesCount} + ${dDislikes})`,
    })
    .where(eq(videos.id, videoId))
    .returning({ likes: videos.likesCount, dislikes: videos.dislikesCount });

  return {
    likes: updated?.likes ?? 0,
    dislikes: updated?.dislikes ?? 0,
    myReaction,
  };
}

export async function getVideoReaction(userId: string, videoId: string) {
  const [row] = await db
    .select({ value: likes.value })
    .from(likes)
    .where(
      and(
        eq(likes.userId, userId),
        eq(likes.videoId, videoId),
        isNull(likes.commentId),
      ),
    )
    .limit(1);
  return row?.value ?? 0;
}

/** Лайк комментария */
export async function likeComment(userId: string, commentId: string) {
  const [existing] = await db
    .select()
    .from(likes)
    .where(
      and(
        eq(likes.userId, userId),
        eq(likes.commentId, commentId),
        isNull(likes.videoId),
      ),
    )
    .limit(1);

  let delta = 0;
  let liked = false;
  if (!existing) {
    await db.insert(likes).values({ userId, commentId, value: 1 });
    delta = 1;
    liked = true;
  } else {
    await db.delete(likes).where(eq(likes.id, existing.id));
    delta = -1;
    liked = false;
  }
  const [updated] = await db
    .update(comments)
    .set({ likesCount: sql`greatest(0, ${comments.likesCount} + ${delta})` })
    .where(eq(comments.id, commentId))
    .returning({ likes: comments.likesCount });
  return { likes: updated?.likes ?? 0, liked };
}
