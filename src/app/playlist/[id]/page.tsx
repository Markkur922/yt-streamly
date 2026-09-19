"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import {
  ListVideo,
  Lock,
  Link2,
  Globe,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { VideoCardData } from "@/lib/types";
import { useAuth, useToast } from "@/components/Providers";
import { Avatar } from "@/components/Avatar";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";

interface FullPlaylist {
  id: string;
  title: string;
  description: string;
  visibility: string;
  createdAt: string;
  owner: { id: string; handle: string; name: string };
  videos: VideoCardData[];
  isOwner: boolean;
}

const VIS_ICON: Record<string, React.ReactNode> = {
  private: <Lock size={14} />,
  unlisted: <Link2 size={14} />,
  public: <Globe size={14} />,
};

export default function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [playlist, setPlaylist] = useState<FullPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setPlaylist(data.playlist);
      setDraftTitle(data.playlist.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTitle = async () => {
    if (!playlist || !draftTitle.trim()) return;
    const res = await fetch(`/api/playlists/${playlist.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draftTitle.trim() }),
    });
    if (res.ok) {
      setPlaylist({ ...playlist, title: draftTitle.trim() });
      setEditing(false);
      toast("Плейлист обновлён");
    }
  };

  const changeVisibility = async (v: string) => {
    if (!playlist) return;
    const res = await fetch(`/api/playlists/${playlist.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: v }),
    });
    if (res.ok) setPlaylist({ ...playlist, visibility: v });
  };

  const removeVideo = async (videoId: string) => {
    if (!playlist) return;
    setPlaylist({
      ...playlist,
      videos: playlist.videos.filter((v) => v.id !== videoId),
    });
    await fetch(`/api/playlists/${playlist.id}/videos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    toast("Видео удалено из плейлиста");
  };

  const deletePlaylist = async () => {
    if (!playlist || !confirm("Удалить плейлист безвозвратно?")) return;
    const res = await fetch(`/api/playlists/${playlist.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("Плейлист удалён");
      router.push("/profile?tab=playlists");
    }
  };

  if (loading)
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="skeleton h-8 w-72 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <VideoCardSkeleton key={i} variant="list" />
        ))}
      </div>
    );

  if (error || !playlist)
    return (
      <div className="py-32 text-center">
        <ListVideo size={48} className="mx-auto text-2" />
        <p className="mt-4 text-xl font-semibold">
          {error || "Плейлист не найден"}
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-[#3ea6ff] hover:underline"
        >
          На главную
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Шапка плейлиста */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="field h-11 text-xl font-bold"
            />
            <button
              onClick={saveTitle}
              aria-label="Сохранить"
              className="rounded-full bg-chip p-2.5 hoverable"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => setEditing(false)}
              aria-label="Отмена"
              className="rounded-full bg-chip p-2.5 hoverable"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <h1 className="flex-1 text-2xl font-bold">
            {playlist.title}
            {playlist.isOwner && (
              <button
                onClick={() => setEditing(true)}
                aria-label="Переименовать"
                className="ml-2 inline-block rounded-full p-1.5 align-middle text-2 hoverable"
              >
                <Pencil size={16} />
              </button>
            )}
          </h1>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-2">
        <Link
          href={`/channel/${playlist.owner.handle}`}
          className="flex items-center gap-2 font-medium text-base hover:underline"
        >
          <Avatar src={null} name={playlist.owner.name} size={24} />
          {playlist.owner.name}
        </Link>
        <span>·</span>
        <span className="flex items-center gap-1.5">
          {VIS_ICON[playlist.visibility]}
          {playlist.visibility === "private"
            ? "Приватный"
            : playlist.visibility === "unlisted"
              ? "По ссылке"
              : "Публичный"}
        </span>
        <span>·</span>
        <span>{playlist.videos.length} видео</span>

        {playlist.isOwner && (
          <div className="ml-auto flex items-center gap-2">
            <select
              value={playlist.visibility}
              onChange={(e) => changeVisibility(e.target.value)}
              className="rounded-lg bg-chip px-3 py-2 text-sm outline-none"
            >
              <option value="private">Приватный</option>
              <option value="unlisted">По ссылке</option>
              <option value="public">Публичный</option>
            </select>
            <button
              onClick={deletePlaylist}
              className="flex items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-sm text-red-500 hoverable"
            >
              <Trash2 size={15} /> Удалить
            </button>
          </div>
        )}
      </div>

      {playlist.description && (
        <p className="mt-3 whitespace-pre-line text-sm text-2">
          {playlist.description}
        </p>
      )}

      {/* Список видео */}
      <div className="mt-8 space-y-5">
        {playlist.videos.length === 0 && (
          <div className="rounded-2xl bg-secondary py-16 text-center">
            <p className="font-medium">В плейлисте пока нет видео</p>
            <p className="mt-1 text-sm text-2">
              Откройте любое видео и нажмите «Сохранить»
            </p>
          </div>
        )}
        {playlist.videos.map((v, i) => (
          <div key={v.id} className="group flex items-start gap-3">
            <span className="hidden w-5 pt-8 text-center text-sm text-2 sm:block">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <VideoCard video={v} variant="list" />
            </div>
            {playlist.isOwner && (
              <button
                onClick={() => removeVideo(v.id)}
                aria-label="Убрать из плейлиста"
                className="mt-1 rounded-full p-2 text-2 opacity-0 transition-opacity hoverable hover:text-red-500 group-hover:opacity-100"
              >
                <X size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      {user === null && playlist.visibility !== "public" && null}
    </div>
  );
}
