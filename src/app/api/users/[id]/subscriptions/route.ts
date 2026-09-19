import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, subscriptions, videos } from "@/db/schema";

/** GET /api/users/:id/subscriptions — каналы, на которые подписан пользователь */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const rows = await db
    .select({
      id: users.id,
      handle: users.handle,
      name: users.name,
      avatarUrl: users.avatarUrl,
      subscribersCount: users.subscribersCount,
      since: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.channelId, users.id))
    .where(eq(subscriptions.subscriberId, id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(100);

  // Добавляем количество видео каждого канала
  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [c] = await db
        .select({ n: sql<number>`count(*)` })
        .from(videos)
        .where(eq(videos.authorId, r.id));
      return { ...r, videosCount: Number(c?.n ?? 0) };
    }),
  );

  return NextResponse.json({ items: enriched });
}
