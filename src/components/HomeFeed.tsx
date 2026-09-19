"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Sparkles, TrendingUp, Users, LayoutGrid } from "lucide-react";
import type { VideoCardData, Paginated } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { useAuth, useToast } from "./Providers";
import { VideoCard, VideoCardSkeleton } from "./VideoCard";

const PAGE_SIZE = 12;

export function HomeFeed() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const category = params.get("category") || "Все";
  const sort = params.get("sort") || "";
  const subs = params.get("subs") === "1";

  const [items, setItems] = useState<VideoCardData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const load = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const sp = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (category !== "Все") sp.set("category", category);
        if (sort) sp.set("sort", sort);
        if (subs) sp.set("subs", "1");
        const res = await fetch(`/api/videos?${sp}`);
        if (res.status === 401 && subs) {
          toast("Войдите, чтобы видеть новые видео по подпискам");
          router.push("/auth");
          return;
        }
        const data: Paginated<VideoCardData> = await res.json();
        setItems((prev) =>
          replace ? data.items : [...prev, ...data.items],
        );
        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [category, sort, subs, router, toast],
  );

  // Сброс при смене фильтров
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, subs, user?.id]);

  // Бесконечная прокрутка
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          load(page + 1, false);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [load, hasMore, page]);

  const chipHref = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const merged: Record<string, string | null> = {
      category: category === "Все" ? null : category,
      sort: sort || null,
      subs: subs ? "1" : null,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };

  const Chip = ({
    label,
    href,
    active,
    icon,
  }: {
    label: string;
    href: string;
    active: boolean;
    icon?: React.ReactNode;
  }) => (
    <a
      href={href}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "bg-chip hoverable"
      }`}
    >
      {icon}
      {label}
    </a>
  );

  return (
    <div className="px-3 pb-10 sm:px-6">
      {/* Чипы фильтров */}
      <div className="no-scrollbar sticky top-14 z-30 -mx-1 flex gap-2 overflow-x-auto bg-base/95 px-1 py-3 backdrop-blur">
        <Chip
          label="Все"
          href={chipHref({ category: null, sort: null, subs: null })}
          active={category === "Все" && !sort && !subs}
          icon={<LayoutGrid size={15} />}
        />
        <Chip
          label="Тренды"
          href={chipHref({ sort: "trending", subs: null })}
          active={sort === "trending" && !subs}
          icon={<Flame size={15} />}
        />
        <Chip
          label="Популярное"
          href={chipHref({ sort: "popular", subs: null })}
          active={sort === "popular" && !subs}
          icon={<TrendingUp size={15} />}
        />
        <Chip
          label="Новое"
          href={chipHref({ sort: "new", subs: null })}
          active={sort === "new" && !subs}
          icon={<Sparkles size={15} />}
        />
        {user && (
          <Chip
            label="Подписки"
            href={chipHref({ subs: "1", sort: null })}
            active={subs}
            icon={<Users size={15} />}
          />
        )}
        <div className="mx-1 w-px shrink-0 bg-[var(--border)]" />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            href={chipHref({ category: c, subs: null })}
            active={category === c && !subs}
          />
        ))}
      </div>

      {/* Заголовок раздела */}
      {subs && (
        <p className="mb-4 mt-2 text-sm text-2">
          Новые видео каналов, на которые вы подписаны
        </p>
      )}

      {/* Сетка */}
      <div className="stagger mt-2 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
        {loading &&
          Array.from({ length: items.length ? 4 : 8 }).map((_, i) => (
            <VideoCardSkeleton key={`sk-${i}`} />
          ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="py-24 text-center">
          <p className="text-lg font-medium">Ничего не найдено</p>
          <p className="mt-1 text-sm text-2">
            Попробуйте выбрать другой фильтр или категорию
          </p>
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
