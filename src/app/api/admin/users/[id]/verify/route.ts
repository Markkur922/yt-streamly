import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, notifications } from "@/db/schema";
import { requireAdmin, adminForbidden } from "@/lib/auth";

/** POST /api/admin/users/:id/verify — выдать/снять галочку верификации */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return adminForbidden();
  const { id } = await ctx.params;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user)
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const next = !user.isVerified;
  await db.update(users).set({ isVerified: next }).where(eq(users.id, id));

  if (next) {
    await db.insert(notifications).values({
      userId: id,
      text: "Поздравляем! Ваш канал получил галочку верификации.",
      link: `/channel/${user.handle}`,
      avatarUrl: user.avatarUrl,
    });
  }

  return NextResponse.json({ ok: true, isVerified: next });
}
