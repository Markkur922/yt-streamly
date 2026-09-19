import { NextResponse } from "next/server";
import { desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, adminForbidden } from "@/lib/auth";

/** GET /api/admin/users?search= — все пользователи/каналы (только админ) */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return adminForbidden();

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim().slice(0, 120);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      handle: users.handle,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isBanned: users.isBanned,
      isVerified: users.isVerified,
      warningsCount: users.warningsCount,
      subscribersCount: users.subscribersCount,
      description: users.description,
      createdAt: users.createdAt,
      videosCount: sql<number>`(select count(*)::int from videos where videos.author_id = ${users.id})`,
    })
    .from(users)
    .where(
      search
        ? or(
            ilike(users.name, `%${search}%`),
            ilike(users.handle, `%${search}%`),
            ilike(users.email, `%${search}%`),
          )
        : undefined,
    )
    .orderBy(desc(users.createdAt))
    .limit(200);

  return NextResponse.json({
    items: rows.map((u) => ({
      ...u,
      videosCount: Number(u.videosCount),
      createdAt: u.createdAt.toISOString(),
    })),
    total: rows.length,
  });
}
