"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH } from "@/lib/site";

/**
 * 文章管理面板 —— 在 /admin 页面内通过 tab 切换显示。
 *
 * 仅负责列表 + 删除 + 跳转到专业编辑器（/admin/editor）。
 * 编辑/新建在专业编辑器（Milkdown 富文本 + CodeMirror 源码）里完成。
 * 鉴权靠 HttpOnly cookie（credentials: "include"）。
 */

function api(path: string): string {
  return `${BASE_PATH}${path}`;
}

interface PostMeta {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  /** 列表接口里 tags 是 D1 存的 JSON 字符串。 */
  tags: string[] | string;
  published: number;
  updated_at: string;
}

export default function PostAdmin() {
  const router = useRouter();
  const [list, setList] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function loadList() {
    setLoading(true);
    try {
      const res = await fetch(api("/api/admin/posts"), { credentials: "include" });
      const d = (await res.json()) as { posts?: PostMeta[] };
      setList(d.posts ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function del(slug: string) {
    if (!confirm(`删除「${slug}」？`)) return;
    const res = await fetch(api(`/api/admin/posts/${slug}`), {
      method: "DELETE",
      credentials: "include",
    });
    const d = (await res.json()) as { rebuild?: boolean };
    loadList();
    if (d.rebuild) {
      setMsg({ kind: "ok", text: "已删除，已触发重建（约 1-2 分钟后生效）" });
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">文章</h2>
        <button
          onClick={() => router.push("/admin/editor")}
          className="btn-primary px-4 py-1.5 text-sm"
        >
          新建
        </button>
      </div>
      {msg ? (
        <p
          className={
            "mt-3 text-sm " +
            (msg.kind === "ok" ? "text-[var(--accent)]" : "text-red-500")
          }
        >
          {msg.text}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-3 text-sm text-[var(--foreground-muted)]">加载中…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((p) => (
            <li
              key={p.slug}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <button
                onClick={() =>
                  router.push(`/admin/editor?slug=${encodeURIComponent(p.slug)}`)
                }
                className="flex-1 text-left"
              >
                <div className="text-sm font-medium">{p.title || p.slug}</div>
                <div className="font-mono text-xs text-[var(--foreground-muted)]">
                  {p.date} · {p.slug} {p.published ? "" : "· 草稿"}
                </div>
              </button>
              <button
                onClick={() => del(p.slug)}
                className="btn-secondary px-3 py-1 text-xs text-red-500"
                title="删除"
              >
                删除
              </button>
            </li>
          ))}
          {list.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">还没有文章</p>
          ) : null}
        </ul>
      )}
    </section>
  );
}
