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
      <p className="mb-3 text-xs uppercase tracking-widest text-[var(--foreground-muted)]">
        目录
      </p>
      <ul className="space-y-2 border-l border-[var(--border)]">
        {headings.map((h) => {
          const isActive = activeId === h.slug;
          return (
            <li key={h.slug}>
              <a
                href={`#${h.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(h.slug);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    // 同步更新 URL hash，方便分享
                    history.replaceState(null, "", `#${h.slug}`);
                  }
                }}
                className={cn(
                  "block border-l-2 py-1 text-sm leading-snug transition-colors duration-200",
                  h.depth === 3 ? "pl-6" : "pl-4",
                  isActive
                    ? "border-[var(--accent)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground-soft)]",
                )}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
