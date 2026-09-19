import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, adminForbidden } from "@/lib/auth";

/** PUT /api/admin/users/:id — редактировать профиль любого канала */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return adminForbidden();
  const { id } = await ctx.params;

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user)
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n.length < 2 || n.length > 60)
      return NextResponse.json(
        { error: "Имя: от 2 до 60 символов" },
        { status: 400 },
      );
    patch.name = n;
  }
  if (typeof body.description === "string")
    patch.description = body.description.slice(0, 1000);
  if (typeof body.role === "string" && ["user", "admin"].includes(body.role)) {
    if (id === admin.id && body.role !== "admin")
      return NextResponse.json(
        { error: "Нельзя снять права администратора с себя" },
        { status: 400 },
      );
    patch.role = body.role;
  }

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "Нет изменений" }, { status: 400 });

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      description: users.description,
      role: users.role,
    });

  return NextResponse.json({ user: updated });
}
