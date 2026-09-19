import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

/** GET /api/notifications — последние уведомления + счётчик непрочитанных */
export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const [rows, unread] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(25),
    db
      .select({ n: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false))),
  ]);

  return NextResponse.json({
    items: rows.map((n) => ({
      id: n.id,
      text: n.text,
      link: n.link,
      avatarUrl: n.avatarUrl,
      thumbnailUrl: n.thumbnailUrl,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount: Number(unread[0]?.n ?? 0),
  });
}

/** POST /api/notifications — { action: "readAll" } пометить всё прочитанным */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "readAll") {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, user.id));
  }
  return NextResponse.json({ ok: true });
}
