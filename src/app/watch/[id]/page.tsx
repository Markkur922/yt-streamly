import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { videos, users, subscriptions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getVideoReaction } from "@/lib/reactions";
import { toCard } from "@/lib/video-queries";
import { WatchView, type WatchVideo } from "@/components/watch/WatchView";

const AUTHOR_FIELDS = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  avatarUrl: users.avatarUrl,
  subscribersCount: users.subscribersCount,
  isVerified: users.isVerified,
};

const getVideo = cache(async (id: string) => {
  const [row] = await db
    .select({ video: videos, author: AUTHOR_FIELDS })
    .from(videos)
    .innerJoin(users, eq(videos.authorId, users.id))
    .where(eq(videos.id, id))
    .limit(1);
  return row ?? null;
});

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await getVideo(id);
  if (!row) return { title: "Видео не найдено" };
  const { video, author } = row;
  const description =
    video.description.slice(0, 160) ||
    `Смотрите «${video.title}» на канале ${author.name} — Streamly`;
  return {
    title: video.title,
    description,
    openGraph: {
      title: video.title,
      description,
      images: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description,
    },
  };
}

export default async function WatchPage({ params }: Props) {
  const { id } = await params;
  const row = await getVideo(id);
  if (!row) notFound();
  const { video, author } = row;

  const user = await getSessionUser();
  if (video.visibility === "private" && video.authorId !== user?.id) notFound();

  const myReaction = user ? await getVideoReaction(user.id, id) : 0;
  let isSubscribed = false;
  if (user && user.id !== video.authorId) {
    const [sub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.subscriberId, user.id),
          eq(subscriptions.channelId, video.authorId),
        ),
      )
      .limit(1);
    isSubscribed = !!sub;
  }
  if (user?.id === video.authorId) isSubscribed = true;

  const initial: WatchVideo = {
    ...toCard(video, author),
    myReaction,
    isSubscribed,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description.slice(0, 300),
    thumbnailUrl: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
    uploadDate: video.createdAt.toISOString(),
    duration: `PT${video.durationSeconds}S`,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "WatchAction" },
      userInteractionCount: video.views,
    },
    author: { "@type": "Person", name: author.name },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WatchView initial={initial} />
    </>
  );
}
