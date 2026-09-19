"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  Play,
  X,
  LogOut,
  Settings,
  CircleUserRound,
  History,
  ShieldCheck,
} from "lucide-react";
import { useAuth, useSidebar, useTheme, useToast } from "./Providers";
import { Avatar } from "./Avatar";
import { timeAgo } from "@/lib/format";

interface NotificationItem {
  id: string;
  text: string;
  link: string | null;
  avatarUrl: string | null;
  thumbnailUrl: string | null;
  read: boolean;
  createdAt: string;
}

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const sidebar = useSidebar();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [open, setOpen] = useState<"none" | "bell" | "avatar">("none");
  const [notes, setNotes] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Закрытие выпадающих меню по клику вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen("none");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotes(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* noop */
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Автодополнение поиска с дебаунсом
  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?mode=suggest&q=${encodeURIComponent(value)}`,
        );
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setShowSuggest(true);
      } catch {
        /* noop */
      }
    }, 220);
  };

  const submitSearch = (e?: FormEvent, value?: string) => {
    e?.preventDefault();
    const q = (value ?? query).trim();
    if (!q) return;
    setShowSuggest(false);
    setMobileSearch(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "readAll" }),
    });
    setUnread(0);
    setNotes((n) => n.map((x) => ({ ...x, read: true })));
  };

  const searchForm = (mobile = false) => (
    <div className={`relative w-full ${mobile ? "" : "max-w-xl"}`}>
      <form onSubmit={submitSearch} className="flex w-full">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => suggestions.length && setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          placeholder="Поиск"
          className="h-10 w-full rounded-l-full border border-var bg-transparent px-4 text-sm outline-none placeholder:text-2 focus:border-[#3ea6ff]"
        />
        <button
          type="submit"
          aria-label="Искать"
          className="h-10 w-14 shrink-0 rounded-r-full border border-l-0 border-var bg-chip hoverable grid place-items-center"
        >
          <Search size={18} />
        </button>
      </form>
      {showSuggest && suggestions.length > 0 && (
        <div className="menu-pop absolute inset-x-0 top-11 z-50 overflow-hidden rounded-2xl border border-var bg-elev py-2 shadow-pop">
          {suggestions.map((s) => (
            <button
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                submitSearch(undefined, s);
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm hoverable"
            >
              <Search size={16} className="shrink-0 text-2" />
              <span className="truncate">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="bg-base fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 px-2 sm:gap-4 sm:px-4">
        {/* Левый блок */}
        <div className="flex items-center gap-1">
          <button
            onClick={sidebar.toggle}
            aria-label="Меню"
            className="hoverable grid h-10 w-10 place-items-center rounded-full"
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="flex items-center gap-1.5 px-1">
            <span className="grid h-7 w-9 place-items-center rounded-lg bg-[#ff0000]">
              <Play size={15} className="fill-white text-white" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight sm:inline">
              Streamly
            </span>
          </Link>
        </div>

        {/* Поиск (десктоп) */}
        <div className="hidden flex-1 justify-center px-4 md:flex">
          {searchForm()}
        </div>

        {/* Правый блок */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2" ref={menuRef}>
          <button
            onClick={() => setMobileSearch((v) => !v)}
            aria-label="Поиск"
            className="hoverable grid h-10 w-10 place-items-center rounded-full md:hidden"
          >
            {mobileSearch ? <X size={20} /> : <Search size={20} />}
          </button>

          <button
            onClick={toggle}
            aria-label="Переключить тему"
            className="hoverable grid h-10 w-10 place-items-center rounded-full"
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {user && (
            <Link
              href="/upload"
              aria-label="Загрузить видео"
              className="hoverable flex h-9 items-center gap-1.5 rounded-full bg-chip px-3.5 text-sm font-medium"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Создать</span>
            </Link>
          )}

          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setOpen(open === "bell" ? "none" : "bell");
                  if (open !== "bell") loadNotifications();
                }}
                aria-label="Уведомления"
                className="hoverable relative grid h-10 w-10 place-items-center rounded-full"
              >
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff0000] px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {open === "bell" && (
                <div className="menu-pop absolute right-0 top-12 z-50 w-[360px] max-w-[90vw] overflow-hidden rounded-2xl border border-var bg-elev shadow-pop">
                  <div className="flex items-center justify-between border-b border-var px-4 py-3">
                    <span className="font-medium">Уведомления</span>
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs font-medium text-[#3ea6ff] hover:underline"
                      >
                        Прочитать все
                      </button>
                    )}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {notes.length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-2">
                        Уведомлений пока нет
                      </p>
                    )}
                    {notes.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link || "#"}
                        onClick={() => setOpen("none")}
                        className={`flex gap-3 px-4 py-3 hoverable ${
                          n.read ? "" : "bg-secondary"
                        }`}
                      >
                        <Avatar
                          src={n.avatarUrl}
                          name={n.text.charAt(0)}
                          size={36}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13px] leading-snug">
                            {n.text}
                          </p>
                          <p className="mt-0.5 text-xs text-2">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                        {n.thumbnailUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={n.thumbnailUrl}
                            alt=""
                            className="h-10 w-[70px] shrink-0 rounded-md object-cover"
                          />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setOpen(open === "avatar" ? "none" : "avatar")}
                aria-label="Профиль"
                className="mx-1 rounded-full"
              >
                <Avatar src={user.avatarUrl} name={user.name} size={32} />
              </button>
              {open === "avatar" && (
                <div className="menu-pop absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-var bg-elev shadow-pop">
                  <div className="flex items-center gap-3 border-b border-var px-4 py-3">
                    <Avatar src={user.avatarUrl} name={user.name} size={40} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.name}</p>
                      <p className="truncate text-sm text-2">@{user.handle}</p>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      href={`/channel/${user.handle}`}
                      onClick={() => setOpen("none")}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hoverable"
                    >
                      <CircleUserRound size={18} /> Мой канал
                    </Link>
                    <Link
                      href="/profile?tab=history"
                      onClick={() => setOpen("none")}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hoverable"
                    >
                      <History size={18} /> История просмотров
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setOpen("none")}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hoverable"
                    >
                      <Settings size={18} /> Профиль и настройки
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setOpen("none")}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hoverable"
                      >
                        <ShieldCheck size={18} /> Админ-панель
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-var py-2">
                    <button
                      onClick={async () => {
                        setOpen("none");
                        await logout();
                        toast("Вы вышли из аккаунта");
                        router.push("/");
                        router.refresh();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hoverable"
                    >
                      <LogOut size={18} /> Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-2 rounded-full border border-var px-3.5 py-2 text-sm font-medium text-[#3ea6ff] hover:bg-[#3ea6ff]/10"
            >
              <CircleUserRound size={18} />
              <span className="hidden sm:inline">Войти</span>
            </Link>
          )}
        </div>
      </header>

      {/* Мобильная строка поиска */}
      {mobileSearch && (
        <div className="bg-base fixed inset-x-0 top-14 z-40 border-b border-var px-3 py-2 md:hidden">
          {searchForm(true)}
        </div>
      )}
    </>
  );
}
