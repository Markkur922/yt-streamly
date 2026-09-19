"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CurrentUser {
  id: string;
  email: string;
  handle: string;
  name: string;
  role: "user" | "admin";
  isVerified: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  description: string;
  subscribersCount: number;
  notifyUploads: boolean;
  notifyReplies: boolean;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  handle: string;
  name: string;
  password: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  /** true, пока идёт первичная проверка сессии */
  isLoading: boolean;
  /** алиас для обратной совместимости */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function callApi(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Первичная загрузка: спрашиваем у сервера текущую сессию
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setUser(data.user ?? null);
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { res, data } = await callApi("/api/auth/login", { email, password });
    if (!res.ok) throw new Error(data.error || "Не удалось войти");
    setUser(data.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { res, data } = await callApi("/api/auth/register", input);
    if (!res.ok) throw new Error(data.error || "Не удалось зарегистрироваться");
    setUser(data.user);
  }, []);

  const googleLogin = useCallback(async () => {
    const { res, data } = await callApi("/api/auth/google", {});
    if (!res.ok) throw new Error(data.error || "Ошибка входа через Google");
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    loading: isLoading,
    login,
    register,
    googleLogin,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return ctx;
}
