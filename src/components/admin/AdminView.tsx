"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Clapperboard,
  Users,
  Search,
  Pencil,
  Trash2,
  TriangleAlert,
  CheckCircle2,
  Ban,
  X,
  Loader2,
  Globe,
  Link2,
  Lock,
  BadgeCheck,
} from "lucide-react";
import { useToast } from "@/components/Providers";
import { Avatar } from "@/components/Avatar";
import { CATEGORIES } from "@/lib/constants";
import { formatViews, formatDuration, formatDateRu, timeAgo } from "@/lib/format";

/* --------------------------------- Типы --------------------------------- */
interface AdminVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  durationSeconds: number;
  views: number;
  likesCount: number;
  createdAt: string;
  author: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
    isVerified: boolean;
    isBanned: boolean;
    warningsCount: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  isBanned: boolean;
  isVerified: boolean;
  warningsCount: number;
  subscribersCount: number;
  videosCount: number;
  description: string;
  createdAt: string;
}

type Tab = "videos" | "users";

/* ------------------------------ Модальные окна --------------------------- */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="menu-pop w-full max-w-lg rounded-2xl border border-var bg-elev p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-full p-1.5 hoverable"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        value ? "bg-[#3ea6ff]" : "bg-chip"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          value ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

const VIS_META: Record<string, { label: string; icon: React.ReactNode }> = {
  public: { label: "Публичное", icon: <Globe size={13} /> },
  unlisted: { label: "По ссылке", icon: <Link2 size={13} /> },
  private: { label: "Приватное", icon: <Lock size={13} /> },
};

/* ================================ Главный вид ============================= */
export function AdminView({ adminName }: { adminName: string }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("videos");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");

  const onSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(v), 300);
  };

  useEffect(() => setQuery(""), [tab]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Шапка */}
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ff0000]">
          <ShieldCheck size={24} className="text-white" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Streamly Admin Studio
          </h1>
          <p className="text-sm text-2">
            Вы вошли как администратор · {adminName}
          </p>
        </div>
      </div>

      {/* Вкладки */}
      <div className="mt-6 flex items-center gap-1 overflow-x-auto border-b border-var">
        <button
          onClick={() => setTab("videos")}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "videos" ? "" : "text-2 hover:text-base"
          }`}
        >
          <Clapperboard size={17} /> Модерация видео
          {tab === "videos" && (
            <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[var(--text)]" />
          )}
        </button>
        <button
          onClick={() => setTab("users")}
          className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "users" ? "" : "text-2 hover:text-base"
          }`}
        >
          <Users size={17} /> Пользователи и каналы
          {tab === "users" && (
            <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[var(--text)]" />
          )}
        </button>

        <div className="relative ml-auto hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-2" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={tab === "videos" ? "Поиск видео…" : "Поиск пользователей…"}
            className="h-9 w-56 rounded-full border border-var bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-2 focus:border-[#3ea6ff]"
          />
        </div>
      </div>

      {/* Мобильный поиск */}
      <div className="relative mt-3 sm:hidden">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-2" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Поиск…"
          className="h-9 w-full rounded-full border border-var bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-2 focus:border-[#3ea6ff]"
        />
      </div>

      {tab === "videos" ? (
        <VideosModeration query={query} toast={toast} />
      ) : (
        <UsersManagement query={query} toast={toast} />
      )}
    </div>
  );
}

