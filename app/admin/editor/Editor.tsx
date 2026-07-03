"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { BASE_PATH } from "@/lib/site";
import { useDraft } from "./useDraft";
import Toolbar from "./Toolbar";

// 编辑器主体（Milkdown/CodeMirror/unified）很重，动态导入 + 禁用 SSR：
//   - 首屏只加载轻量 shell（Toolbar/frontmatter/预览框架）
//   - Milkdown 与 CodeMirror 互斥显示，进一步 code-split
const RichEditor = dynamic(() => import("./RichEditor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
const SourceEditor = dynamic(() => import("./SourceEditor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
const Preview = dynamic(() => import("./Preview"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

function EditorSkeleton() {
  return (
    <div className="flex h-full min-h-[500px] items-center justify-center text-xs text-[var(--foreground-muted)]">
      加载编辑器…
    </div>
  );
}

/**
 * 专业文章编辑器 —— 混合模式（富文本 / MDX 源码切换）+ 工具栏 + 自动草稿 + 全屏。
 *
 * 数据流：
 *   加载（GET /api/admin/posts/:slug）→ 编辑 → 自动存草稿（localStorage）
 *   → 显式保存（PUT/POST）→ 清草稿 → 触发重建（Deploy Hook）
 *
 * 模式：
 *   rich  —— Milkdown 富文本所见即所得
 *   source —— CodeMirror MDX 源码
 * 切换时双向同步 Markdown 字符串。
 */

function api(path: string): string {
  return `${BASE_PATH}${path}`;
}

interface PostFull {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  tags: string[] | string;
  content_md: string;
  published: number;
}

type Mode = "rich" | "source";

export default function Editor() {
  const params = useSearchParams();
  const router = useRouter();
  const slugParam = params.get("slug") ?? "";
  const isNew = !slugParam;

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // frontmatter + 正文
  const [slug, setSlug] = useState(slugParam);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [published, setPublished] = useState(true);

  const [mode, setMode] = useState<Mode>("rich");
  const [fullscreen, setFullscreen] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // 切换模式时递增，强制编辑器重建注入当前 contentMd（rich↔source 双向同步）
  const [modeSwitchKey, setModeSwitchKey] = useState(0);

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setModeSwitchKey((k) => k + 1);
  }

  const draft = useDraft(slugParam);
  // draft 对象每帧新建（内部未 memo），用 ref 跟踪稳定引用，避免 save / useEffect 依赖每帧失效。
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // 鉴权探测
  useEffect(() => {
    fetch(api("/api/admin/me"), { credentials: "include" })
      .then((r) => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  // 加载文章（或新建空）
  const loadPost = useCallback(async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(api(`/api/admin/posts/${slugParam}`), {
        credentials: "include",
      });
      if (!res.ok) {
        setMsg({ kind: "err", text: "加载失败" });
        return;
      }
      const d = (await res.json()) as { post?: PostFull };
      if (d.post) {
        const t = Array.isArray(d.post.tags) ? d.post.tags : JSON.parse(d.post.tags || "[]");
        setSlug(d.post.slug);
        setTitle(d.post.title);
        setDate(d.post.date);
        setCategory(d.post.category);
        setDescription(d.post.description);
        setTags(t.join(", "));
        setContentMd(d.post.content_md);
        setPublished(d.post.published === 1);
      }
    } finally {
      setLoading(false);
    }
  }, [isNew, slugParam]);

  useEffect(() => {
    if (authed) loadPost();
    else if (authed === false) setLoading(false);
  }, [authed, loadPost]);

  // 草稿恢复提示
  useEffect(() => {
    if (draft.hasDraft && draft.savedDraft && !loading) {
      const ok = confirm("检测到未保存的草稿，是否恢复？");
      if (ok) {
        const d = draft.restoreDraft();
        if (d) {
          setSlug(d.slug);
          setTitle(d.title);
          setDate(d.date);
          setCategory(d.category);
          setDescription(d.description);
          setTags(d.tags);
          setContentMd(d.content_md);
          setPublished(d.published);
        }
      } else {
        draft.clearDraft();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // 编辑时自动存草稿
  useEffect(() => {
    if (loading) return;
    draft.saveDraft({
      slug,
      title,
      date,
      category,
      description,
      tags,
      content_md: contentMd,
      published,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, title, date, category, description, tags, contentMd, published, loading]);

  const save = useCallback(async () => {
    if (!slug.trim()) {
      setMsg({ kind: "err", text: "slug 不能为空" });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        title,
        date,
        category,
        description,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        content_md: contentMd,
        published: published ? 1 : 0,
      };
      const res = await fetch(api(`/api/admin/posts/${slug}`), {
        method: isNew ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(isNew ? { ...body, slug } : body),
      });
      const d = (await res.json()) as { ok?: boolean; rebuild?: boolean; error?: string };
      if (res.ok && d.ok) {
        setMsg({
          kind: "ok",
          text: d.rebuild
            ? "已保存，已触发重建（约 1-2 分钟后上线）"
            : "已保存（草稿，未触发重建）",
        });
        draftRef.current.clearDraft();
        if (isNew) {
          // 新建成功后跳到编辑模式（带 slug），避免重复 POST
          router.replace(`/admin/editor?slug=${encodeURIComponent(slug)}`);
        }
      } else {
        setMsg({ kind: "err", text: d.error ?? "保存失败" });
      }
    } catch {
      setMsg({ kind: "err", text: "网络错误" });
    } finally {
      setSaving(false);
    }
  }, [slug, title, date, category, description, tags, contentMd, published, isNew, router]);

  // 快捷键
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        save();
      }
      if (mod && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setFullscreen((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  if (authed === null || loading) {
    return (
      <div className="container-page py-20 text-sm text-[var(--foreground-muted)]">
        加载编辑器…
      </div>
    );
  }
  if (authed === false) {
    return (
      <div className="container-page py-20">
        <p className="text-sm">未登录，请先</p>
        <button
          onClick={() => router.push("/admin")}
          className="btn-primary mt-3 px-4 py-2 text-sm"
        >
          去登录
        </button>
      </div>
    );
  }

  const containerCls = fullscreen
    ? "fixed inset-0 z-50 bg-[var(--background)] overflow-auto"
    : "container-page py-10";

  return (
    <div className={containerCls}>
      <Toolbar
        mode={mode}
        setMode={switchMode}
        fullscreen={fullscreen}
        setFullscreen={setFullscreen}
        onBack={() => router.push("/admin?tab=posts")}
        save={save}
        saving={saving}
      />

      {/* frontmatter */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="slug（URL，小写字母数字横线）">
          <input
            value={slug}
            disabled={!isNew}
            onChange={(e) => setSlug(e.target.value)}
            className="input"
            placeholder="my-post"
          />
        </Field>
        <Field label="日期">
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            placeholder="2025-11-05"
          />
        </Field>
        <Field label="标题">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="分类">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
            placeholder="Hair / PBR / SSS"
          />
        </Field>
        <Field label="标签（逗号分隔）">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input"
            placeholder="Shader, PBR"
          />
        </Field>
        <Field label="摘要">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
          />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        已发布
      </label>

      {/* 编辑区 + 预览 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col">
          <div className="mb-1 text-xs text-[var(--foreground-muted)]">
            {mode === "rich" ? "富文本编辑（斜杠命令插入块）" : "MDX 源码（可写 <Scene> <Video> 等组件）"}
          </div>
          <div className="min-h-[500px] flex-1 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {mode === "rich" ? (
              <RichEditor
                key={"rich-" + modeSwitchKey}
                initial={contentMd}
                onMarkdownChange={setContentMd}
              />
            ) : (
              <SourceEditor
                key={"source-" + modeSwitchKey}
                value={contentMd}
                onChange={setContentMd}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <div className="mb-1 text-xs text-[var(--foreground-muted)]">预览</div>
          <div className="min-h-[500px] flex-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <Preview source={contentMd} />
          </div>
        </div>
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
    </div>
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
