import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, playlists } from "@/db/schema";
import { hashPassword, setSessionCookie, publicUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_RE = /^[a-z0-9_.-]{3,30}$/i;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rl = rateLimit(`register:${ip}`, 10, 60_000);
    if (!rl.ok)
      return NextResponse.json(
        { error: "Слишком много попыток. Попробуйте через минуту." },
        { status: 429 },
      );

    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Некорректный запрос" },
        { status: 400 },
      );
    }
    const email = String(body.email || "").trim().toLowerCase();
    const handle = String(body.handle || "")
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");

    if (!EMAIL_RE.test(email))
      return NextResponse.json(
        { error: "Некорректный email" },
        { status: 400 },
      );
    if (!HANDLE_RE.test(handle))
      return NextResponse.json(
        { error: "Имя пользователя: 3–30 символов, латиница, цифры, _ . -" },
        { status: 400 },
      );
    if (name.length < 2 || name.length > 60)
      return NextResponse.json(
        { error: "Имя должно быть от 2 до 60 символов" },
        { status: 400 },
      );
    if (password.length < 6)
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 },
      );

    const [byEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (byEmail)
      return NextResponse.json(
        { error: "Этот email уже занят. Попробуйте войти." },
        { status: 409 },
      );

    const [byHandle] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.handle, handle))
      .limit(1);
    if (byHandle)
      return NextResponse.json(
        { error: "Это имя пользователя уже занято" },
        { status: 409 },
      );

    const hash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        email,
        handle,
        name,
        password: hash,
        avatarUrl: `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(handle)}&backgroundColor=b6e3f4`,
      })
      .returning();

    await db.insert(playlists).values({
      ownerId: user.id,
      title: "Смотреть позже",
      visibility: "private",
    });

    await setSessionCookie(user.id);
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (e) {
    console.error("[register] Ошибка:", e);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера. Попробуйте позже." },
      { status: 500 },
    );
  }
}
