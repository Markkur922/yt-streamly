"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchX, ListVideo } from "lucide-react";
import type { VideoCardData } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { formatSubs, formatDateRu } from "@/lib/format";

interface ChannelHit {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  description: string;
  subscribersCount: number;
}
interface PlaylistHit {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  owner: { id: string; handle: string; name: string };
}

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") || "";

  const [type, setType] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [duration, setDuration] = useState("any");
  const [period, setPeriod] = useState("any");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [channels, setChannels] = useState<ChannelHit[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistHit[]>([]);

  const load = useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams({ q, type, sort, duration, period });
      const res = await fetch(`/api/search?${sp}`);
      const data = await res.json();
      setVideos(data.items ?? []);
      setChannels(data.channels ?? []);
      setPlaylists(data.playlists ?? []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [q, type, sort, duration, period]);

  useEffect(() => {
    load();
  }, [load]);

  const selectCls =
    "rounded-lg bg-chip px-3 py-2 text-sm outline-none cursor-pointer";

  const empty =
    !loading &&
    videos.length === 0 &&
    channels.length === 0 &&
    playlists.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {q && (
        <h1 className="text-lg font-semibold">
          Результаты по запросу «{q}»
        </h1>
      )}

      {/* Фильтры */}
      <div className="no-scrollbar mt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
          <option value="all">Все типы</option>
          <option value="video">Видео</option>
          <option value="channel">Каналы</option>
          <option value="playlist">Плейлисты</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
          <option value="relevance">По релевантности</option>
          <option value="date">По дате загрузки</option>
          <option value="views">По числу просмотров</option>
        </select>
        <select value={duration} onChange={(e) => setDuration(e.target.value)} className={selectCls}>
          <option value="any">Любая длительность</option>
          <option value="short">До 4 минут</option>
          <option value="medium">4–20 минут</option>
          <option value="long">Более 20 минут</option>
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls}>
          <option value="any">За всё время</option>
          <option value="hour">За последний час</option>
          <option value="day">За сегодня</option>
          <option value="week">За неделю</option>
          <option value="month">За месяц</option>
          <option value="year">За год</option>
        </select>
      </div>

      {/* Скелетоны */}
      {loading && (
        <div className="mt-6 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <VideoCardSkeleton key={i} variant="list" />
          ))}
        </div>
      )}

      {/* Каналы */}
      {!loading && channels.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-2">
            Каналы
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {channels.map((c) => (
              <Link
                key={c.id}
                href={`/channel/${c.handle}`}
                className="flex items-start gap-4 rounded-2xl bg-secondary p-4 hoverable"
              >
                <Avatar src={c.avatarUrl} name={c.name} size={72} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-sm text-2">
                    @{c.handle} · {formatSubs(c.subscribersCount)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-2">
                    {c.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Плейлисты */}
      {!loading && playlists.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-2">
            Плейлисты
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p) => (
              <Link
                key={p.id}
                href={`/playlist/${p.id}`}
                className="flex items-center gap-3 rounded-2xl bg-secondary p-3 hoverable"
              >
                <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-chip text-2">
                  <ListVideo size={22} />
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-2">
                    {p.owner.name} · {formatDateRu(p.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Видео */}
      {!loading && videos.length > 0 && (
        <div className="mt-6 space-y-6">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} variant="list" />
          ))}
        </div>
      )}

      {empty && (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <SearchX size={48} className="text-2" />
          <p className="text-lg font-medium">
            По запросу «{q}» ничего не найдено
          </p>
          <p className="max-w-sm text-sm text-2">
            Попробуйте другие ключевые слова или смягчите фильтры
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <VideoCardSkeleton key={i} variant="list" />
          ))}
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
