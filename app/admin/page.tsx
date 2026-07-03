"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BASE_PATH } from "@/lib/site";
import PostAdmin from "./posts";

/**
 * 管理后台 —— 阶段 B。
 * 账号 + 密码登录（PBKDF2 哈希存 D1），HttpOnly cookie 保持登录态。
 * 多账号（如 yuye666 / kazamasuichiku），登录任一即可。
 *
 * 登录流程：用户名+密码 → POST /api/admin/login（设 HttpOnly cookie）
 * → 之后 admin 请求自动带 cookie（credentials: "include"），无需手动加 header。
 */

function api(path: string): string {
  return `${BASE_PATH}${path}`;
}

type Tab = "comments" | "posts";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="container-page py-20 text-sm text-[var(--foreground-muted)]">加载…</div>}>
      <AdminInner />
    </Suspense>
  );
}

function AdminInner() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // 表单
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get("tab") === "posts" ? "posts" : "comments";
  const [tab, setTab] = useState<Tab>(initialTab);

  // 加载时探测 cookie 登录态
  useEffect(() => {
    fetch(api("/api/admin/me"), { credentials: "include" })
      .then((r) => r.ok)
      .then((ok) => setAuthed(ok))
      .finally(() => setChecking(false));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(api("/api/admin/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) {
        setAuthed(true);
        setPassword("");
      } else {
        setError(d.error ?? "登录失败");
      }
    } catch {
      setError("网络错误");
    }
  }

  async function logout() {
    await fetch(api("/api/admin/logout"), {
      method: "POST",
      credentials: "include",
    });
    setAuthed(false);
    setUsername("");
    setPassword("");
  }

  if (checking) {
    return (
      <main className="container-page py-20">
        <p className="text-sm text-[var(--foreground-muted)]">检查登录态…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="container-page py-20">
        <div className="mx-auto max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">管理后台</h1>
          <p className="mt-2 text-sm text-[var(--foreground-soft)]">
            账号密码登录
          </p>
          <form onSubmit={login} className="mt-6 space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              autoComplete="username"
              className="input text-sm"
              autoFocus
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              autoComplete="current-password"
              className="input text-sm"
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
        <button onClick={logout} className="btn-secondary px-4 py-1.5 text-sm">
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
      {tab === "comments" ? <CommentAdmin /> : <PostAdmin />}
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
function CommentAdmin() {
  const apiPath = api("/api/admin/comments");
  const [pending, setPending] = useState<
    { id: number; post_slug: string; author: string; body: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  async function loadPending() {
    setLoading(true);
    try {
      const res = await fetch(`${apiPath}?status=pending`, { credentials: "include" });
      const d = (await res.json()) as { comments?: typeof pending };
      setPending(d.comments ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  async function approve(id: number) {
    await fetch(`${apiPath}?action=approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    loadPending();
  }

  async function del(id: number) {
    await fetch(`${apiPath}?action=delete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
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
