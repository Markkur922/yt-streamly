import type { Metadata } from "next";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ChannelView } from "@/components/channel/ChannelView";

type Props = { params: Promise<{ id: string }> };

async function findChannel(idOrHandle: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrHandle,
    );
  const [u] = await db
    .select()
    .from(users)
    .where(
      isUuid
        ? or(eq(users.id, idOrHandle), eq(users.handle, idOrHandle))
        : eq(users.handle, idOrHandle),
    )
    .limit(1);
  return u ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const channel = await findChannel(decodeURIComponent(id));
  if (!channel) return { title: "Канал не найден" };
  return {
    title: channel.name,
    description:
      channel.description.slice(0, 160) ||
      `Канал ${channel.name} на Streamly`,
    openGraph: {
      title: channel.name,
      description: channel.description.slice(0, 160),
      images: channel.avatarUrl ? [channel.avatarUrl] : undefined,
    },
  };
}

export default async function ChannelPage({ params }: Props) {
  const { id } = await params;
  return <ChannelView id={decodeURIComponent(id)} />;
}
