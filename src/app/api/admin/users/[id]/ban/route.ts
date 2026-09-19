import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, notifications } from "@/db/schema";
import { requireAdmin, adminForbidden } from "@/lib/auth";

/** POST /api/admin/users/:id/ban — заблокировать/разблокировать канал */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return adminForbidden();
  const { id } = await ctx.params;

  if (id === admin.id)
    return NextResponse.json(
      { error: "Нельзя заблокировать самого себя" },
      { status: 400 },
    );

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user)
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  if (user.role === "admin")
    return NextResponse.json(
      { error: "Нельзя заблокировать администратора" },
      { status: 400 },
    );

  const next = !user.isBanned;
  await db.update(users).set({ isBanned: next }).where(eq(users.id, id));

  if (next) {
    await db.insert(notifications).values({
      userId: id,
      text: "Ваш канал заблокирован модерацией Streamly. Загрузка видео и вход ограничены.",
      thumbnailUrl: null,
    });
  }

  return NextResponse.json({ ok: true, isBanned: next });
}
