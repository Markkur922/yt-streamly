import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Слой хранения медиа.
 *
 * Основной драйвер — Cloudinary: файл уходит в облако, в БД сохраняется
 * прямая CDN-ссылка (secure_url) и public_id (нужен для удаления).
 *
 * Если переменные окружения Cloudinary не заданы, автоматически включается
 * резервный локальный драйвер (public/uploads), чтобы проект оставался
 * работоспособным без облачных ключей.
 */

const CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  "";
const API_KEY = process.env.CLOUDINARY_API_KEY || "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const FOLDER = process.env.CLOUDINARY_FOLDER || "streamly";

/** Настроен ли Cloudinary (есть все три ключа либо CLOUDINARY_URL) */
export const isCloudinaryConfigured = Boolean(
  (CLOUD_NAME && API_KEY && API_SECRET) || process.env.CLOUDINARY_URL,
);

if (isCloudinaryConfigured) {
  // CLOUDINARY_URL подхватывается SDK автоматически; явные ключи имеют приоритет
  if (CLOUD_NAME && API_KEY && API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUD_NAME,
      api_key: API_KEY,
      api_secret: API_SECRET,
      secure: true,
    });
  } else {
    cloudinary.config({ secure: true });
  }
}

export interface StoredAsset {
  /** Прямая ссылка на файл (CDN Cloudinary или локальный /uploads/...) */
  url: string;
  /** Идентификатор в Cloudinary; null для локального хранилища */
  publicId: string | null;
  /** Длительность в секундах (для видео), если её вернуло облако */
  durationSeconds?: number;
  width?: number;
  height?: number;
  provider: "cloudinary" | "local";
}

/* -------------------------------------------------------------------------- */
/*                               Cloudinary                                   */
/* -------------------------------------------------------------------------- */

function uploadBuffer(
  buffer: Buffer,
  resourceType: "video" | "image",
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const options = {
      resource_type: resourceType,
      folder: `${FOLDER}/${resourceType === "video" ? "videos" : "thumbnails"}`,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      // Для изображений сразу оптимизируем вес и формат
      ...(resourceType === "image"
        ? { transformation: [{ quality: "auto", fetch_format: "auto" }] }
        : {}),
    };

    const handler = (
      error: unknown,
      result: UploadApiResponse | undefined,
    ) => {
      if (error || !result) {
        reject(error instanceof Error ? error : new Error("Ошибка Cloudinary"));
        return;
      }
      resolve(result);
    };

    // Видео больше ~90 МБ грузим чанками, остальное — обычным потоком
    const stream =
      resourceType === "video" && buffer.byteLength > 90_000_000
        ? cloudinary.uploader.upload_large_stream(
            { ...options, chunk_size: 20_000_000 },
            handler,
          )
        : cloudinary.uploader.upload_stream(options, handler);

    stream.end(buffer);
  });
}

/* -------------------------------------------------------------------------- */
/*                            Локальный резерв                                */
/* -------------------------------------------------------------------------- */

async function saveLocally(
  buffer: Buffer,
  filename: string,
  subdir: "videos" | "thumbnails",
): Promise<StoredAsset> {
  const ext =
    (filename.split(".").pop() || (subdir === "videos" ? "mp4" : "jpg"))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 5) || "bin";
  const name = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return {
    url: `/uploads/${subdir}/${name}`,
    publicId: null,
    provider: "local",
  };
}

/* -------------------------------------------------------------------------- */
/*                              Публичный API                                 */
/* -------------------------------------------------------------------------- */

export async function uploadVideo(file: File): Promise<StoredAsset> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isCloudinaryConfigured) return saveLocally(buffer, file.name, "videos");

  const res = await uploadBuffer(buffer, "video");
  return {
    url: res.secure_url,
    publicId: res.public_id,
    durationSeconds: res.duration ? Math.round(res.duration) : undefined,
    width: res.width,
    height: res.height,
    provider: "cloudinary",
  };
}

export async function uploadImage(file: File): Promise<StoredAsset> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isCloudinaryConfigured)
    return saveLocally(buffer, file.name, "thumbnails");

  const res = await uploadBuffer(buffer, "image");
  return {
    url: res.secure_url,
    publicId: res.public_id,
    width: res.width,
    height: res.height,
    provider: "cloudinary",
  };
}

/**
 * Удаляет ассет: из Cloudinary по public_id либо локальный файл по URL.
 * Ошибки подавляются — удаление записи в БД не должно падать из-за хранилища.
 */
export async function deleteAsset(
  publicId: string | null | undefined,
  url: string | null | undefined,
  kind: "video" | "image",
) {
  if (publicId && isCloudinaryConfigured) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: kind === "video" ? "video" : "image",
        invalidate: true,
      });
    } catch (e) {
      console.error("[storage] Не удалось удалить из Cloudinary:", e);
    }
    return;
  }
  if (url && url.startsWith("/uploads/")) {
    const safe = path.normalize(url).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(process.cwd(), "public", safe);
    const base = path.join(process.cwd(), "public", "uploads");
    if (!filePath.startsWith(base)) return;
    try {
      await unlink(filePath);
    } catch {
      /* файла может не быть — не страшно */
    }
  }
}

/**
 * Рендиции качества для плеера.
 * Cloudinary отдаёт реально перекодированные MP4 нужной высоты —
 * переключатель качества в плеере становится рабочим.
 */
export function buildVideoRenditions(
  asset: Pick<StoredAsset, "url" | "publicId" | "provider" | "height">,
): { label: string; url: string }[] {
  if (asset.provider !== "cloudinary" || !asset.publicId) {
    // Локальный файл — одна дорожка
    return [
      { label: "1080p", url: asset.url },
      { label: "720p", url: asset.url },
      { label: "360p", url: asset.url },
    ];
  }

  const rendition = (height: number) =>
    cloudinary.url(asset.publicId as string, {
      resource_type: "video",
      format: "mp4",
      secure: true,
      transformation: [
        { height, crop: "scale", quality: "auto", fetch_format: "mp4" },
      ],
    });

  const sourceHeight = asset.height ?? 1080;
  const ladder = [1080, 720, 360].filter((h) => h <= sourceHeight);
  // Если исходник ниже 360p — отдаём хотя бы оригинал
  const list = ladder.length
    ? ladder.map((h) => ({ label: `${h}p`, url: rendition(h) }))
    : [];

  return [{ label: "Авто", url: asset.url }, ...list];
}

/** Постер (превью) прямо из кадра видео средствами Cloudinary */
export function buildVideoPoster(
  asset: Pick<StoredAsset, "publicId" | "provider">,
): string | null {
  if (asset.provider !== "cloudinary" || !asset.publicId) return null;
  return cloudinary.url(asset.publicId, {
    resource_type: "video",
    format: "jpg",
    secure: true,
    transformation: [
      { start_offset: "auto", width: 1280, crop: "scale", quality: "auto" },
    ],
  });
}
