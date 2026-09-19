"use client";

import Link from "next/link";
import { CheckCircle2, EyeOff } from "lucide-react";
import type { VideoCardData } from "@/lib/types";
import { formatViews, timeAgo, formatDuration } from "@/lib/format";
import { Avatar } from "./Avatar";

export function VideoCard({
  video,
  variant = "grid",
  showAuthor = true,
}: {
  video: VideoCardData;
  variant?: "grid" | "list";
  showAuthor?: boolean;
}) {
  const thumb = (
    <div className="group/thumb relative aspect-video w-full overflow-hidden rounded-xl bg-chip">
      {video.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2">
          <EyeOff size={28} />
        </div>
      )}
      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
        {formatDuration(video.durationSeconds)}
      </span>
      {video.visibility !== "public" && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">
          {video.visibility === "private" ? "Приватное" : "По ссылке"}
        </span>
      )}
    </div>
  );

  if (variant === "list") {
    return (
      <div className="group flex gap-3 sm:gap-4">
        <Link href={`/watch/${video.id}`} className="block w-40 shrink-0 sm:w-72">
          {thumb}
        </Link>
        <div className="min-w-0 flex-1 py-0.5">
          <Link
            href={`/watch/${video.id}`}
            className="line-clamp-2 text-sm font-medium leading-snug sm:text-lg"
          >
            {video.title}
          </Link>
          <p className="mt-1 text-xs text-2 sm:text-sm">
            {formatViews(video.views)} · {timeAgo(video.createdAt)}
          </p>
          <Link
            href={`/channel/${video.author.handle}`}
            className="mt-2 flex items-center gap-2 text-xs text-2 hover:text-base sm:text-sm"
          >
            <Avatar src={video.author.avatarUrl} name={video.author.name} size={24} />
            <span className="truncate">{video.author.name}</span>
            {video.author.isVerified && (
              <CheckCircle2 size={14} className="shrink-0 text-2" />
            )}
          </Link>
          <p className="mt-2 hidden line-clamp-2 text-xs text-2 sm:block">
            {video.description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <Link href={`/watch/${video.id}`}>{thumb}</Link>
      <div className="mt-3 flex gap-3">
        {showAuthor && (
          <Link href={`/channel/${video.author.handle}`} className="mt-0.5 shrink-0">
            <Avatar src={video.author.avatarUrl} name={video.author.name} size={36} />
          </Link>
        )}
        <div className="min-w-0">
          <Link
            href={`/watch/${video.id}`}
            className="line-clamp-2 text-sm font-medium leading-snug sm:text-[15px]"
          >
            {video.title}
          </Link>
          <Link
            href={`/channel/${video.author.handle}`}
            className="mt-1 flex items-center gap-1 text-[13px] text-2 hover:text-base"
          >
            <span className="truncate">{video.author.name}</span>
            {video.author.isVerified && (
              <CheckCircle2 size={13} className="shrink-0" />
            )}
          </Link>
          <p className="text-[13px] text-2">
            {formatViews(video.views)} · {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function VideoCardSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="flex gap-4">
        <div className="skeleton aspect-video w-40 rounded-xl sm:w-72" />
        <div className="flex-1 space-y-2 py-1">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
          <div className="skeleton mt-3 h-6 w-6 rounded-full" />
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="skeleton aspect-video rounded-xl" />
      <div className="mt-3 flex gap-3">
        <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}