/* ============================ Модерация видео ============================ */
function VideosModeration({
  query,
  toast,
}: {
  query: string;
  toast: (t: string) => void;
}) {
  const [items, setItems] = useState<AdminVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminVideo | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "", category: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/videos?search=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (res.ok) setItems(data.items ?? []);
      else toast(data.error || "Ошибка загрузки");
    } catch {
      toast("Сетевая ошибка");
    } finally {
      setLoading(false);
    }
  }, [query, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (v: AdminVideo) => {
    setEditing(v);
    setDraft({ title: v.title, description: v.description, category: v.category });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const res = await fetch(`/api/admin/videos/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) =>
          prev.map((v) =>
            v.id === editing.id ? { ...v, ...data.video } : v,
          ),
        );
        setEditing(null);
        toast("Видео обновлено");
      } else toast(data.error || "Не удалось сохранить");
    } catch {
      toast("Сетевая ошибка");
    } finally {
      setBusyId(null);
    }
  };

  const warn = async (v: AdminVideo) => {
    if (!confirm(`Выдать предупреждение каналу «${v.author.name}»?`)) return;
    setBusyId(v.id);
    try {
      const res = await fetch(`/api/admin/videos/${v.id}/warn`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === v.id
              ? { ...x, author: { ...x.author, warningsCount: data.warningsCount } }
              : x,
          ),
        );
        toast(`Предупреждение выдано. Всего у канала: ${data.warningsCount}`);
      } else toast(data.error || "Не удалось выдать предупреждение");
    } catch {
      toast("Сетевая ошибка");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (v: AdminVideo) => {
    if (!confirm(`Удалить видео «${v.title}» и его файлы?`)) return;
    setBusyId(v.id);
    try {
      const res = await fetch(`/api/admin/videos/${v.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems((prev) => prev.filter((x) => x.id !== v.id));
        toast("Видео удалено");
      } else toast(data.error || "Не удалось удалить");
    } catch {
      toast("Сетевая ошибка");
    } finally {
      setBusyId(null);
    }
  };

  if (loading)
    return (
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-2xl bg-secondary p-3">
            <div className="skeleton h-20 w-36 rounded-lg" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );

  if (items.length === 0)
    return (
      <div className="mt-6 rounded-2xl bg-secondary py-16 text-center">
        <Clapperboard size={40} className="mx-auto text-2" />
        <p className="mt-3 font-medium">Видео не найдены</p>
        <p className="mt-1 text-sm text-2">Измените поисковый запрос</p>
      </div>
    );

  return (
    <>
      <p className="mt-4 text-sm text-2">Всего: {items.length}</p>
      <div className="mt-2 space-y-3">
        {items.map((v) => (
          <div
            key={v.id}
            className="flex flex-col gap-3 rounded-2xl bg-secondary p-3 sm:flex-row sm:items-center"
          >
            <Link
              href={`/watch/${v.id}`}
              className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-chip sm:w-40"
            >
              {v.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-2">
                  <Clapperboard size={20} />
                </div>
              )}
              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] text-white">
                {formatDuration(v.durationSeconds)}
              </span>
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/watch/${v.id}`}
                className="line-clamp-1 font-medium hover:underline"
              >
                {v.title}
              </Link>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-2">
                <Link
                  href={`/channel/${v.author.handle}`}
                  className="flex items-center gap-1 hover:text-base"
                >
                  {v.author.name}
                  {v.author.isVerified && (
                    <BadgeCheck size={13} className="text-[#3ea6ff]" />
                  )}
                </Link>
                <span className="rounded bg-chip px-1.5 py-0.5">{v.category}</span>
                <span className="flex items-center gap-1">
                  {VIS_META[v.visibility]?.icon} {VIS_META[v.visibility]?.label}
                </span>
                <span>{formatViews(v.views)}</span>
                <span>{timeAgo(v.createdAt)}</span>
              </p>
              {v.author.warningsCount > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-500">
                  <TriangleAlert size={12} />
                  Предупреждений у канала: {v.author.warningsCount}
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => startEdit(v)}
                disabled={busyId === v.id}
                className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-xs font-medium hoverable disabled:opacity-50"
              >
                <Pencil size={13} /> Изменить
              </button>
              <button
                onClick={() => warn(v)}
                disabled={busyId === v.id}
                className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-xs font-medium text-amber-500 hoverable disabled:opacity-50"
              >
                <TriangleAlert size={13} /> Предупреждение
              </button>
              <button
                onClick={() => remove(v)}
                disabled={busyId === v.id}
                className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-xs font-medium text-red-500 hoverable disabled:opacity-50"
              >
                {busyId === v.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Редактирование видео */}
      {editing && (
        <Modal title="Редактировать видео" onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Название</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={150}
                className="field text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Описание</label>
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={4}
                className="field resize-y text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Категория</label>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="field bg-base text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditing(null)}
                className="rounded-full px-4 py-2 text-sm hoverable"
              >
                Отмена
              </button>
              <button
                onClick={saveEdit}
                disabled={busyId === editing.id || draft.title.trim().length < 3}
                className="flex items-center gap-2 rounded-full bg-[#3ea6ff] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {busyId === editing.id && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Сохранить
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ========================== Управление каналами ========================== */
function UsersManagement({
  query,
  toast,
}: {
  query: string;
  toast: (t: string) => void;
}) {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (res.ok) setItems(data.items ?? []);
      else toast(data.error || "Ошибка загрузки");
    } catch {
      toast("Сетевая ошибка");
    } finally {
      setLoading(false);
    }
  }, [query, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleVerify = async (u: AdminUser) => {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/verify`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) =>
          prev.map((x) => (x.id === u.id ? { ...x, isVerified: data.isVerified } : x)),
        );
        toast(
          data.isVerified
            ? `Канал «${u.name}» верифицирован`
            : `С канала «${u.name}» снята верификация`,
        );
      } else toast(data.error || "Ошибка");
    } catch {
      toast("Сетевая ошибка");
    } finally {
      setBusyId(null);
    }
  };

  const toggleBan = async (u: AdminUser) => {
    if (
      !confirm(
        u.isBanned
          ? `Разблокировать канал «${u.name}»?`
          : `Заблокировать канал «${u.name}»? Пользователь не сможет входить и загружать видео.`,
      )
    )
      return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/ban`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) =>
          prev.map((x) => (x.id === u.id ? { ...x, isBanned: data.isBanned } : x)),
        );
        toast(data.isBanned ? `Канал «${u.name}» заблокирован` : `Канал «${u.name}» разблокирован`);
      } else toast(data.error || "Ошибка");
    } catch {
      toast("Сетевая ошибка");
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === editing.id
              ? { ...x, name: data.user.name, description: data.user.description }
              : x,
          ),
        );
        setEditing(null);
        toast("Профиль обновлён");
      } else toast(data.error || "Не удалось сохранить");
    } catch {
      toast("Сетевая ошибка");
    } finally {
      setBusyId(null);
    }
  };

  if (loading)
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-secondary p-4">
            <div className="skeleton h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-48 rounded" />
              <div className="skeleton h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>
    );

  if (items.length === 0)
    return (
      <div className="mt-6 rounded-2xl bg-secondary py-16 text-center">
        <Users size={40} className="mx-auto text-2" />
        <p className="mt-3 font-medium">Пользователи не найдены</p>
      </div>
    );

  return (
    <>
      <p className="mt-4 text-sm text-2">Всего: {items.length}</p>
      <div className="mt-2 space-y-3">
        {items.map((u) => (
          <div
            key={u.id}
            className={`rounded-2xl bg-secondary p-4 ${u.isBanned ? "opacity-70" : ""}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Link href={`/channel/${u.handle}`} className="shrink-0">
                  <Avatar src={u.avatarUrl} name={u.name} size={56} />
                </Link>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5">
                    <Link
                      href={`/channel/${u.handle}`}
                      className="truncate font-semibold hover:underline"
                    >
                      {u.name}
                    </Link>
                    {u.isVerified && <BadgeCheck size={16} className="shrink-0 text-[#3ea6ff]" />}
                    {u.role === "admin" && (
                      <span className="flex shrink-0 items-center gap-1 rounded bg-[#ff0000]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#ff0000]">
                        <ShieldCheck size={11} /> админ
                      </span>
                    )}
                    {u.isBanned && (
                      <span className="flex shrink-0 items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">
                        <Ban size={11} /> заблокирован
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-2">
                    @{u.handle} · {u.email}
                  </p>
                  <p className="mt-0.5 text-xs text-2">
                    {u.videosCount} видео · {u.subscribersCount} подписчиков · с{" "}
                    {formatDateRu(u.createdAt)}
                    {u.warningsCount > 0 && (
                      <span className="ml-1 font-medium text-amber-500">
                        · предупреждений: {u.warningsCount}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="flex items-center gap-2 rounded-lg bg-chip px-3 py-2 text-xs font-medium">
                  <CheckCircle2
                    size={13}
                    className={u.isVerified ? "text-[#3ea6ff]" : "text-2"}
                  />
                  Верификация
                  <Toggle
                    value={u.isVerified}
                    onChange={() => toggleVerify(u)}
                  />
                </span>
                <button
                  onClick={() => {
                    setEditing(u);
                    setDraft({ name: u.name, description: u.description });
                  }}
                  disabled={busyId === u.id}
                  className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-xs font-medium hoverable disabled:opacity-50"
                >
                  <Pencil size={13} /> Изменить
                </button>
                <button
                  onClick={() => toggleBan(u)}
                  disabled={busyId === u.id || u.role === "admin"}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40 ${
                    u.isBanned
                      ? "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                      : "bg-chip text-red-500 hoverable"
                  }`}
                >
                  {busyId === u.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Ban size={13} />
                  )}
                  {u.isBanned ? "Разблокировать" : "Заблокировать"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Редактирование профиля */}
      {editing && (
        <Modal
          title={`Профиль: @${editing.handle}`}
          onClose={() => setEditing(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Имя канала</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                maxLength={60}
                className="field text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Описание</label>
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={4}
                className="field resize-y text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditing(null)}
                className="rounded-full px-4 py-2 text-sm hoverable"
              >
                Отмена
              </button>
              <button
                onClick={saveEdit}
                disabled={busyId === editing.id || draft.name.trim().length < 2}
                className="flex items-center gap-2 rounded-full bg-[#3ea6ff] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {busyId === editing.id && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Сохранить
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
