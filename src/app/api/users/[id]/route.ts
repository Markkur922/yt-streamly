import { NextResponse } from "next/server";
import { and, eq, or, sql, count } from "drizzle-orm";
import { db } from "@/db";
import { users, videos, subscriptions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import type { ChannelData } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function findUser(idOrHandle: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrHandle,
    );
  const [u] = await db
    .select()
    .from(users)
    .where(
      isUuid
        ? or(eq(users.id, idOrHandle), eq(users.handle, idOrHandle))
        : eq(users.handle, idOrHandle),
    )
    .limit(1);
  return u ?? null;
}

/** GET /api/users/:id — публичный профиль канала (id или handle) */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  const channel = await findUser(decodeURIComponent(id));
  if (!channel)
    return NextResponse.json({ error: "Канал не найден" }, { status: 404 });

  const [stats] = await db
    .select({
      videosCount: count(videos.id),
      totalViews: sql<number>`coalesce(sum(${videos.views}), 0)`,
    })
    .from(videos)
    .where(
      and(eq(videos.authorId, channel.id), eq(videos.visibility, "public")),
    );

  let isSubscribed = false;
  if (user && user.id !== channel.id) {
    const [sub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.subscriberId, user.id),
          eq(subscriptions.channelId, channel.id),
        ),
      )
      .limit(1);
    isSubscribed = !!sub;
  }
  if (user?.id === channel.id) isSubscribed = true;

  const data: ChannelData = {
    id: channel.id,
    handle: channel.handle,
    name: channel.name,
    avatarUrl: channel.avatarUrl,
    bannerUrl: channel.bannerUrl,
    description: channel.description,
    isVerified: channel.isVerified,
    subscribersCount: channel.subscribersCount,
    videosCount: Number(stats?.videosCount ?? 0),
    totalViews: Number(stats?.totalViews ?? 0),
    createdAt: channel.createdAt.toISOString(),
    isSubscribed,
  };
  return NextResponse.json({ channel: data });
}

/** PUT /api/users/:id — обновить профиль (только свой) */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  if (user.id !== id)
    return NextResponse.json({ error: "Можно редактировать только свой профиль" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n.length < 2 || n.length > 60)
      return NextResponse.json({ error: "Имя: от 2 до 60 символов" }, { status: 400 });
    patch.name = n;
  }
  if (typeof body.description === "string")
    patch.description = body.description.slice(0, 1000);
  if (typeof body.avatarUrl === "string" || body.avatarUrl === null)
    patch.avatarUrl = body.avatarUrl;
  if (typeof body.bannerUrl === "string" || body.bannerUrl === null)
    patch.bannerUrl = body.bannerUrl;
  if (typeof body.notifyUploads === "boolean") patch.notifyUploads = body.notifyUploads;
  if (typeof body.notifyReplies === "boolean") patch.notifyReplies = body.notifyReplies;

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "Нет изменений" }, { status: 400 });

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning();

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      handle: updated.handle,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      description: updated.description,
      subscribersCount: updated.subscribersCount,
      notifyUploads: updated.notifyUploads,
      notifyReplies: updated.notifyReplies,
      createdAt: updated.createdAt,
    },
  });
}
