import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export const AUTH_COOKIE = "auth_token";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "streamly-dev-secret-change-me",
);

export type SessionUser = Pick<
  User,
  | "id"
  | "email"
  | "handle"
  | "name"
  | "role"
  | "isBanned"
  | "isVerified"
  | "warningsCount"
  | "avatarUrl"
  | "bannerUrl"
  | "description"
  | "subscribersCount"
  | "notifyUploads"
  | "notifyReplies"
  | "createdAt"
>;

const SESSION_FIELDS = {
  id: users.id,
  email: users.email,
  handle: users.handle,
  name: users.name,
  role: users.role,
  isBanned: users.isBanned,
  isVerified: users.isVerified,
  warningsCount: users.warningsCount,
  avatarUrl: users.avatarUrl,
  bannerUrl: users.bannerUrl,
  description: users.description,
  subscribersCount: users.subscribersCount,
  notifyUploads: users.notifyUploads,
  notifyReplies: users.notifyReplies,
  createdAt: users.createdAt,
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Устанавливает HttpOnly-сессию.
 * Флаг Secure вычисляется по реальному протоколу запроса (x-forwarded-proto),
 * поэтому кука корректно сохраняется и на http://localhost, и за HTTPS-прокси.
 */
export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const h = await headers();
  const isHttps = h.get("x-forwarded-proto") === "https";
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Читает cookie auth_token, верифицирует JWT и возвращает пользователя из БД */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub;
    if (!userId) return null;
    const [user] = await db
      .select(SESSION_FIELDS)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) return null;
    // Заблокированные аккаунты не считаются авторизованными
    if (user.isBanned) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Возвращает сессию, только если это действующий администратор */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export function adminForbidden() {
  return Response.json(
    { error: "Доступно только администраторам" },
    { status: 403 },
  );
}

export function unauthorized() {
  return Response.json({ error: "Требуется авторизация" }, { status: 401 });
}

export function publicUser(u: SessionUser) {
  return {
    id: u.id,
    email: u.email,
    handle: u.handle,
    name: u.name,
    role: u.role,
    isVerified: u.isVerified,
    isBanned: u.isBanned,
    warningsCount: u.warningsCount,
    avatarUrl: u.avatarUrl,
    bannerUrl: u.bannerUrl,
    description: u.description,
    subscribersCount: u.subscribersCount,
    notifyUploads: u.notifyUploads,
    notifyReplies: u.notifyReplies,
    createdAt: u.createdAt,
  };
}
