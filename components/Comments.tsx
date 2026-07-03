"use client";

import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 自建评论组件 —— 阶段 B。
 *
 * 数据走站点同源 API：
 *   GET  /api/comments?slug=xxx   拉已审核评论
 *   POST /api/comments            提交评论（待审核）
 * 读者匿名/昵称，无需登录。
 *
 * 替换了之前的 Giscus（需仓库所有者配置且报 403）。
 */

interface Comment {
  id: number;
  post_slug: string;
  author: string;
  body: string;
  created_at: string;
}

interface CommentsProps {
  /** 文章 slug，用于隔离各文章评论 */
  slug: string;
}

function api(path: string): string {
  // 同源 API，拼 basePath（子路径部署必需；根路径时 BASE_PATH 为空串）
  return `${BASE_PATH}${path}`;
}

function formatDate(s: string): string {
  if (!s) return "";
  // D1 存的是 UTC datetime，前端简单展示日期部分
  const d = new Date(s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Comments({ slug }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  // 待审核评论 —— 仅作者（HttpOnly cookie 登录）可见，就地审核
  const [pending, setPending] = useState<Comment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  // 表单
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");

  // 检测作者登录态（HttpOnly cookie，JS 读不到，用 /api/admin/me 探测）
  useEffect(() => {
    let cancelled = false;
    fetch(api("/api/admin/me"), { credentials: "include" })
      .then((r) => r.ok)
      .then((ok) => !cancelled && setIsAdmin(ok))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 拉评论：已审核（公开）+ 待审核（仅作者）
  useEffect(() => {
    let cancelled = false;
    const encoded = encodeURIComponent(slug);
    const ok = fetch(api(`/api/comments?slug=${encoded}`))
      .then((r) => r.json())
      .then((d: { comments?: Comment[] }) => {
        if (!cancelled) setComments(d.comments ?? []);
      })
      .catch(() => {});
    // 作者登录后额外拉待审核，再按当前文章 slug 过滤（admin 接口返回全量 pending）
    const pen = isAdmin
      ? fetch(api(`/api/admin/comments?status=pending`), {
          credentials: "include",
        })
          .then((r) => (r.ok ? r.json() : { comments: [] }))
          .then((d: { comments?: (Comment & { post_slug: string })[] }) => {
            if (!cancelled)
              setPending(
                (d.comments ?? []).filter((c) => c.post_slug === slug),
              );
          })
          .catch(() => {})
      : Promise.resolve();
    Promise.all([ok, pen]).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug, isAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setMsg({ kind: "err", text: "评论内容不能为空" });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(api("/api/comments"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          author: author.trim() || "匿名",
          email: email.trim(),
          body: body.trim(),
        }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) {
        setMsg({ kind: "ok", text: "评论已提交，审核后会显示" });
        setBody("");
      } else {
        setMsg({ kind: "err", text: d.error ?? "提交失败" });
      }
    } catch {
      setMsg({ kind: "err", text: "网络错误，稍后再试" });
    } finally {
      setSubmitting(false);
    }
  }

  // 作者就地审核：通过 → 移入已审核列表；删除 → 直接移除
  async function moderate(id: number, action: "approve" | "delete") {
    if (!isAdmin) return;
    try {
      const res = await fetch(api(`/api/admin/comments?action=${action}`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const d = (await res.json()) as { ok?: boolean };
      if (res.ok && d.ok) {
        if (action === "approve") {
          const c = pending.find((x) => x.id === id);
          if (c) setComments((prev) => [c, ...prev]);
        }
        setPending((prev) => prev.filter((x) => x.id !== id));
      }
    } catch {
      /* 静默失败，作者可重试 */
    }
  }

  return (
    <section
      aria-label="评论"
      className="mt-16 border-t border-[var(--border)] pt-10"
    >
      <h2 className="text-base font-medium text-[var(--foreground)]">评论</h2>
      <p className="mt-1 text-sm text-[var(--foreground-soft)]">
        昵称留言，审核后显示
      </p>

      {/* 评论列表 */}
      <div className="mt-6 space-y-5">
        {loading ? (
          <p className="text-sm text-[var(--foreground-muted)]">加载中…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">
            还没有评论，来写第一条吧。
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {c.author || "匿名"}
                </span>
                <time className="font-mono text-xs text-[var(--foreground-muted)]">
                  {formatDate(c.created_at)}
                </time>
              </div>
              {/* body 已在服务端做基本转义，React 默认再次转义，双重保险防 XSS */}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground-soft)]">
                {c.body}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 待审核 —— 仅作者可见，就地审核 */}
      {isAdmin && pending.length > 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border-strong)] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--foreground)]">
              待审核（{pending.length}）
            </h3>
            <span className="text-xs text-[var(--foreground-muted)]">
              作者视图 · 仅你可见
            </span>
          </div>
          <ul className="mt-3 space-y-3">
            {pending.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {c.author || "匿名"}
                  </span>
                  <time className="font-mono text-xs text-[var(--foreground-muted)]">
                    {formatDate(c.created_at)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground-soft)]">
                  {c.body}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => moderate(c.id, "approve")}
                    className="btn-primary px-3 py-1 text-xs"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => moderate(c.id, "delete")}
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 提交表单 */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="昵称（可选，默认匿名）"
            maxLength={40}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱（可选，不公开）"
            maxLength={100}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
          />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="写下你的评论…"
          maxLength={2000}
          rows={4}
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
        />
        {msg ? (
          <p
            className={cn(
              "text-sm",
              msg.kind === "ok"
                ? "text-[var(--accent)]"
                : "text-red-500",
            )}
          >
            {msg.text}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-1.5 px-5 py-2 text-sm disabled:opacity-60"
          >
            {submitting ? "提交中…" : "提交评论"}
          </button>
        </div>
      </form>
    </section>
  );
}
