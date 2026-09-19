"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Eye,
  Video,
  Users,
  MessagesSquare,
  ListVideo,
  Play,
  CheckCircle2,
} from "lucide-react";
import type { ChannelData, VideoCardData, PlaylistData } from "@/lib/types";
import { useAuth, useToast } from "@/components/Providers";
import { Avatar } from "@/components/Avatar";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { formatSubs, formatViews, formatDateRu } from "@/lib/format";

type Tab = "videos" | "playlists" | "about" | "community";

const TABS: { key: Tab; label: string }[] = [
  { key: "videos", label: "Видео" },
  { key: "playlists", label: "Плейлисты" },
  { key: "about", label: "О канале" },
  { key: "community", label: "Сообщество" },
];

export function ChannelView({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("videos");
  const [sort, setSort] = useState<"new" | "popular">("new");
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subsCount, setSubsCount] = useState(0);

  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error("404");
        return r.json();
      })
      .then((d) => {
        setChannel(d.channel);
        setSubscribed(d.channel.isSubscribed);
        setSubsCount(d.channel.subscribersCount);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  const loadVideos = useCallback(() => {
    if (!channel) return;
    setLoadingList(true);
    fetch(`/api/videos?channelId=${channel.id}&sort=${sort}&limit=24`)
      .then((r) => r.json())
      .then((d) => setVideos(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [channel, sort]);

  useEffect(() => {
    if (tab === "videos") loadVideos();
  }, [tab, loadVideos]);

  useEffect(() => {
    if (tab !== "playlists" || !channel) return;
    setLoadingList(true);
    fetch(`/api/playlists?channelId=${channel.id}`)
      .then((r) => r.json())
      .then((d) => setPlaylists(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [tab, channel]);

  const toggleSubscribe = async () => {
    if (!user) {
      toast("Войдите, чтобы подписаться на канал");
      router.push("/auth");
      return;
    }
    if (!channel) return;
    const res = await fetch(`/api/users/${channel.id}/subscribe`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok) {
      setSubscribed(data.subscribed);
      setSubsCount(data.subscribersCount);
      toast(data.subscribed ? "Вы подписались на канал" : "Вы отписались от канала");
    }
  };

  if (notFound)
    return (
      <div className="py-32 text-center">
        <p className="text-xl font-semibold">Канал не найден</p>
        <Link href="/" className="mt-3 inline-block text-[#3ea6ff] hover:underline">
          На главную
        </Link>
      </div>
    );

  if (!channel)
    return (
      <div>
        <div className="skeleton h-32 w-full sm:h-44" />
        <div className="mx-auto flex max-w-5xl items-center gap-5 px-4 py-6">
          <div className="skeleton h-24 w-24 rounded-full sm:h-36 sm:w-36" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-7 w-64 rounded" />
            <div className="skeleton h-4 w-44 rounded" />
          </div>
        </div>
      </div>
    );

  const isOwner = user?.id === channel.id;

  return (
    <div className="pb-12">
      {/* Баннер */}
      <div className="px-0 sm:px-4 lg:px-8">
        <div className="h-28 w-full overflow-hidden sm:h-44 sm:rounded-2xl lg:h-52">
          {channel.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-red-900/60 via-neutral-800 to-red-950/60 dark:from-red-900/40 dark:to-neutral-900" />
          )}
        </div>
      </div>

      {/* Шапка канала */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center">
          <Avatar
            src={channel.avatarUrl}
            name={channel.name}
            size={128}
            className="h-20 w-20 shrink-0 sm:h-32 sm:w-32"
          />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {channel.name}
              {channel.isVerified && (
                <CheckCircle2 size={24} className="shrink-0 text-2" />
              )}
            </h1>
            <p className="mt-1 text-sm text-2">
              @{channel.handle} · {formatSubs(subsCount)} ·{" "}
              {channel.videosCount}{" "}
              {channel.videosCount === 1 ? "видео" : "видео"}
            </p>
            {channel.description && (
              <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-2">
                {channel.description}
              </p>
            )}
            <div className="mt-4">
              {isOwner ? (
                <Link
                  href="/profile"
                  className="rounded-full bg-chip px-5 py-2.5 text-sm font-medium hoverable"
                >
                  Настроить канал
                </Link>
              ) : (
                <button
                  onClick={toggleSubscribe}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                    subscribed
                      ? "bg-chip hoverable"
                      : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  }`}
                >
                  {subscribed ? "Вы подписаны" : "Подписаться"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-var">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? "" : "text-2 hover:text-base"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[var(--text)]" />
              )}
            </button>
          ))}
        </div>

        {/* Содержимое вкладок */}
        <div className="py-6">
          {tab === "videos" && (
            <>
              <div className="mb-5 flex gap-2">
                <button
                  onClick={() => setSort("new")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    sort === "new"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-chip hoverable"
                  }`}
                >
                  Сначала новые
                </button>
                <button
                  onClick={() => setSort("popular")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    sort === "popular"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-chip hoverable"
                  }`}
                >
                  Сначала популярные
                </button>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {loadingList &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <VideoCardSkeleton key={i} />
                  ))}
                {!loadingList &&
                  videos.map((v) => (
                    <VideoCard key={v.id} video={v} showAuthor={false} />
                  ))}
              </div>
              {!loadingList && videos.length === 0 && (
                <EmptyState
                  icon={<Video size={40} />}
                  text="На канале пока нет видео"
                />
              )}
            </>
          )}

          {tab === "playlists" && (
            <>
              <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {!loadingList &&
                  playlists.map((p) => (
                    <Link key={p.id} href={`/playlist/${p.id}`} className="group">
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-chip">
                        {p.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.thumbnailUrl}
                            alt={p.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-2">
                            <ListVideo size={32} />
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 flex h-full w-1/3 flex-col items-center justify-center gap-1 bg-black/70 text-white">
                          <ListVideo size={20} />
                          <span className="text-sm font-semibold">
                            {p.videosCount}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium">
                        {p.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-2 group-hover:text-base">
                        <Play size={11} /> Смотреть весь плейлист
                      </p>
                    </Link>
                  ))}
              </div>
              {(loadingList || playlists.length === 0) && !loadingList && (
                <EmptyState
                  icon={<ListVideo size={40} />}
                  text="Публичных плейлистов нет"
                />
              )}
            </>
          )}

          {tab === "about" && (
            <div className="max-w-2xl space-y-6">
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {channel.description || "Владелец канала не добавил описание."}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Stat icon={<Users size={18} />} label="Подписчики" value={formatSubs(subsCount)} />
                <Stat icon={<Video size={18} />} label="Видео" value={String(channel.videosCount)} />
                <Stat icon={<Eye size={18} />} label="Всего просмотров" value={formatViews(channel.totalViews)} />
                <Stat icon={<Calendar size={18} />} label="Дата регистрации" value={formatDateRu(channel.createdAt)} />
              </div>
            </div>
          )}

          {tab === "community" && (
            <EmptyState
              icon={<MessagesSquare size={40} />}
              text="Записей сообщества пока нет"
              hint="Подпишитесь, чтобы не пропустить первые новости канала"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary p-4">
      <span className="text-2">{icon}</span>
      <div>
        <p className="text-xs text-2">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  hint,
}: {
  icon: React.ReactNode;
  text: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-secondary px-6 py-16 text-center">
      <span className="text-2">{icon}</span>
      <p className="font-medium">{text}</p>
      {hint && <p className="text-sm text-2">{hint}</p>}
    </div>
  );
}
