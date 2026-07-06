"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/posts";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  headings: Heading[];
}

/**
 * 文章目录（TOC）—— 客户端组件。
 * sticky 定位在桌面端右侧栏；移动端由父级隐藏。
 * 点击锚点平滑滚动到目标标题；用 IntersectionObserver 高亮当前可见章节。
 */
export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // 上方留出 header 高度，下方提前触发
        rootMargin: "-80px 0px -70% 0px",
        threshold: [0, 1],
      },
    );

    // 观察 DOM 里真实存在的标题节点
    for (const h of headings) {
      const el = document.getElementById(h.slug);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="目录"
      className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pb-4"
    >
      {/* framegraph pass 标签风：§ Index，与正文 § category 体系一致 */}
      <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
        <span className="text-[var(--accent)]">§</span> Index
      </p>
      <ul className="space-y-1 border-l border-[var(--border)]">
        {headings.map((h, i) => {
          const isActive = activeId === h.slug;
          const idx = String(i + 1).padStart(2, "0");
          return (
            <li key={h.slug}>
              <a
                href={`#${h.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(h.slug);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.replaceState(null, "", `#${h.slug}`);
                  }
                }}
                className={cn(
                  "group block border-l-2 py-1 font-mono text-[0.78rem] leading-snug transition-colors duration-200",
                  h.depth === 3 ? "pl-7" : "pl-3",
                  isActive
                    ? "border-[var(--accent)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground-soft)]",
                )}
              >
                {/* 行号前缀：mono 灰色，像 framegraph pass 序号；active 时变 accent */}
                <span
                  className={cn(
                    "mr-2 text-[var(--foreground-muted)] transition-colors",
                    isActive && "text-[var(--accent)]",
                  )}
                >
                  {idx}
                </span>
                <span className="font-[family-name:var(--font-sans)]">
                  {h.text}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
