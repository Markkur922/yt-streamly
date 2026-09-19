"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Play,
  Loader2,
  Mail,
  Lock,
  User,
  AtSign,
  ShieldCheck,
} from "lucide-react";
import { useAuth, useToast } from "@/components/Providers";

type Mode = "login" | "register" | "forgot";

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2S44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { user, login, register, googleLogin } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  // Уже авторизован? — на главную
  if (user) {
    router.replace("/");
    return null;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        await fetch("/api/auth/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setForgotSent(true);
        return;
      }
      if (mode === "login") {
        await login(email, password);
        toast(`С возвращением!`);
      } else {
        await register({ email, handle, name, password });
        toast("Аккаунт создан. Добро пожаловать!");
      }
      router.push("/");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Сетевая ошибка. Попробуйте ещё раз.";
      setError(msg);
      toast(msg);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError("");
    try {
      await googleLogin();
      toast("Вы вошли через Google");
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Сетевая ошибка";
      setError(msg);
      toast(msg);
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "field pl-10";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="grid h-9 w-12 place-items-center rounded-xl bg-[#ff0000]">
          <Play size={18} className="fill-white text-white" />
        </span>
        <span className="text-2xl font-bold tracking-tight">Streamly</span>
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-var bg-elev p-6 shadow-pop sm:p-8">
        {mode !== "forgot" ? (
          <>
            <div className="mb-6 grid grid-cols-2 rounded-full bg-chip p-1">
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`rounded-full py-2 text-sm font-medium transition-colors ${
                  mode === "login" ? "bg-elev shadow" : "text-2"
                }`}
              >
                Вход
              </button>
              <button
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={`rounded-full py-2 text-sm font-medium transition-colors ${
                  mode === "register" ? "bg-elev shadow" : "text-2"
                }`}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "register" && (
                <>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Имя канала"
                      required
                      maxLength={60}
                      className={inputCls}
                    />
                  </div>
                  <div className="relative">
                    <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2" />
                    <input
                      value={handle}
                      onChange={(e) =>
                        setHandle(e.target.value.replace(/[^a-z0-9_.-]/gi, ""))
                      }
                      placeholder="Имя пользователя (латиница)"
                      required
                      maxLength={30}
                      className={inputCls}
                    />
                  </div>
                </>
              )}
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className={inputCls}
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль (минимум 6 символов)"
                  required
                  minLength={6}
                  className={inputCls}
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ff0000] py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "Войти" : "Создать аккаунт"}
              </button>
            </form>

            {mode === "login" && (
              <button
                onClick={() => {
                  setMode("forgot");
                  setForgotSent(false);
                  setError("");
                }}
                className="mt-3 w-full text-center text-sm text-[#3ea6ff] hover:underline"
              >
                Забыли пароль?
              </button>
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-2">
              <div className="h-px flex-1 bg-[var(--border)]" />
              или
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <button
              onClick={google}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border border-var py-3 text-sm font-medium hoverable disabled:opacity-60"
            >
              <GoogleIcon />
              Продолжить через Google
            </button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-2">
              В демо-режиме авторизация Google эмулируется без внешних ключей
            </p>

            {mode === "register" && (
              <label className="mt-4 flex cursor-not-allowed items-center gap-2 text-xs text-2 opacity-60">
                <input type="checkbox" disabled className="accent-[#ff0000]" />
                <ShieldCheck size={14} />
                Двухфакторная аутентификация (скоро)
              </label>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Восстановление пароля</h1>
            <p className="mt-1 text-sm text-2">
              Укажите email аккаунта — мы отправим ссылку для сброса
            </p>
            {forgotSent ? (
              <div className="mt-5 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-500">
                Если аккаунт существует, письмо уже отправлено. Проверьте
                входящие (в демо-режиме письмо не рассылается).
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-3">
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ff0000] py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy && <Loader2 size={16} className="animate-spin" />}
                  Отправить ссылку
                </button>
              </form>
            )}
            <button
              onClick={() => setMode("login")}
              className="mt-4 w-full text-center text-sm text-[#3ea6ff] hover:underline"
            >
              ← Вернуться ко входу
            </button>
          </>
        )}
      </div>

      <Link href="/" className="mt-6 text-sm text-2 hover:text-base">
        ← На главную
      </Link>
    </div>
  );
}
