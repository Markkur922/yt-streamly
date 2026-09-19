import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  smallint,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Роли пользователей
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// ---------------------------------------------------------------------------
// Пользователи / каналы (канал = пользователь на платформе)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  handle: text("handle").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  isBanned: boolean("is_banned").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  warningsCount: integer("warnings_count").notNull().default(0),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  description: text("description").notNull().default(""),
  subscribersCount: integer("subscribers_count").notNull().default(0),
  notifyUploads: boolean("notify_uploads").notNull().default(true),
  notifyReplies: boolean("notify_replies").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Видео
// ---------------------------------------------------------------------------
export type VideoQuality = { label: string; url: string };

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("Развлечения"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    thumbnailUrl: text("thumbnail_url"),
    videoUrl: text("video_url").notNull(),
    // Идентификаторы ассетов в Cloudinary (нужны для удаления из облака)
    videoPublicId: text("video_public_id"),
    thumbnailPublicId: text("thumbnail_public_id"),
    storageProvider: text("storage_provider").notNull().default("local"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    views: integer("views").notNull().default(0),
    likesCount: integer("likes_count").notNull().default(0),
    dislikesCount: integer("dislikes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    visibility: text("visibility").notNull().default("public"), // public | unlisted | private
    qualities: jsonb("qualities").$type<VideoQuality[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("videos_author_idx").on(t.authorId),
    index("videos_category_idx").on(t.category),
    index("videos_created_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Комментарии (поддержка вложенных ответов через parentId)
// ---------------------------------------------------------------------------
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    content: text("content").notNull(),
    likesCount: integer("likes_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("comments_video_idx").on(t.videoId)],
);

// ---------------------------------------------------------------------------
// Лайки / дизлайки (видео и комментарии). value: 1 = лайк, -1 = дизлайк
// ---------------------------------------------------------------------------
export const likes = pgTable(
  "likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id").references(() => videos.id, {
      onDelete: "cascade",
    }),
    commentId: uuid("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("likes_user_video_idx").on(t.userId, t.videoId),
    uniqueIndex("likes_user_comment_idx").on(t.userId, t.commentId),
  ],
);

// ---------------------------------------------------------------------------
// Подписки
// ---------------------------------------------------------------------------
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("subs_pair_idx").on(t.subscriberId, t.channelId)],
);

// ---------------------------------------------------------------------------
// История просмотров
// ---------------------------------------------------------------------------
export const watchHistory = pgTable(
  "watch_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    watchedAt: timestamp("watched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("history_user_video_idx").on(t.userId, t.videoId)],
);

// ---------------------------------------------------------------------------
// Плейлисты
// ---------------------------------------------------------------------------
export const playlists = pgTable("playlists", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  visibility: text("visibility").notNull().default("private"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const playlistVideos = pgTable(
  "playlist_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("playlist_video_pair_idx").on(t.playlistId, t.videoId)],
);

// ---------------------------------------------------------------------------
// Уведомления
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    link: text("link"),
    avatarUrl: text("avatar_url"),
    thumbnailUrl: text("thumbnail_url"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
