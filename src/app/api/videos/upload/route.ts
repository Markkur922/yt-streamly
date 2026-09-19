import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videos, users, subscriptions, notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { toCard } from "@/lib/video-queries";
import { CATEGORIES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import {
  uploadVideo,
  uploadImage,
  buildVideoRenditions,
  buildVideoPoster,
  isCloudinaryConfigured,
} from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_VIDEO = 1024 * 1024 * 1024; // 1 ГБ
const MAX_IMAGE = 10 * 1024 * 1024; // 10 МБ

/**
 * POST /api/videos/upload
 *
 * Принимает multipart/form-data:
 *   file        — видеофайл (обязателен),
 *   thumbnail   — изображение превью (необязательно),
 *   title, description, category, visibility, tags[], durationSeconds.
 *
 * Файлы уходят в Cloudinary, в Neon/PostgreSQL сохраняются прямые CDN-ссылки
 * (secure_url) и public_id. authorId берётся ТОЛЬКО из JWT-сессии.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 },
      );
    if (user.isBanned)
      return NextResponse.json(
        { error: "Ваш аккаунт заблокирован" },
        { status: 403 },
      );
    const rl = rateLimit(`upload-video:${user.id}`, 15, 60_000);
    if (!rl.ok)
      return NextResponse.json(
        { error: "Слишком часто. Попробуйте через минуту." },
        { status: 429 },
      );

    const form = await req.formData();

    // --- Видеофайл ---
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json(
        { error: "Видеофайл не найден" },
        { status: 400 },
      );
    if (!file.type.startsWith("video/"))
      return NextResponse.json(
        { error: "Ожидается видеофайл (MP4, WebM)" },
        { status: 400 },
      );
    if (file.size > MAX_VIDEO)
      return NextResponse.json({ error: "Видео больше 1 ГБ" }, { status: 413 });

    // --- Метаданные ---
    const title = String(form.get("title") || "").trim();
    if (title.length < 3 || title.length > 150)
      return NextResponse.json(
        { error: "Название: от 3 до 150 символов" },
        { status: 400 },
      );
    const description = String(form.get("description") || "").slice(0, 5000);
    const category = CATEGORIES.includes(String(form.get("category")) as never)
      ? String(form.get("category"))
      : "Развлечения";
    const visibility = ["public", "unlisted", "private"].includes(
      String(form.get("visibility")),
    )
      ? String(form.get("visibility"))
      : "public";
    let durationSeconds = Math.max(
      0,
      Math.floor(Number(form.get("durationSeconds")) || 0),
    );
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(String(form.get("tags") || "[]"));
      if (Array.isArray(parsed)) tags = parsed.map(String).slice(0, 15);
    } catch {
      tags = [];
    }

    // --- Проверка превью до тяжёлой загрузки видео ---
    const thumb = form.get("thumbnail");
    const hasThumb = thumb instanceof File && thumb.size > 0;
    if (hasThumb) {
      if (!thumb.type.startsWith("image/"))
        return NextResponse.json(
          { error: "Превью должно быть изображением (JPG/PNG)" },
          { status: 400 },
        );
      if (thumb.size > MAX_IMAGE)
        return NextResponse.json(
          { error: "Превью больше 10 МБ" },
          { status: 413 },
        );
    }

    // --- Загрузка видео в облако ---
    let videoAsset;
    try {
      videoAsset = await uploadVideo(file);
    } catch (e) {
      console.error("[videos/upload] Ошибка загрузки видео:", e);
      return NextResponse.json(
        {
          error:
            "Не удалось загрузить видео в облако. Проверьте ключи Cloudinary и размер файла.",
        },
        { status: 502 },
      );
    }
    // Cloudinary возвращает точную длительность — доверяем ей
    if (videoAsset.durationSeconds) durationSeconds = videoAsset.durationSeconds;

    // --- Загрузка превью (или авто-кадр средствами Cloudinary) ---
    let thumbnailUrl: string | null = null;
    let thumbnailPublicId: string | null = null;
    if (hasThumb) {
      try {
        const asset = await uploadImage(thumb);
        thumbnailUrl = asset.url;
        thumbnailPublicId = asset.publicId;
      } catch (e) {
        console.error("[videos/upload] Ошибка загрузки превью:", e);
      }
    }
    if (!thumbnailUrl) thumbnailUrl = buildVideoPoster(videoAsset);

    // --- Запись в БД: сохраняем прямые ссылки Cloudinary ---
    const [video] = await db
      .insert(videos)
      .values({
        authorId: user.id,
        title,
        description,
        category,
        tags,
        thumbnailUrl,
        thumbnailPublicId,
        videoUrl: videoAsset.url,
        videoPublicId: videoAsset.publicId,
        storageProvider: videoAsset.provider,
        durationSeconds,
        visibility,
        qualities: buildVideoRenditions(videoAsset),
      })
      .returning();

    // Уведомляем подписчиков канала
    if (visibility === "public") {
      const subs = await db
        .select({ subscriberId: subscriptions.subscriberId })
        .from(subscriptions)
        .where(eq(subscriptions.channelId, user.id))
        .limit(500);
      if (subs.length) {
        await db.insert(notifications).values(
          subs.map((s) => ({
            userId: s.subscriberId,
            text: `${user.name} опубликовал(а) новое видео: «${title}»`,
            link: `/watch/${video.id}`,
            avatarUrl: user.avatarUrl,
            thumbnailUrl,
          })),
        );
      }
    }

    const [author] = await db
      .select({
        id: users.id,
        handle: users.handle,
        name: users.name,
        avatarUrl: users.avatarUrl,
        subscribersCount: users.subscribersCount,
        isVerified: users.isVerified,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    return NextResponse.json(
      {
        video: toCard(video, author ?? user),
        storage: videoAsset.provider,
        cloudinary: isCloudinaryConfigured,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[videos/upload] Ошибка:", e);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера. Попробуйте позже." },
      { status: 500 },
    );
  }
}
