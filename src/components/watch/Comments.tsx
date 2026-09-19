"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ThumbsUp,
  ArrowDownWideNarrow,
  Pencil,
  Trash2,
  CornerDownRight,
} from "lucide-react";
import type { CommentData } from "@/lib/types";
import { useAuth, useToast } from "@/components/Providers";
import { Avatar } from "@/components/Avatar";
import { timeAgo, plural } from "@/lib/format";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function CommentItem({
  comment,
  replies,
  depth,
  videoAuthorId,
  onReply,
  onDelete,
  onEdit,
  onLike,
}: {
  comment: CommentData;
  replies: Map<string, CommentData[]>;
  depth: number;
  videoAuthorId?: string;
  onReply: (parentId: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
  onLike: (id: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);
  const [busy, setBusy] = useState(false);

  const childReplies = replies.get(comment.id) ?? [];
  const canManage =
    user && (user.id === comment.author.id || user.id === videoAuthorId);
  const isOwn = user?.id === comment.author.id;

  return (
    <div className={depth > 0 ? "mt-4" : ""}>
      <div className="flex gap-3">
        <Avatar
          src={comment.author.avatarUrl}
          name={comment.author.name}
          size={depth ? 24 : 40}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px]">
            <span
              className={`font-medium ${
                comment.author.id === videoAuthorId ? "text-[#3ea6ff]" : ""
              }`}
            >
              @{comment.author.handle}
            </span>{" "}
            <span className="text-2">{timeAgo(comment.createdAt)}</span>
          </p>

          {editing ? (
            <div className="mt-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="field text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-full px-4 py-1.5 text-sm hoverable"
                >
                  Отмена
                </button>
                <button
                  disabled={!editText.trim() || busy}
                  onClick={async () => {
                    setBusy(true);
                    await onEdit(comment.id, editText.trim());
                    setBusy(false);
                    setEditing(false);
                  }}
                  className="rounded-full bg-[#3ea6ff] px-4 py-1.5 text-sm font-medium text-black disabled:opacity-40"
                >
                  Сохранить
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">
              {comment.content}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-1 text-2">
            <button
              onClick={async () => {
                setBusy(true);
                await onLike(comment.id);
                setBusy(false);
              }}
              disabled={busy}
              aria-label="Нравится"
              className={`rounded-full p-1.5 hoverable ${
                comment.myReaction === 1 ? "text-[#3ea6ff]" : ""
              }`}
            >
              <ThumbsUp
                size={15}
                className={comment.myReaction === 1 ? "fill-[#3ea6ff]" : ""}
              />
            </button>
            {comment.likesCount > 0 && (
              <span className="text-xs">{comment.likesCount}</span>
            )}
            <button
              onClick={() => setReplyOpen((v) => !v)}
              className="ml-1 rounded-full px-3 py-1.5 text-xs font-medium hoverable"
            >
              Ответить
            </button>
            {isOwn && (
              <button
                onClick={() => {
                  setEditing(true);
                  setEditText(comment.content);
                }}
                aria-label="Изменить"
                className="rounded-full p-1.5 hoverable"
              >
                <Pencil size={14} />
              </button>
            )}
            {canManage && (
              <button
                onClick={async () => {
                  if (!confirm("Удалить комментарий?")) return;
                  setBusy(true);
                  await onDelete(comment.id);
                  setBusy(false);
                }}
                aria-label="Удалить"
                className="rounded-full p-1.5 hoverable hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {replyOpen && (
            <div className="mt-2 flex gap-2">
              {user && <Avatar src={user.avatarUrl} name={user.name} size={24} />}
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={1}
                  autoFocus
                  placeholder={
                    user ? "Введите ответ..." : "Войдите, чтобы отвечать"
                  }
                  disabled={!user}
                  className="field text-sm"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setReplyOpen(false);
                      setReplyText("");
                    }}
                    className="rounded-full px-4 py-1.5 text-sm hoverable"
                  >
                    Отмена
                  </button>
                  <button
                    disabled={!replyText.trim() || busy}
                    onClick={async () => {
                      setBusy(true);
                      await onReply(comment.id, replyText.trim());
                      setBusy(false);
                      setReplyText("");
                      setReplyOpen(false);
                      setShowReplies(true);
                    }}
                    className="rounded-full bg-[#3ea6ff] px-4 py-1.5 text-sm font-medium text-black disabled:opacity-40"
                  >
                    Ответить
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {childReplies.length > 0 && (
        <div className={depth === 0 ? "ml-[52px]" : "ml-9"}>
          {depth === 0 && (
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="mt-1 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-[#3ea6ff] hover:bg-[#3ea6ff]/10"
            >
              <CornerDownRight size={15} />
              {showReplies ? "Скрыть" : `${childReplies.length} ${plural(childReplies.length, "ответ", "ответа", "ответов")}`}
            </button>
          )}
          {showReplies &&
            childReplies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                replies={replies}
                depth={depth + 1}
                videoAuthorId={videoAuthorId}
                onReply={async (pid, text) => onReply(comment.id, text)}
                onDelete={onDelete}
                onEdit={onEdit}
                onLike={onLike}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function Comments({
  videoId,
  videoAuthorId,
}: {
  videoId: string;
  videoAuthorId: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<CommentData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [videoId]);

  const { roots, replies } = useMemo(() => {
    const byParent = new Map<string, CommentData[]>();
    const rootList: CommentData[] = [];
    for (const c of items) {
      if (c.parentId) {
        const arr = byParent.get(c.parentId) ?? [];
        arr.push(c);
        byParent.set(c.parentId, arr);
      } else {
        rootList.push(c);
      }
    }
    rootList.sort((a, b) =>
      sort === "top"
        ? b.likesCount - a.likesCount ||
          a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
    for (const arr of byParent.values())
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { roots: rootList, replies: byParent };
  }, [items, sort]);

  const submit = async () => {
    if (!user) {
      toast("Войдите, чтобы комментировать");
      router.push("/auth");
      return;
    }
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    const { ok, data } = await api(`/api/videos/${videoId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    setPosting(false);
    if (ok) {
      setItems((prev) => [...prev, data.comment]);
      setTotal((t) => t + 1);
      setText("");
    } else toast(data.error || "Не удалось отправить");
  };

  const onReply = async (parentId: string, content: string) => {
    if (!user) {
      toast("Войдите, чтобы отвечать");
      router.push("/auth");
      return;
    }
    const { ok, data } = await api(`/api/comments/${parentId}/reply`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    if (ok) {
      setItems((prev) => [...prev, data.comment]);
      setTotal((t) => t + 1);
    } else toast(data.error || "Не удалось отправить");
  };

  const onDelete = async (id: string) => {
    const { ok } = await api(`/api/comments/${id}`, { method: "DELETE" });
    if (ok) {
      setItems((prev) => {
        const removed = new Set([id]);
        prev.filter((c) => c.parentId === id).forEach((c) => removed.add(c.id));
        const next = prev.filter((c) => !removed.has(c.id));
        setTotal(next.length);
        return next;
      });
      toast("Комментарий удалён");
    } else toast("Не удалось удалить");
  };

  const onEdit = async (id: string, content: string) => {
    const { ok } = await api(`/api/comments/${id}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    if (ok)
      setItems((prev) =>
        prev.map((c) => (c.id === id ? { ...c, content } : c)),
      );
    else toast("Не удалось изменить");
  };

  const onLike = async (id: string) => {
    if (!user) {
      toast("Войдите, чтобы ставить лайки");
      router.push("/auth");
      return;
    }
    const { ok, data } = await api(`/api/comments/${id}/like`, {
      method: "POST",
    });
    if (ok)
      setItems((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, likesCount: data.likes, myReaction: data.liked ? 1 : 0 }
            : c,
        ),
      );
  };

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-semibold">
          {total} {plural(total, "комментарий", "комментария", "комментариев")}
        </h2>
        <div className="flex items-center gap-1 text-sm">
          <ArrowDownWideNarrow size={16} className="text-2" />
          <button
            onClick={() => setSort("top")}
            className={`rounded-full px-3 py-1 ${sort === "top" ? "bg-chip font-medium" : "text-2 hoverable"}`}
          >
            Сначала популярные
          </button>
          <button
            onClick={() => setSort("new")}
            className={`rounded-full px-3 py-1 ${sort === "new" ? "bg-chip font-medium" : "text-2 hoverable"}`}
          >
            Сначала новые
          </button>
        </div>
      </div>

      {/* Форма добавления */}
      <div className="mb-6 flex gap-3">
        {user ? (
          <Avatar src={user.avatarUrl} name={user.name} size={40} />
        ) : (
          <Avatar src={null} name="?" size={40} />
        )}
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder={
              user
                ? "Введите комментарий..."
                : "Войдите, чтобы оставить комментарий"
            }
            disabled={!user}
            className="w-full border-b border-var bg-transparent pb-1.5 text-sm outline-none placeholder:text-2 focus:border-[var(--text)]"
          />
          <div className="mt-2 flex justify-end gap-2">
            {text && (
              <button
                onClick={() => setText("")}
                className="rounded-full px-4 py-2 text-sm hoverable"
              >
                Отмена
              </button>
            )}
            <button
              onClick={user ? submit : () => router.push("/auth")}
              disabled={user ? !text.trim() || posting : false}
              className="rounded-full bg-[#3ea6ff] px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Комментировать
            </button>
          </div>
        </div>
      </div>

      {/* Список */}
      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-40 rounded" />
                <div className="skeleton h-3 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : roots.length === 0 ? (
        <p className="rounded-xl bg-secondary p-6 text-center text-sm text-2">
          Комментариев пока нет. Станьте первым!
        </p>
      ) : (
        <div className="space-y-6">
          {roots.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={replies}
              depth={0}
              videoAuthorId={videoAuthorId}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              onLike={onLike}
            />
          ))}
        </div>
      )}
    </section>
  );
}
