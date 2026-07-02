"use client";

import { useMemo, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import { cn } from "@/lib/utils";

/** 序列化后传给客户端的文章最小数据 */
export interface BlogListItem {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  tags?: string[];
}

interface BlogListProps {
  posts: BlogListItem[];
  /** 可选标签全集；不传则自动从 posts 收集 */
  tags?: string[];
}

/**
 * 博客列表 + 标签筛选（客户端）。
 * 静态导出场景下，筛选完全在浏览器进行：
 * 服务端把所有 posts 序列化后传入，这里用 useState 管理当前选中 tag。
 * tag chip 用苹果风胶囊。
 */
export default function BlogList({ posts, tags }: BlogListProps) {
  const allTags = useMemo(() => {
    if (tags && tags.length > 0) return tags;
    const set = new Set<string>();
    for (const p of posts) {
      if (p.tags) for (const t of p.tags) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [posts, tags]);

  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags?.some((t) => t === activeTag) ?? false);
  }, [posts, activeTag]);

  return (
    <div>
      {allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <TagChip
            label="全部"
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
          />
          {allTags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              active={activeTag === tag}
              onClick={() => setActiveTag(tag)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-[var(--foreground-muted)]">没有匹配的文章。</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filtered.map((post) => (
            <ArticleCard
              key={post.slug}
              slug={post.slug}
              title={post.title}
              date={post.date}
              category={post.category}
              excerpt={post.description}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "border-[var(--border-strong)] text-[var(--foreground-soft)] hover:border-[var(--foreground-muted)] hover:text-[var(--foreground)]",
      )}
    >
      {label}
    </button>
  );
}
