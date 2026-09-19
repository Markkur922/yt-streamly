import { NextResponse } from "next/server";
import { getSessionUser, publicUser } from "@/lib/auth";

/**
 * GET /api/auth/me — текущий пользователь по JWT из cookie auth_token.
 * 401 — если сессии нет или она недействительна.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { error: "Не авторизован", user: null },
      { status: 401 },
    );
  return NextResponse.json({ user: publicUser(user) });
}
