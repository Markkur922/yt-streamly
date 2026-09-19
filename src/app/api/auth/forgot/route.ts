import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Восстановление пароля (демо): в продакшене здесь генерируется токен
 * и отправляется письмо через SMTP/SendGrid. Отвечаем одинаково,
 * чтобы не раскрывать существование аккаунта.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const rl = rateLimit(`forgot:${ip}`, 5, 300_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 },
    );
  await req.json().catch(() => null);
  return NextResponse.json({
    ok: true,
    message: "Если аккаунт существует, письмо со ссылкой для сброса отправлено.",
  });
}
