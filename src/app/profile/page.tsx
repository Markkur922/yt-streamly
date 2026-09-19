"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  History,
  ThumbsUp,
  Users,
  ListVideo,
  Video,
  Settings,
  Loader2,
  Trash2,
  Pencil,
  Globe,
  Link2,
  Lock,
  CircleUserRound,
  Plus,
} from "lucide-react";
import type { VideoCardData, PlaylistData } from "@/lib/types";
import { useAuth, useToast } from "@/components/Providers";
import { Avatar } from "@/components/Avatar";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { CATEGORIES } from "@/lib/constants";
import { formatDateRu, formatDuration, formatSubs, formatViews, timeAgo } from "@/lib/format";

type Tab = "profile" | "videos" | "playlists" | "history" | "liked" | "subs";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "profile", label: "Профиль", icon: <Settings size={17} /> },
  { key: "videos", label: "Мои видео", icon: <Video size={17} /> },
  { key: "playlists", label: "Плейлисты", icon: <ListVideo size={17} /> },
  { key: "history", label: "История", icon: <History size={17} /> },
  { key: "liked", label: "Понравившиеся", icon: <ThumbsUp size={17} /> },
  { key: "subs", label: "Подписки", icon: <Users size={17} /> },
];

function ProfileInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, refresh } = useAuth();
  const { toast } = useToast();
  const tab = (params.get("tab") as Tab) || "profile";

  const setTab = (t: Tab) =>
    router.replace(t === "profile" ? "/profile" : `/profile?tab=${t}`, {
      scroll: false,
    });

  if (loading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 size={30} className="animate-spin text-2" />
      </div>
    );

  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CircleUserRound size={56} className="mx-auto text-2" />
        <h1 className="mt-4 text-xl font-semibold">Требуется авторизация</h1>
        <p className="mt-2 text-sm text-2">
          Войдите, чтобы управлять профилем, историей и подписками
        </p>
        <button
          onClick={() => router.push("/auth")}
          className="mt-6 rounded-full bg-[#3ea6ff] px-6 py-2.5 text-sm font-semibold text-black"
        >
          Войти
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-var">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key ? "" : "text-2 hover:text-base"
            }`}
          >
            {t.icon}
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[var(--text)]" />
            )}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileSettings />}
      {tab === "videos" && <MyVideos />}
      {tab === "playlists" && <MyPlaylists />}
      {tab === "history" && <HistoryTab />}
      {tab === "liked" && <LikedTab />}
      {tab === "subs" && <SubsTab />}
    </div>
  );
}

/* ------------------------------ Настройки ------------------------------ */
function ProfileSettings() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user!.name);
  const [description, setDescription] = useState(user!.description);
  const [avatarUrl, setAvatarUrl] = useState(user!.avatarUrl);
  const [notifyUploads, setNotifyUploads] = useState(user!.notifyUploads);
  const [notifyReplies, setNotifyReplies] = useState(user!.notifyReplies);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (patch: Record<string, unknown>) => {
    const res = await fetch(`/api/users/${user!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || "Не удалось сохранить");
      return false;
    }
    return true;
  };

  const saveAll = async () => {
    setBusy(true);
    const ok = await save({
      name: name.trim(),
      description,
      avatarUrl,
      notifyUploads,
      notifyReplies,
    });
    setBusy(false);
    if (ok) {
      toast("Профиль обновлён");
      await refresh();
    }
  };

  const uploadAvatar = async (file: File) => {
    const form = new FormData();
    form.append("kind", "image");
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      setAvatarUrl(data.url);
      const ok = await save({ avatarUrl: data.url });
      if (ok) {
        toast("Фото обновлено");
        await refresh();
      }
    } else toast("Не удалось загрузить фото");
  };

  const Toggle = ({
    value,
    onChange,
    label,
    hint,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint: string;
  }) => (
    <button
      onClick={() => {
        onChange(!value);
        save({ [label === "Новые видео от подписок" ? "notifyUploads" : "notifyReplies"]: !value });
      }}
      className="flex w-full items-center justify-between rounded-xl bg-secondary p-4 text-left hoverable"
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-2">{hint}</p>
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          value ? "bg-[#3ea6ff]" : "bg-chip"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar src={avatarUrl} name={name} size={96} />
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Сменить фото"
            className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-neutral-900 text-white shadow hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
          >
            <Camera size={15} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="text-sm">
          <p className="font-semibold">{user!.email}</p>
          <p className="text-2">@{user!.handle}</p>
          <p className="text-2">
            На платформе с {formatDateRu(user!.createdAt)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Имя канала</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="field"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Описание канала</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={1000}
            className="field resize-y"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Уведомления</p>
        <Toggle
          value={notifyUploads}
          onChange={setNotifyUploads}
          label="Новые видео от подписок"
          hint="Узнавать о новых роликах каналов, на которые вы подписаны"
        />
        <Toggle
          value={notifyReplies}
          onChange={setNotifyReplies}
          label="Ответы на комментарии"
          hint="Уведомления, когда кто-то отвечает на ваш комментарий"
        />
      </div>

      <button
        onClick={saveAll}
        disabled={busy || name.trim().length < 2}
        className="flex items-center gap-2 rounded-full bg-[#ff0000] px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {busy && <Loader2 size={15} className="animate-spin" />}
        Сохранить изменения
      </button>
    </div>
  );
}

