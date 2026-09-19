"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  BookmarkPlus,
  Check,
  X,
  Copy,
  Plus,
} from "lucide-react";
import type { VideoCardData, PlaylistData } from "@/lib/types";
import { useAuth, useToast } from "@/components/Providers";
import { Avatar } from "@/components/Avatar";
import { VideoPlayer } from "./VideoPlayer";
import { Comments } from "./Comments";
import { VideoCardSkeleton } from "@/components/VideoCard";
import {
  formatViews,
  formatSubs,
  formatCount,
  formatDateRu,
  formatDuration,
  timeAgo,
} from "@/lib/format";

export type WatchVideo = VideoCardData & {
  myReaction: number;
  isSubscribed: boolean;
};

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
        className="menu-pop w-full max-w-sm rounded-2xl border border-var bg-elev p-4 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
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

export function WatchView({ initial }: { initial: WatchVideo }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [video, setVideo] = useState(initial);
  const [likes, setLikes] = useState(initial.likesCount);
  const [dislikes, setDislikes] = useState(initial.dislikesCount);
  const [myReaction, setMyReaction] = useState(initial.myReaction);
  const [subscribed, setSubscribed] = useState(initial.isSubscribed);
  const [subsCount, setSubsCount] = useState(initial.author.subscribersCount);
  const [expanded, setExpanded] = useState(false);
  const [related, setRelated] = useState<VideoCardData[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState("");
  const viewCounted = useRef(false);
  const isOwner = user?.id === video.author.id;

  // Счётчик просмотра (+ запись в историю)
  useEffect(() => {
    if (viewCounted.current) return;
    viewCounted.current = true;
    const t = setTimeout(() => {
      fetch(`/api/videos/${video.id}/view`, { method: "PUT" })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.views === "number")
            setVideo((v) => ({ ...v, views: d.views }));
        })
        .catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Рекомендации
  useEffect(() => {
    setRelatedLoading(true);
    fetch(`/api/videos/${video.id}/related`)
      .then((r) => r.json())
      .then((d) => setRelated(d.items ?? []))
      .catch(() => {})
      .finally(() => setRelatedLoading(false));
  }, [video.id]);

  const requireAuth = useCallback(
    (action: string) => {
      toast(`Войдите, чтобы ${action}`);
      router.push("/auth");
    },
    [router, toast],
  );

  const react = async (type: "like" | "dislike") => {
    if (!user) return requireAuth(type === "like" ? "ставить лайки" : "ставить дизлайки");
    try {
      const res = await fetch(`/api/videos/${video.id}/${type}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setMyReaction(data.myReaction);
      }
    } catch {
      /* noop */
    }
  };

  const toggleSubscribe = async () => {
    if (!user) return requireAuth("подписаться на канал");
    try {
      const res = await fetch(`/api/users/${video.author.id}/subscribe`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribed(data.subscribed);
        setSubsCount(data.subscribersCount);
        toast(data.subscribed ? "Вы подписались на канал" : "Вы отписались от канала");
      }
    } catch {
      /* noop */
    }
  };

  const openSave = async () => {
    if (!user) return requireAuth("сохранять видео в плейлисты");
    setSaveOpen(true);
    if (playlistsLoaded) return;
    try {
      const res = await fetch(`/api/playlists?mine=1&videoId=${video.id}`);
      const data = await res.json();
      setPlaylists(data.items ?? []);
      setPlaylistsLoaded(true);
    } catch {
      /* noop */
    }
  };

  const toggleInPlaylist = async (p: PlaylistData) => {
    const method = p.containsVideo ? "DELETE" : "POST";
    setPlaylists((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, containsVideo: !p.containsVideo } : x,
      ),
    );
    try {
      await fetch(`/api/playlists/${p.id}/videos`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id }),
      });
      toast(p.containsVideo ? "Удалено из плейлиста" : "Сохранено в плейлист");
    } catch {
      /* noop */
    }
  };

  const createPlaylist = async () => {
    const title = newPlaylist.trim();
    if (!title) return;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (res.ok && data.playlist) {
      const p: PlaylistData = {
        id: data.playlist.id,
        title: data.playlist.title,
        description: "",
        visibility: "private",
        createdAt: data.playlist.createdAt,
        owner: { id: user!.id, handle: user!.handle, name: user!.name },
        videosCount: 0,
        thumbnailUrl: null,
        containsVideo: false,
      };
      setPlaylists((prev) => [p, ...prev]);
      setNewPlaylist("");
      toast("Плейлист создан");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Ссылка скопирована");
    } catch {
      toast("Не удалось скопировать");
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = encodeURIComponent(`${video.title} — Streamly`);
  const shareLinks = [
    { name: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareText}` },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${shareText}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}` },
    { name: "VK", href: `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${shareText}` },
  ];

  return (
    <div className="mx-auto max-w-[1754px] px-0 pb-12 sm:px-4 lg:px-6">
      <div className="flex flex-col gap-6 pt-3 xl:flex-row">
        {/* Основная колонка */}
        <div className="min-w-0 flex-1 px-3 sm:px-0">
          <VideoPlayer
            qualities={video.qualities}
            poster={video.thumbnailUrl}
          />

          <h1 className="mt-4 text-lg font-semibold leading-snug sm:text-xl">
            {video.title}
          </h1>

          {/* Канал + действия */}
          <div className="mt-3 flex flex-wrap items-center gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={`/channel/${video.author.handle}`}>
                <Avatar src={video.author.avatarUrl} name={video.author.name} size={40} />
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/channel/${video.author.handle}`}
                  className="block truncate font-medium leading-tight hover:underline"
                >
                  {video.author.name}
                </Link>
                <p className="text-xs text-2">{formatSubs(subsCount)}</p>
              </div>
              {!isOwner ? (
                <button
                  onClick={toggleSubscribe}
                  className={`ml-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    subscribed
                      ? "bg-chip hoverable"
                      : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  }`}
                >
                  {subscribed ? "Вы подписаны" : "Подписаться"}
                </button>
              ) : (
                <Link
                  href="/profile?tab=videos"
                  className="ml-2 rounded-full bg-chip px-4 py-2 text-sm font-medium hoverable"
                >
                  Управлять
                </Link>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Лайк / дизлайк */}
              <div className="flex items-center overflow-hidden rounded-full bg-chip">
                <button
                  onClick={() => react("like")}
                  className={`flex items-center gap-1.5 py-2 pl-4 pr-3 text-sm font-medium transition-colors hover:bg-[var(--hover)] ${
                    myReaction === 1 ? "text-[#3ea6ff]" : ""
                  }`}
                >
                  <ThumbsUp size={17} className={myReaction === 1 ? "fill-[#3ea6ff]" : ""} />
                  {formatCount(likes)}
                </button>
                <div className="h-5 w-px bg-[var(--border)]" />
                <button
                  onClick={() => react("dislike")}
                  aria-label="Не нравится"
                  className={`px-3 py-2 transition-colors hover:bg-[var(--hover)] ${
                    myReaction === -1 ? "text-[#3ea6ff]" : ""
                  }`}
                >
                  <ThumbsDown size={17} className={myReaction === -1 ? "fill-[#3ea6ff]" : ""} />
                </button>
              </div>

              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-chip px-4 py-2 text-sm font-medium hoverable"
              >
                <Share2 size={17} />
                <span className="hidden sm:inline">Поделиться</span>
              </button>

              <button
                onClick={openSave}
                className="flex items-center gap-1.5 rounded-full bg-chip px-4 py-2 text-sm font-medium hoverable"
              >
                <BookmarkPlus size={17} />
                <span className="hidden sm:inline">Сохранить</span>
              </button>
            </div>
          </div>

          {/* Описание */}
          <div className="mt-4 rounded-xl bg-secondary p-3 text-sm">
            <p className="font-medium">
              {formatViews(video.views)} · {formatDateRu(video.createdAt)}
            </p>
            {video.tags.length > 0 && (
              <p className="mt-1 flex flex-wrap gap-x-2 text-[#3ea6ff]">
                {video.tags.slice(0, 6).map((t) => (
                  <Link key={t} href={`/search?q=${encodeURIComponent("#" + t)}`}>
                    #{t.replace(/\s+/g, "_")}
                  </Link>
                ))}
              </p>
            )}
            <div
              className={`mt-2 whitespace-pre-line leading-relaxed ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {video.description || "Описание отсутствует."}
            </div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 font-medium text-2 hover:text-base"
            >
              {expanded ? "Скрыть" : "…ещё"}
            </button>
          </div>

          {/* Комментарии */}
          <Comments videoId={video.id} videoAuthorId={video.author.id} />

          {/* Рекомендации (мобильная версия) */}
          <div className="mt-8 xl:hidden">
            <h2 className="mb-4 font-semibold">Рекомендации</h2>
            <div className="space-y-4">
              {related.map((v) => (
                <RelatedCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        </div>

        {/* Рекомендации (десктоп) */}
        <aside className="hidden w-[400px] shrink-0 px-3 sm:px-0 xl:block">
          <h2 className="mb-3 font-semibold">Рекомендации</h2>
          <div className="space-y-3">
            {relatedLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <VideoCardSkeleton key={i} variant="list" />
              ))}
            {related.map((v) => (
              <RelatedCard key={v.id} video={v} />
            ))}
          </div>
        </aside>
      </div>

      {/* Модалка «Поделиться» */}
      {shareOpen && (
        <Modal title="Поделиться" onClose={() => setShareOpen(false)}>
          <div className="mb-4 flex flex-wrap gap-2">
            {shareLinks.map((l) => (
              <a
                key={l.name}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-chip px-4 py-2 text-sm font-medium hoverable"
              >
                {l.name}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-var p-1 pl-3">
            <p className="min-w-0 flex-1 truncate text-sm text-2">{shareUrl}</p>
            <button
              onClick={copyLink}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-sm font-medium hoverable"
            >
              <Copy size={15} /> Копировать
            </button>
          </div>
        </Modal>
      )}

      {/* Модалка «Сохранить» */}
      {saveOpen && (
        <Modal title="Сохранить в…" onClose={() => setSaveOpen(false)}>
          <div className="max-h-[40vh] space-y-1 overflow-y-auto">
            {playlists.length === 0 && (
              <p className="py-4 text-center text-sm text-2">
                У вас пока нет плейлистов
              </p>
            )}
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleInPlaylist(p)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm hoverable"
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                    p.containsVideo
                      ? "border-[#3ea6ff] bg-[#3ea6ff]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {p.containsVideo && <Check size={13} className="text-black" />}
                </span>
                <span className="truncate">{p.title}</span>
                <span className="ml-auto text-xs text-2">
                  {p.visibility === "private" ? "Приватный" : p.visibility === "unlisted" ? "По ссылке" : "Публичный"}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-var pt-3">
            <div className="flex gap-2">
              <input
                value={newPlaylist}
                onChange={(e) => setNewPlaylist(e.target.value)}
                placeholder="Новый плейлист…"
                className="field h-9 py-0 text-sm"
              />
              <button
                onClick={createPlaylist}
                disabled={!newPlaylist.trim()}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-chip px-3 text-sm font-medium hoverable disabled:opacity-40"
              >
                <Plus size={15} /> Создать
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RelatedCard({ video }: { video: VideoCardData }) {
  return (
    <div className="group flex gap-2">
      <Link href={`/watch/${video.id}`} className="w-40 shrink-0">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-chip">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/watch/${video.id}`}
          className="line-clamp-2 text-sm font-medium leading-snug"
        >
          {video.title}
        </Link>
        <Link
          href={`/channel/${video.author.handle}`}
          className="mt-1 block truncate text-xs text-2 hover:text-base"
        >
          {video.author.name}
        </Link>
        <p className="text-xs text-2">
          {formatViews(video.views)} · {timeAgo(video.createdAt)}
        </p>
      </div>
    </div>
  );
}
