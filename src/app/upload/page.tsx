"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  X,
  Globe,
  Link2,
  Lock,
  ImagePlus,
  Film,
} from "lucide-react";
import { useAuth, useToast } from "@/components/Providers";
import { CATEGORIES } from "@/lib/constants";
import { formatDuration } from "@/lib/format";

type Phase = "pick" | "form" | "publishing" | "done" | "error";

const VIS_OPTIONS = [
  {
    value: "public",
    label: "Публичное",
    hint: "Видео увидят все",
    icon: <Globe size={18} />,
  },
  {
    value: "unlisted",
    label: "По ссылке",
    hint: "Только у тех, у кого есть ссылка",
    icon: <Link2 size={18} />,
  },
  {
    value: "private",
    label: "Приватное",
    hint: "Видео видно только вам",
    icon: <Lock size={18} />,
  },
];

export default function UploadPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("pick");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [thumbPreview, setThumbPreview] = useState("");
  const autoThumbRef = useRef<Blob | null>(null);
  const [duration, setDuration] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [category, setCategory] = useState<string>("Развлечения");
  const [visibility, setVisibility] = useState("public");
  const [createdId, setCreatedId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Защита роута: неавторизованных отправляем на форму входа
  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth");
  }, [isLoading, user, router]);

  const pickFile = useCallback(
    (f: File) => {
      if (!f.type.startsWith("video/")) {
        toast("Выберите видеофайл (MP4, WebM)");
        return;
      }
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 150));

      // Читаем длительность и захватываем кадр-превью
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = url;
      probe.muted = true;
      probe.onloadedmetadata = () => {
        setDuration(Math.floor(probe.duration || 0));
        try {
          probe.currentTime = Math.min(1, probe.duration / 2);
          probe.addEventListener(
            "seeked",
            () => {
              const canvas = document.createElement("canvas");
              canvas.width = probe.videoWidth || 640;
              canvas.height = probe.videoHeight || 360;
              const ctx = canvas.getContext("2d");
              if (!ctx) return;
              ctx.drawImage(probe, 0, 0, canvas.width, canvas.height);
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    autoThumbRef.current = blob;
                    setThumbPreview((prev) =>
                      prev && prev.startsWith("blob:custom") ? prev : URL.createObjectURL(blob),
                    );
                  }
                },
                "image/jpeg",
                0.85,
              );
            },
            { once: true },
          );
        } catch {
          /* кросс-доменные ограничения — пропускаем */
        }
      };
      setPhase("form");
    },
    [toast],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t) && tags.length < 15) setTags((p) => [...p, t]);
    setTagInput("");
  };

  /** Единый запрос: файл + превью + метаданные → POST /api/videos/upload */
  const publish = () => {
    if (!file) return;
    if (title.trim().length < 3) {
      toast("Введите название (минимум 3 символа)");
      return;
    }
    setPhase("publishing");
    setProgress(0);

    const form = new FormData();
    form.append("file", file);
    // своё превью либо авто-кадр из видео
    if (thumbFile) form.append("thumbnail", thumbFile);
    else if (autoThumbRef.current)
      form.append(
        "thumbnail",
        new File([autoThumbRef.current], "thumb.jpg", { type: "image/jpeg" }),
      );
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("category", category);
    form.append("visibility", visibility);
    form.append("durationSeconds", String(duration));
    form.append("tags", JSON.stringify(tags));

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/videos/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* noop */
      }
      if (xhr.status === 401) {
        toast("Сессия истекла. Войдите снова.");
        router.push("/auth");
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.video) {
        setCreatedId((data.video as { id: string }).id);
        setPhase("done");
      } else {
        setErrorMsg(String(data.error || "Не удалось опубликовать видео"));
        setPhase("error");
      }
    };
    xhr.onerror = () => {
      setErrorMsg("Сетевая ошибка при загрузке. Попробуйте ещё раз.");
      setPhase("error");
    };
    xhr.send(form);
  };

  const reset = () => {
    xhrRef.current?.abort();
    setPhase("pick");
    setProgress(0);
    setErrorMsg("");
    setFile(null);
    setThumbFile(null);
    setPreviewUrl("");
    setThumbPreview("");
    autoThumbRef.current = null;
    setTitle("");
    setDescription("");
    setTags([]);
    setDuration(0);
    setCreatedId("");
  };

  /* ---------------------------- Экраны ---------------------------------- */
  if (isLoading || !user)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 size={32} className="animate-spin text-2" />
      </div>
    );

  if (phase === "done")
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle2 size={64} className="mx-auto text-green-500" />
        <h1 className="mt-4 text-2xl font-bold">Видео опубликовано!</h1>
        <p className="mt-2 text-sm text-2">
          {visibility === "public"
            ? "Оно уже доступно зрителям — смотрите его на главной и в своём профиле."
            : visibility === "unlisted"
              ? "Его увидят только те, у кого есть ссылка."
              : "Оно видно только вам."}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/watch/${createdId}`}
            className="rounded-full bg-[#ff0000] px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            Смотреть видео
          </Link>
          <button
            onClick={reset}
            className="rounded-full bg-chip px-6 py-3 text-sm font-semibold hoverable"
          >
            Загрузить ещё
          </button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Загрузка видео</h1>

      {phase === "pick" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-6 flex min-h-[380px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver ? "border-[#ff0000] bg-[#ff0000]/5" : "border-var"
          }`}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-chip">
            <UploadCloud size={36} className="text-2" />
          </div>
          <p className="mt-5 text-lg font-medium">Перетащите видеофайл сюда</p>
          <p className="mt-1 text-sm text-2">
            Форматы: MP4, WebM — до 1 ГБ. Файлы загружаются в облако Cloudinary
            и раздаются через CDN.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 rounded-full bg-[#ff0000] px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Выбрать файл
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,.mp4,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,340px]">
          {/* Левая колонка: метаданные */}
          <div className="space-y-4">
            {phase === "error" && (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Название (обязательно)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                placeholder="Добавьте название, которое описывает ваше видео"
                className="field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={5000}
                placeholder="Расскажите зрителям о видео"
                className="field resize-y"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Теги</label>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-var p-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs"
                  >
                    #{t}
                    <button
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      aria-label="Удалить тег"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder={tags.length ? "" : "Тег — Enter для добавления"}
                  className="min-w-32 flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-2"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field bg-base"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Доступ</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {VIS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setVisibility(o.value)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      visibility === o.value
                        ? "border-[#ff0000] bg-[#ff0000]/5"
                        : "border-var hoverable"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {o.icon} {o.label}
                    </span>
                    <span className="mt-1 block text-xs text-2">{o.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Миниатюра (превью, JPG/PNG)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => thumbInputRef.current?.click()}
                  className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-var bg-chip hoverable"
                >
                  {thumbPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbPreview}
                      alt="Превью"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus size={22} className="text-2" />
                  )}
                </button>
                <p className="text-xs leading-relaxed text-2">
                  Кадр из видео выбран автоматически.
                  <br />
                  Нажмите, чтобы загрузить своё изображение.
                </p>
              </div>
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setThumbFile(f);
                  autoThumbRef.current = null;
                  setThumbPreview("blob:custom" + URL.createObjectURL(f));
                  setThumbPreview(URL.createObjectURL(f));
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Правая колонка: превью + публикация */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-var bg-secondary">
              <div className="aspect-video w-full bg-black">
                {previewUrl && (
                  <video src={previewUrl} controls className="h-full w-full" />
                )}
              </div>
              <div className="p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Film size={15} className="shrink-0 text-2" />
                  <span className="truncate">{file?.name}</span>
                </p>
                <p className="mt-1 text-xs text-2">
                  {file ? (file.size / 1024 / 1024).toFixed(1) : 0} МБ
                  {duration ? ` · ${formatDuration(duration)}` : ""}
                </p>
              </div>
            </div>

            {phase === "publishing" && (
              <div className="rounded-2xl border border-var bg-secondary p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Loader2 size={15} className="animate-spin" />
                  {progress < 100
                    ? "Загрузка файла…"
                    : "Отправляем в Cloudinary и готовим 360p/720p/1080p…"}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-chip">
                  <div
                    className="h-full rounded-full bg-[#ff0000] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-2">{progress}%</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={reset}
                disabled={phase === "publishing"}
                className="rounded-full bg-chip px-5 py-2.5 text-sm font-medium hoverable disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={publish}
                disabled={phase === "publishing" || !file}
                className="flex items-center gap-2 rounded-full bg-[#ff0000] px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {phase === "publishing" && (
                  <Loader2 size={15} className="animate-spin" />
                )}
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
