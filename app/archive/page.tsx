import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "归档",
  description: "按时间线浏览全部文章。",
};

function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

/**
 * 归档页：按年份分组的文章时间线。
 * framegraph 视觉系统：§ Archive 标签 + 年份作为 pass 节点 + 每条文章 mono 日期。
 * getAllPosts 已按 date 降序，这里按年份分组。
 */
export default function ArchivePage() {
  const posts = getAllPosts();

  // 按年份分组（降序）
  const byYear = new Map<number, typeof posts>();
  for (const p of posts) {
    const y = new Date(p.date).getFullYear();
    if (!Number.isNaN(y)) {
      const arr = byYear.get(y) ?? [];
      arr.push(p);
      byYear.set(y, arr);
    }
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <main className="container-page py-24 md:py-32">
      <header className="mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
          <span className="text-[var(--accent)]">§</span> Archive
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl font-bold tracking-[-0.02em] text-[var(--foreground)] md:text-5xl">
          归档
        </h1>
        <p className="mt-4 text-[var(--foreground-soft)]">
          按时间线浏览全部文章，共 {posts.length} 篇。
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-[var(--foreground-muted)]">还没有文章。</p>
      ) : (
        <div className="space-y-16">
          {years.map((year) => {
            const items = byYear.get(year)!;
            return (
              <section key={year}>
                {/* 年份作为 framegraph pass 节点：§ YYYY + 计数 + 细线 */}
                <div className="section-rule">
                  <span>
                    <span className="text-[var(--accent)]">§</span> {year}
                  </span>
                  <span className="ml-3 text-[var(--foreground-muted)]">
                    {items.length} 篇
                  </span>
                </div>

                {/* 时间线列表 */}
                <ul className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {items.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/blog/${p.slug}/`}
                        className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-4 py-4 transition-colors duration-200 hover:bg-[var(--surface)]"
                      >
                        {/* mono 日期，像 frame 时间戳 */}
                        <time
                          dateTime={p.date}
                          className="font-mono text-[0.78rem] text-[var(--foreground-muted)] tabular-nums"
                        >
                          {formatDate(p.date)}
                        </time>
                        {/* 标题：宋体，hover 变 accent */}
                        <span className="font-[family-name:var(--font-serif)] text-base font-semibold leading-snug text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--accent)]">
                          {p.title}
                        </span>
                        {/* 右侧分类标签 */}
                        <span className="hidden font-mono text-[0.7rem] text-[var(--foreground-muted)] sm:inline">
                          {p.category}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
