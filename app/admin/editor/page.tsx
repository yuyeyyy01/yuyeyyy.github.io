"use client";

import { Suspense } from "react";
import Editor from "./Editor";

/**
 * 文章编辑器路由 /admin/editor
 *   ?slug=xxx  → 编辑现有文章
 *   无 slug    → 新建
 *
 * 鉴权靠 HttpOnly cookie（与 /admin 一致）。未登录时 Editor 内部会提示跳登录。
 * 这是客户端壳：数据通过 fetch 拿，编辑器逻辑在 Editor.tsx。
 */
export default function EditorPage() {
  return (
    <Suspense fallback={<div className="container-page py-20 text-sm text-[var(--foreground-muted)]">加载编辑器…</div>}>
      <Editor />
    </Suspense>
  );
}