/* ------------------------------ Мои видео ------------------------------ */
function MyVideos() {
  const { toast } = useToast();
  const [items, setItems] = useState<VideoCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "",
    visibility: "public",
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/videos?mine=1&limit=48")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const startEdit = (v: VideoCardData) => {
    setEditId(v.id);
    setDraft({
      title: v.title,
      description: v.description,
      category: v.category,
      visibility: v.visibility,
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const res = await fetch(`/api/videos/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((v) => (v.id === editId ? { ...v, ...draft } : v)),
      );
      setEditId(null);
      toast("Видео обновлено");
    } else toast("Не удалось обновить");
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить видео безвозвратно?")) return;
    const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((v) => v.id !== id));
      toast("Видео удалено");
    } else toast("Не удалось удалить");
  };

  if (loading)
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <VideoCardSkeleton key={i} variant="list" />
        ))}
      </div>
    );

  if (items.length === 0)
    return (
      <div className="rounded-2xl bg-secondary py-16 text-center">
        <Video size={40} className="mx-auto text-2" />
        <p className="mt-3 font-medium">У вас пока нет видео</p>
        <Link
          href="/upload"
          className="mt-4 inline-block rounded-full bg-[#ff0000] px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Загрузить первое видео
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      {items.map((v) => (
        <div key={v.id} className="rounded-2xl bg-secondary p-3">
          <div className="flex gap-4">
            <Link
              href={`/watch/${v.id}`}
              className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-chip sm:w-52"
            >
              {v.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] text-white">
                {formatDuration(v.durationSeconds)}
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/watch/${v.id}`}
                className="line-clamp-2 text-sm font-medium sm:text-base"
              >
                {v.title}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-2">
                <span className="flex items-center gap-1">
                  {v.visibility === "private" ? (
                    <Lock size={12} />
                  ) : v.visibility === "unlisted" ? (
                    <Link2 size={12} />
                  ) : (
                    <Globe size={12} />
                  )}
                  {v.visibility === "private"
                    ? "Приватное"
                    : v.visibility === "unlisted"
                      ? "По ссылке"
                      : "Публичное"}
                </span>
                · {formatViews(v.views)} · {v.likesCount} отметок «Нравится» ·{" "}
                {timeAgo(v.createdAt)}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => (editId === v.id ? setEditId(null) : startEdit(v))}
                  className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-1.5 text-xs font-medium hoverable"
                >
                  <Pencil size={13} />
                  {editId === v.id ? "Скрыть" : "Изменить"}
                </button>
                <button
                  onClick={() => remove(v.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-1.5 text-xs font-medium text-red-500 hoverable"
                >
                  <Trash2 size={13} /> Удалить
                </button>
              </div>
            </div>
          </div>

          {editId === v.id && (
            <div className="mt-4 space-y-3 border-t border-var pt-4">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Название"
                className="field text-sm"
              />
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={3}
                placeholder="Описание"
                className="field text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                  className="field h-9 w-auto bg-base py-0 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.visibility}
                  onChange={(e) =>
                    setDraft({ ...draft, visibility: e.target.value })
                  }
                  className="field h-9 w-auto bg-base py-0 text-sm"
                >
                  <option value="public">Публичное</option>
                  <option value="unlisted">По ссылке</option>
                  <option value="private">Приватное</option>
                </select>
                <button
                  onClick={saveEdit}
                  className="rounded-lg bg-[#3ea6ff] px-4 py-1.5 text-sm font-semibold text-black"
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Мои плейлисты ---------------------------- */
function MyPlaylists() {
  const { toast } = useToast();
  const [items, setItems] = useState<PlaylistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/playlists?mine=1")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const create = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setNewTitle("");
      toast("Плейлист создан");
      load();
    }
  };

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Название нового плейлиста"
          className="field h-10 max-w-sm py-0 text-sm"
        />
        <button
          onClick={create}
          disabled={busy || !newTitle.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-chip px-4 text-sm font-medium hoverable disabled:opacity-40"
        >
          <Plus size={15} /> Создать
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton aspect-video rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/playlist/${p.id}`}
              className="group rounded-2xl bg-secondary p-3 hoverable"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-chip">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2">
                    <ListVideo size={30} />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 flex h-full w-1/3 flex-col items-center justify-center gap-1 bg-black/70 text-white">
                  <ListVideo size={18} />
                  <span className="text-sm font-semibold">{p.videosCount}</span>
                </div>
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-medium">{p.title}</p>
              <p className="text-xs text-2">
                {p.visibility === "private"
                  ? "Приватный"
                  : p.visibility === "unlisted"
                    ? "По ссылке"
                    : "Публичный"}{" "}
                · {formatDateRu(p.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
      {!loading && items.length === 0 && (
        <p className="rounded-2xl bg-secondary py-12 text-center text-sm text-2">
          Плейлистов пока нет — создайте первый выше
        </p>
      )}
    </div>
  );
}

/* ------------------------------- История -------------------------------- */
function HistoryTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<(VideoCardData & { watchedAt: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const clear = async () => {
    if (!confirm("Очистить всю историю просмотров?")) return;
    await fetch("/api/history", { method: "DELETE" });
    setItems([]);
    toast("История очищена");
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-2">
          {items.length > 0 ? `Последние ${items.length} видео` : ""}
        </p>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-sm text-red-500 hoverable"
          >
            <Trash2 size={15} /> Очистить историю
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <VideoCardSkeleton key={i} variant="list" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-secondary py-12 text-center text-sm text-2">
          История пуста — начните смотреть видео
        </p>
      ) : (
        <div className="space-y-5">
          {items.map((v) => (
            <div key={`${v.id}-${v.watchedAt}`}>
              <VideoCard video={v} variant="list" />
              <p className="mt-1 text-xs text-2">
                Смотрели {timeAgo(v.watchedAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Понравившиеся ----------------------------- */
function LikedTab() {
  const [items, setItems] = useState<VideoCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/liked")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );

  if (items.length === 0)
    return (
      <p className="rounded-2xl bg-secondary py-12 text-center text-sm text-2">
        Здесь появятся видео, которые вы отметили лайком
      </p>
    );

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}

/* ------------------------------ Подписки -------------------------------- */
interface SubChannel {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  subscribersCount: number;
  videosCount: number;
}

function SubsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<SubChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/users/${user.id}/subscriptions`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const unsubscribe = async (id: string) => {
    const res = await fetch(`/api/users/${id}/subscribe`, { method: "POST" });
    const data = await res.json();
    if (res.ok && !data.subscribed) {
      setItems((prev) => prev.filter((s) => s.id !== id));
      toast("Вы отписались от канала");
    }
  };

  if (loading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-secondary p-4">
            <div className="skeleton h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-44 rounded" />
              <div className="skeleton h-3 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>
    );

  if (items.length === 0)
    return (
      <p className="rounded-2xl bg-secondary py-12 text-center text-sm text-2">
        Вы ни на кого не подписаны
      </p>
    );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((s) => (
        <div key={s.id} className="flex items-center gap-4 rounded-2xl bg-secondary p-4">
          <Link href={`/channel/${s.handle}`}>
            <Avatar src={s.avatarUrl} name={s.name} size={56} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/channel/${s.handle}`}
              className="block truncate font-medium hover:underline"
            >
              {s.name}
            </Link>
            <p className="text-xs text-2">
              {formatSubs(s.subscribersCount)} · {s.videosCount} видео
            </p>
          </div>
          <button
            onClick={() => unsubscribe(s.id)}
            className="shrink-0 rounded-full bg-chip px-4 py-2 text-xs font-medium hoverable"
          >
            Отписаться
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 size={30} className="animate-spin text-2" />
        </div>
      }
    >
      <ProfileInner />
    </Suspense>
  );
}
