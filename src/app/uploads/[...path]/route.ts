import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Отдача локально загруженных файлов из public/uploads.
 * next start не обслуживает файлы, добавленные в public после сборки,
 * поэтому нужен отдельный обработчик. Поддерживает HTTP Range —
 * это необходимо для перемотки видео в HTML5-плеере.
 */

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  const base = path.join(process.cwd(), "public", "uploads");
  const filePath = path.normalize(path.join(base, ...segments));

  // Защита от path traversal
  if (!filePath.startsWith(base + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const ext = (filePath.split(".").pop() || "").toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  let st;
  try {
    st = await stat(filePath);
    if (!st.isFile()) throw new Error("not a file");
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start = m[1] ? parseInt(m[1], 10) : 0;
      let end = m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (!m[1] && m[2]) {
        // формат "bytes=-N" — последние N байт
        start = Math.max(0, st.size - parseInt(m[2], 10));
        end = st.size - 1;
      }
      end = Math.min(end, st.size - 1);
      if (Number.isNaN(start) || start > end || start >= st.size) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${st.size}` },
        });
      }
      const stream = Readable.toWeb(
        createReadStream(filePath, { start, end }),
      ) as ReadableStream;
      return new NextResponse(stream, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${st.size}`,
          "Content-Length": String(end - start + 1),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Content-Length": String(st.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
