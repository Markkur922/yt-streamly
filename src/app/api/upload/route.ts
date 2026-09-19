import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { uploadImage, uploadVideo } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_VIDEO = 1024 * 1024 * 1024; // 1 ГБ
const MAX_IMAGE = 10 * 1024 * 1024; // 10 МБ

/**
 * POST /api/upload — загрузка одиночного файла (аватар, баннер, превью).
 * Файл уходит в Cloudinary; возвращается прямая CDN-ссылка и public_id.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 },
      );

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "image");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (kind === "video" && !isVideo)
      return NextResponse.json({ error: "Ожидается видеофайл" }, { status: 400 });
    if (kind === "image" && !isImage)
      return NextResponse.json(
        { error: "Ожидается изображение" },
        { status: 400 },
      );
    if (isVideo && file.size > MAX_VIDEO)
      return NextResponse.json({ error: "Видео больше 1 ГБ" }, { status: 413 });
    if (isImage && file.size > MAX_IMAGE)
      return NextResponse.json(
        { error: "Изображение больше 10 МБ" },
        { status: 413 },
      );

    const asset = isVideo ? await uploadVideo(file) : await uploadImage(file);

    return NextResponse.json({
      url: asset.url,
      publicId: asset.publicId,
      provider: asset.provider,
    });
  } catch (e) {
    console.error("[upload] Ошибка:", e);
    return NextResponse.json(
      { error: "Не удалось загрузить файл. Проверьте настройки Cloudinary." },
      { status: 502 },
    );
  }
}
