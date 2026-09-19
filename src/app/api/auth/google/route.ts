import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, playlists } from "@/db/schema";
import { hashPassword, setSessionCookie, publicUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

/**
 * Демо-режим Google OAuth 2.0.
 * В продакшене здесь выполняется обмен authorization code на токены Google
 * (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET из .env) — см. README.
 * Для демо создаём/используем учётную запись google.demo@streamly.app.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = rateLimit(`google:${ip}`, 15, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "Слишком много попыток" },
      { status: 429 },
    );

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "google.demo@streamly.app").toLowerCase();
  const name = String(body?.name || "Google Пользователь");

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user?.isBanned)
    return NextResponse.json(
      { error: "Этот аккаунт заблокирован." },
      { status: 403 },
    );
  if (!user) {
    const handle =
      "g" + crypto.randomBytes(5).toString("hex");
    [user] = await db
      .insert(users)
      .values({
        email,
        handle,
        name,
        password: await hashPassword(crypto.randomBytes(16).toString("hex")),
        avatarUrl: `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(email)}&backgroundColor=ffd5dc`,
      })
      .returning();
    await db.insert(playlists).values({
      ownerId: user.id,
      title: "Смотреть позже",
      visibility: "private",
    });
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ user: publicUser(user) });
}
