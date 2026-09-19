import "server-only";
import type { Video, User } from "@/db/schema";
import type { VideoCardData } from "@/lib/types";

export type AuthorRow = Pick<
  User,
  "id" | "handle" | "name" | "avatarUrl" | "subscribersCount" | "isVerified"
>;

export function toCard(v: Video, a: AuthorRow): VideoCardData {
  return {
    id: v.id,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    videoUrl: v.videoUrl,
    durationSeconds: v.durationSeconds,
    views: v.views,
    likesCount: v.likesCount,
    dislikesCount: v.dislikesCount,
    commentsCount: v.commentsCount,
    category: v.category,
    tags: v.tags ?? [],
    visibility: v.visibility,
    description: v.description,
    qualities: v.qualities ?? [],
    createdAt: v.createdAt.toISOString(),
    author: {
      id: a.id,
      handle: a.handle,
      name: a.name,
      avatarUrl: a.avatarUrl,
      subscribersCount: a.subscribersCount,
      isVerified: a.isVerified,
    },
  };
}
