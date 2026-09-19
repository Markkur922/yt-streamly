/** Общие DTO-типы ответов API (используются и на клиенте) */

export interface VideoCardData {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  durationSeconds: number;
  views: number;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  category: string;
  tags: string[];
  visibility: string;
  createdAt: string;
  description: string;
  qualities: { label: string; url: string }[];
  author: {
    id: string;
    handle: string;
    name: string;
    avatarUrl: string | null;
    subscribersCount: number;
    isVerified: boolean;
  };
}

export interface CommentData {
  id: string;
  videoId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  myReaction: number; // 1 | -1 | 0
  createdAt: string;
  author: { id: string; handle: string; name: string; avatarUrl: string | null };
  replies?: CommentData[];
}

export interface ChannelData {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  description: string;
  isVerified: boolean;
  subscribersCount: number;
  videosCount: number;
  totalViews: number;
  createdAt: string;
  isSubscribed: boolean;
}

export interface PlaylistData {
  id: string;
  title: string;
  description: string;
  visibility: string;
  createdAt: string;
  owner: { id: string; handle: string; name: string };
  videosCount: number;
  thumbnailUrl: string | null;
  videos?: VideoCardData[];
  containsVideo?: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  hasMore: boolean;
  total?: number;
}
