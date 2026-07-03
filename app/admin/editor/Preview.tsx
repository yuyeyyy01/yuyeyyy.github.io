"use client";

import { useEffect, useState } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

/**
 * 客户端 Markdown 预览 —— 近似正文渲染。
 *
 * 与构建时 MDXRemote 的差异（架构硬约束）：
 * - 自定义 MDX 组件（<Scene> <ShaderDemo> <Video> <Figure>）不渲染真实，
 *   显示占位卡片"⟨MDX 组件：X⟩ 构建后可见"。
 * - 其余（文字/标题/列表/代码/公式/图片/表格）与正文一致。
 *
 * 代码高亮暂用 prose 默认样式（构建时 shiki 的高亮在客户端复刻成本高）。
 * 数学公式用 rehype-katex（与正文同）。
 */

/** 站点里用到、但预览无法渲染的 MDX 自定义组件名 */
const MDX_COMPONENTS = ["Scene", "ShaderDemo", "Video", "Figure"];

/** 把 MDX 组件块替换成占位 HTML 注释，渲染后用占位卡片显示 */
function maskMdxComponents(md: string): string {
  let out = md;
  for (const name of MDX_COMPONENTS) {
    // 匹配 <Scene .../> 或 <Scene ...>...</Scene>（含跨行）
    const re = new RegExp(`<${name}(\\s[^>]*)?/>|<${name}(\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g");
    out = out.replace(re, (m) => `\n\n⟨MDX 组件：${name}⟩\n\n`);
  }
  return out;
}

export default function Preview({ source }: { source: string }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    const masked = maskMdxComponents(source || "");
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(rehypeKatex)
      .use(rehypeStringify)
      .process(masked)
      .then((out) => {
        if (!cancelled) setHtml(String(out));
      })
      .catch(() => {
        if (!cancelled) setHtml("<p class='text-red-500'>预览解析失败</p>");
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (!source || !source.trim()) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 text-sm text-[var(--foreground-muted)]">
        <span className="text-2xl">📝</span>
        <p>左侧输入内容，这里实时预览</p>
        <p className="text-xs">支持 Markdown / MDX（公式、代码、表格等）</p>
      </div>
    );
  }

  return (
    <div
      className="preview prose max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
