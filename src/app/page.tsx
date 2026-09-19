import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeFeed } from "@/components/HomeFeed";
import { VideoCardSkeleton } from "@/components/VideoCard";

export const metadata: Metadata = {
  title: "Streamly — смотрите, загружайте, делитесь",
};

function FeedFallback() {
  return (
    <div className="px-3 sm:px-6">
      <div className="mt-14 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<FeedFallback />}>
      <HomeFeed />
    </Suspense>
  );
}
