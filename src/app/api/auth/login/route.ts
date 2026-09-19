import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, setSessionCookie, publicUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rl = rateLimit(`login:${ip}`, 10, 60_000);
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
    const password = String(body.password || "");
    if (!email || !password)
      return NextResponse.json(
        { error: "Введите email и пароль" },
        { status: 400 },
      );

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user)
      return NextResponse.json(
        { error: "Пользователь с таким email не найден" },
        { status: 401 },
      );

    if (user.isBanned)
      return NextResponse.json(
        {
          error:
            "Этот аккаунт заблокирован. Если вы считаете это ошибкой, свяжитесь с поддержкой.",
        },
        { status: 403 },
      );

    const ok = await verifyPassword(password, user.password);
    if (!ok)
      return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });

    await setSessionCookie(user.id);
    return NextResponse.json({ user: publicUser(user) });
  } catch (e) {
    console.error("[login] Ошибка:", e);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера. Попробуйте позже." },
      { status: 500 },
    );
  }
}
