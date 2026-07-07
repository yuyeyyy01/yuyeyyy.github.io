"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import { BASE_PATH } from "@/lib/site";

/**
 * 搜索结果项 —— 来自 pagefind 的 JS API。
 * url 是相对路径（如 /blog/xxx/），可能已含 basePath，渲染前会规范化。
 */
interface SearchResult {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  description?: string;
}

/** pagefind 模块的最小类型（开发时该模块尚不存在，构建后由 pagefind 生成） */
interface PagefindModule {
  init: (opts?: Record<string, unknown>) => Promise<unknown>;
  search: (query: string, opts?: Record<string, unknown>) => Promise<{
    results: Array<{
      id: string;
      data: () => Promise<{
        url: string;
        meta_title?: string;
        meta_description?: string;
        excerpt: string;
      }>;
    }>;
  }>;
}

// basePath 从 lib/site 统一管理（迁移平台时只改一处）

/**
 * 把 pagefind 返回的 url 规范化为 next/link 可用的相对路径。
 * pagefind 索引的 url 可能是 `/blog/xxx/`（不含 basePath）或
 * `/yuyeyyy.github.io/blog/xxx/`（含 basePath，取决于构建产物）。
 * 统一去掉 basePath 前缀，交给 next/link 自动拼回。
 */
function normalizeUrl(url: string): string {
  if (url.startsWith(`${BASE_PATH}/`)) {
    return url.slice(BASE_PATH.length);
  }
  if (url === BASE_PATH) {
    return "/";
  }
  return url;
}

export default function SearchPage() {
  const [pf, setPf] = useState<PagefindModule | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载 pagefind（构建后生成在 /yuyeyyy.github.io/pagefind/pagefind.js）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = (await import(
          /* webpackIgnore: true */ window.location.origin + `${BASE_PATH}/pagefind/pagefind.js`
        )) as PagefindModule;
        if (cancelled) return;
        await mod.init();
        if (cancelled) return;
        setPf(mod);
        setReady(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 自动聚焦
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 防抖搜索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }
    if (!pf) return;
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await pf.search(q);
        const items: SearchResult[] = await Promise.all(
          res.results.slice(0, 30).map(async (r) => {
            const d = await r.data();
            return {
              id: r.id,
              url: d.url,
              title: d.meta_title || d.url,
              excerpt: d.excerpt,
              description: d.meta_description,
            };
          })
        );
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, pf]);

  return (
    <main className="container-page mx-auto max-w-2xl py-24 md:py-32">
      <header className="mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
          <span className="text-[var(--accent)]">§</span> Search
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl font-bold tracking-[-0.02em] text-[var(--foreground)] md:text-5xl">
          搜索
        </h1>
        <p className="mt-4 text-[var(--foreground-soft)]">
          在全站文章里查找关键词、标题或任意内容。
        </p>
      </header>

      {/* 搜索框 —— framegraph pass 节点风：小圆角 + 顶部 accent 线 */}
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] border-t-0 bg-[var(--surface)]">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-[var(--accent)] opacity-50"
        />
        <div className="relative">
          <Search
            aria-hidden
            size={18}
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入关键词…"
            aria-label="搜索"
            disabled={!ready}
            className="w-full rounded-b-[var(--radius-xl)] bg-transparent py-4 pr-12 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ paddingLeft: "3.25rem" }}
          />
          {searching && (
            <Loader2
              aria-hidden
              size={18}
              className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-[var(--foreground-muted)]"
            />
          )}
        </div>
      </div>

      {/* 状态区 */}
      <div className="mt-10">
        {/* 加载中 / 未就绪 */}
        {!ready && !loadError && (
          <p className="text-sm text-[var(--foreground-muted)]">
            正在加载搜索索引…
          </p>
        )}

        {/* 索引加载失败（通常是开发环境未生成 pagefind） */}
        {loadError && (
          <p className="text-sm text-[var(--foreground-muted)]">
            搜索索引尚未生成。请先执行 <code className="font-mono">npm run index</code>{" "}
            构建索引后再试。
          </p>
        )}

        {/* 空状态：未输入 */}
        {ready && !searched && !query.trim() && (
          <p className="text-sm text-[var(--foreground-muted)]">
            输入关键词开始搜索。
          </p>
        )}

        {/* 搜索中 */}
        {ready && searching && (
          <p className="text-sm text-[var(--foreground-muted)]">搜索中…</p>
        )}

        {/* 无结果 */}
        {ready && !searching && searched && results.length === 0 && (
          <p className="text-sm text-[var(--foreground-muted)]">
            没有找到与「{query.trim()}」相关的内容。
          </p>
        )}

        {/* 结果列表 */}
        {ready && !searching && results.length > 0 && (
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {results.map((r) => (
              <motion.li key={r.id} variants={staggerItem}>
                <Link
                  href={normalizeUrl(r.url)}
                  className="card group block p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--accent)]"
                >
                  <h3 className="text-base font-medium leading-snug text-[var(--foreground)]">
                    {r.title}
                  </h3>
                  {r.description && (
                    <p className="mt-1.5 text-xs text-[var(--foreground-muted)]">
                      {r.description}
                    </p>
                  )}
                  {/* pagefind 提供 excerpt，已带高亮 <mark> */}
                  {r.excerpt && (
                    <p
                      className="mt-2 text-sm leading-relaxed text-[var(--foreground-soft)] [&_mark]:(rounded bg-[var(--surface-2)] px-0.5 text-[var(--foreground)])"
                      dangerouslySetInnerHTML={{ __html: r.excerpt }}
                    />
                  )}
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </main>
  );
}
