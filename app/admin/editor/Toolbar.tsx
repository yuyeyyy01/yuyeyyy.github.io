"use client";

/**
 * 编辑器顶部工具栏。
 *
 * 富文本模式：格式操作交给 Crepe 内置 top-bar（更专业、Notion 式块菜单），
 *   本工具栏只做编辑器外部操作（模式切换/全屏/保存/返回）。
 * 源码模式：Crepe 不显示，本工具栏额外提供常用 MDX/Markdown 插入按钮。
 */

type Mode = "rich" | "source";

/** 源码模式插入：在光标处插入文本（调用方持有 textarea/CodeMirror 的插入逻辑） */
function insert(text: string, wrap: [string, string] | null = null) {
  // 由父组件通过 onInsert 回调执行（注入到当前编辑器）
  const ev = new CustomEvent("editor-insert", { detail: { text, wrap } });
  window.dispatchEvent(ev);
}

const SOURCE_BUTTONS: { label: string; title: string; text?: string; wrap?: [string, string] }[] = [
  { label: "H1", title: "一级标题", text: "# " },
  { label: "H2", title: "二级标题", text: "## " },
  { label: "H3", title: "三级标题", text: "### " },
  { label: "B", title: "加粗 **", wrap: ["**", "**"] },
  { label: "I", title: "斜体 *", wrap: ["*", "*"] },
  { label: "“ ”", title: "引用 >", text: "> " },
  { label: "• 列表", title: "无序列表", text: "- " },
  { label: "1. 列表", title: "有序列表", text: "1. " },
  { label: "</>", title: "行内代码", wrap: ["`", "`"] },
  { label: "```", title: "代码块", text: "```\n", wrap: ["", "\n```"] },
  { label: "| 表格", title: "表格", text: "\n| A | B |\n|---|---|\n| 1 | 2 |\n" },
  { label: "— 分割线", title: "分割线", text: "\n\n---\n\n" },
  { label: "🔗 链接", title: "链接", text: "[描述](https://)" },
  { label: "🖼 图片", title: "图片", text: "![alt](https://)" },
];

export default function Toolbar({
  mode,
  setMode,
  fullscreen,
  setFullscreen,
  onBack,
  save,
  saving,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  fullscreen: boolean;
  setFullscreen: (f: boolean) => void;
  onBack: () => void;
  save: () => void;
  saving: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--background)]/90 py-2 backdrop-blur">
      <button onClick={onBack} className="btn-secondary px-3 py-1 text-xs">
        ← 返回
      </button>

      <div className="flex gap-1 rounded-full border border-[var(--border)] p-1 text-xs">
        <button
          onClick={() => setMode("rich")}
          className={
            "rounded-full px-3 py-1 " +
            (mode === "rich"
              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "text-[var(--foreground-muted)]")
          }
        >
          富文本
        </button>
        <button
          onClick={() => setMode("source")}
          className={
            "rounded-full px-3 py-1 " +
            (mode === "source"
              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "text-[var(--foreground-muted)]")
          }
        >
          源码
        </button>
      </div>

      {/* 源码模式插入按钮 */}
      {mode === "source" ? (
        <div className="flex flex-wrap items-center gap-1">
          {SOURCE_BUTTONS.map((b) => (
            <button
              key={b.label}
              title={b.title}
              onClick={() => insert(b.text ?? "", b.wrap ?? null)}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:border-[var(--accent)]"
            >
              {b.label}
            </button>
          ))}
        </div>
      ) : (
        <span className="text-xs text-[var(--foreground-muted)]">
          富文本模式用 <kbd className="rounded bg-[var(--surface-2)] px-1">/</kbd> 斜杠命令插入块
        </span>
      )}

      <div className="flex-1" />

      <button
        onClick={() => setFullscreen(!fullscreen)}
        className="btn-secondary px-3 py-1 text-xs"
        title="全屏 (Cmd+Shift+F)"
      >
        {fullscreen ? "退出全屏" : "全屏"}
      </button>
      <button
        onClick={save}
        disabled={saving}
        className="btn-primary px-4 py-1 text-xs disabled:opacity-60"
        title="保存 (Cmd+S)"
      >
        {saving ? "保存中…" : "保存"}
      </button>
    </div>
  );
}
