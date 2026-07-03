"use client";

import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/site";
import PostAdmin from "./posts";

/**
 * 管理后台 —— 阶段 B。
 * 单用户口令登录（不接 OAuth，你一人用）。
 * PR2：评论审核；PR3：文章管理。
 *
 * 登录流程：输入口令 → 调 /api/admin/comments 试鉴权 → 成功则存 localStorage，
 * 之后管理请求都带 x-admin-token header。
 */

function api(path: string): string {
  return `${BASE_PATH}${path}`;
}

type Tab = "comments" | "posts";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("comments");

  useEffect(() => {
    const saved = localStorage.getItem("admin_token");
    if (saved) {
      setToken(saved);
      setAuthed(true);
    }
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // 用拉待审核评论试鉴权
    try {
      const res = await fetch(api("/api/admin/comments?status=pending"), {
        headers: { "x-admin-token": token },
      });
      if (res.ok) {
        localStorage.setItem("admin_token", token);
        setAuthed(true);
      } else {
        setError("口令错误");
      }
    } catch {
      setError("网络错误");
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    setToken("");
    setAuthed(false);
  }

  if (!authed) {
    return (
      <main className="container-page py-20">
        <div className="mx-auto max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">管理后台</h1>
          <p className="mt-2 text-sm text-[var(--foreground-soft)]">
            输入口令登录
          </p>
          <form onSubmit={login} className="mt-6 space-y-3">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="管理口令"
              className="input text-sm"
              autoFocus
            />
            {error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : null}
            <button type="submit" className="btn-primary w-full px-5 py-2 text-sm">
              登录
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="container-page py-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">管理后台</h1>
        <button
          onClick={logout}
          className="btn-secondary px-4 py-1.5 text-sm"
        >
          退出
        </button>
      </div>
      <div className="mt-6 flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-sm">
        <TabBtn active={tab === "comments"} onClick={() => setTab("comments")}>
          评论
        </TabBtn>
        <TabBtn active={tab === "posts"} onClick={() => setTab("posts")}>
          文章
        </TabBtn>
      </div>
      {tab === "comments" ? <CommentAdmin token={token} /> : <PostAdmin token={token} />}
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 rounded-full px-4 py-1.5 transition-colors " +
        (active
          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]")
      }
    >
      {children}
    </button>
  );
}

/** 评论审核面板 */
function CommentAdmin({ token }: { token: string }) {
  const apiPath = api("/api/admin/comments");
  const [pending, setPending] = useState<
    { id: number; post_slug: string; author: string; body: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  async function loadPending() {
    setLoading(true);
    try {
      const res = await fetch(`${apiPath}?status=pending`, {
        headers: { "x-admin-token": token },
      });
      const d = (await res.json()) as { comments?: typeof pending };
      setPending(d.comments ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(id: number) {
    await fetch(`${apiPath}?action=approve`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id }),
    });
    loadPending();
  }

  async function del(id: number) {
    await fetch(`${apiPath}?action=delete`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id }),
    });
    loadPending();
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-medium">待审核评论</h2>
      {loading ? (
        <p className="mt-3 text-sm text-[var(--foreground-muted)]">加载中…</p>
      ) : pending.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--foreground-muted)]">没有待审核评论</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pending.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{c.author || "匿名"}</span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {c.post_slug}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground-soft)]">
                {c.body}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approve(c.id)}
                  className="btn-primary px-3 py-1 text-xs"
                >
                  通过
                </button>
                <button
                  onClick={() => del(c.id)}
                  className="btn-secondary px-3 py-1 text-xs"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
