"use client";

import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/site";

/**
 * 文章管理面板 —— 在 /admin 页面内通过 tab 切换显示。
 *
 * 功能：列表 / 新建 / 编辑（slug + frontmatter + MDX 源码）/ 删除 / 保存。
 * 保存后提示触发重建（PR4 自动，PR3 手动提示）。
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
  /** 列表接口里 tags 是 D1 存的 JSON 字符串；详情接口解析后是数组。 */
  tags: string[] | string;
  published: number;
  updated_at: string;
}

interface PostFull extends PostMeta {
  content_md: string;
}

type EditState = {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  tags: string; // 逗号分隔输入
  content_md: string;
  published: boolean;
  isNew: boolean;
};

const EMPTY: EditState = {
  slug: "",
  title: "",
  date: new Date().toISOString().slice(0, 10),
  category: "",
  description: "",
  tags: "",
  content_md: "",
  published: true,
  isNew: true,
};

export default function PostAdmin({ token }: { token: string }) {
  const [list, setList] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function loadList() {
    setLoading(true);
    try {
      const res = await fetch(api("/api/admin/posts"), {
        headers: { "x-admin-token": token },
      });
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

  async function openEdit(slug: string) {
    const res = await fetch(api(`/api/admin/posts/${slug}`), {
      headers: { "x-admin-token": token },
    });
    const d = (await res.json()) as { post?: PostFull };
    if (d.post) {
      const tags = Array.isArray(d.post.tags)
        ? d.post.tags
        : JSON.parse(d.post.tags || "[]");
      setEdit({
        slug: d.post.slug,
        title: d.post.title,
        date: d.post.date,
        category: d.post.category,
        description: d.post.description,
        tags: tags.join(", "),
        content_md: d.post.content_md,
        published: d.post.published === 1,
        isNew: false,
      });
    }
  }

  function startNew() {
    setEdit({ ...EMPTY });
  }

  async function save() {
    if (!edit) return;
    if (!edit.slug.trim()) {
      setMsg({ kind: "err", text: "slug 不能为空" });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        title: edit.title,
        date: edit.date,
        category: edit.category,
        description: edit.description,
        tags: edit.tags.split(",").map((t) => t.trim()).filter(Boolean),
        content_md: edit.content_md,
        published: edit.published ? 1 : 0,
      };
      const res = await fetch(api(`/api/admin/posts/${edit.slug}`), {
        method: edit.isNew ? "POST" : "PUT",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify(edit.isNew ? { ...body, slug: edit.slug } : body),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) {
        setMsg({ kind: "ok", text: "已保存。构建后生效（PR4 起自动重建）" });
        setEdit({ ...edit, isNew: false });
        loadList();
      } else {
        setMsg({ kind: "err", text: d.error ?? "保存失败" });
      }
    } catch {
      setMsg({ kind: "err", text: "网络错误" });
    } finally {
      setSaving(false);
    }
  }

  async function del(slug: string) {
    if (!confirm(`删除「${slug}」？`)) return;
    await fetch(api(`/api/admin/posts/${slug}`), {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    if (edit?.slug === slug) setEdit(null);
    loadList();
  }

  if (edit) {
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">
            {edit.isNew ? "新建文章" : "编辑"}
          </h2>
          <button
            onClick={() => setEdit(null)}
            className="btn-secondary px-3 py-1 text-xs"
          >
            返回列表
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="slug（URL，小写字母数字横线）">
              <input
                value={edit.slug}
                disabled={!edit.isNew}
                onChange={(e) => setEdit({ ...edit, slug: e.target.value })}
                className="input"
                placeholder="my-post"
              />
            </Field>
            <Field label="日期">
              <input
                value={edit.date}
                onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                className="input"
                placeholder="2025-11-05"
              />
            </Field>
          </div>
          <Field label="标题">
            <input
              value={edit.title}
              onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="分类">
              <input
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                className="input"
                placeholder="Hair / PBR / SSS"
              />
            </Field>
            <Field label="标签（逗号分隔）">
              <input
                value={edit.tags}
                onChange={(e) => setEdit({ ...edit, tags: e.target.value })}
                className="input"
                placeholder="Shader, PBR"
              />
            </Field>
          </div>
          <Field label="摘要">
            <input
              value={edit.description}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="正文（MDX 源码）">
            <textarea
              value={edit.content_md}
              onChange={(e) => setEdit({ ...edit, content_md: e.target.value })}
              rows={16}
              className="input font-mono text-xs"
              placeholder="## 标题&#10;&#10;正文…"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={edit.published}
              onChange={(e) => setEdit({ ...edit, published: e.target.checked })}
            />
            已发布
          </label>
          {msg ? (
            <p className={msg.kind === "ok" ? "text-sm text-[var(--accent)]" : "text-sm text-red-500"}>
              {msg.text}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "保存中…" : "保存"}
            </button>
            {!edit.isNew ? (
              <button onClick={() => del(edit.slug)} className="btn-secondary px-4 py-2 text-sm">
                删除
              </button>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">文章</h2>
        <button onClick={startNew} className="btn-primary px-4 py-1.5 text-sm">
          新建
        </button>
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-[var(--foreground-muted)]">加载中…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((p) => (
            <li
              key={p.slug}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <button onClick={() => openEdit(p.slug)} className="flex-1 text-left">
                <div className="text-sm font-medium">{p.title || p.slug}</div>
                <div className="font-mono text-xs text-[var(--foreground-muted)]">
                  {p.date} · {p.slug} {p.published ? "" : "· 草稿"}
                </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--foreground-muted)]">{label}</span>
      {children}
    </label>
  );
}
