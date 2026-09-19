import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

/** POST /api/users/:id/subscribe — подписаться / отписаться (переключатель) */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  if (user.id === id)
    return NextResponse.json(
      { error: "Нельзя подписаться на себя" },
      { status: 400 },
    );

  const [channel] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!channel)
    return NextResponse.json({ error: "Канал не найден" }, { status: 404 });

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.subscriberId, user.id),
        eq(subscriptions.channelId, id),
      ),
    )
    .limit(1);

  let subscribed: boolean;
  if (existing) {
    await db.delete(subscriptions).where(eq(subscriptions.id, existing.id));
    subscribed = false;
  } else {
    await db.insert(subscriptions).values({
      subscriberId: user.id,
      channelId: id,
    });
    subscribed = true;
  }

  const [updated] = await db
    .update(users)
    .set({
      subscribersCount: sql`greatest(0, ${users.subscribersCount} + ${subscribed ? 1 : -1})`,
    })
    .where(eq(users.id, id))
    .returning({ count: users.subscribersCount });

  return NextResponse.json({
    subscribed,
    subscribersCount: updated?.count ?? 0,
  });
}
