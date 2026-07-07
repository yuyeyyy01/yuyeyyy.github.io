"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { BASE_PATH } from "@/lib/site";

/**
 * Header 顶部搜索框（Slack 式）。
 * 输入时下方弹出 pagefind 结果下拉，点击跳文章；回车跳 /search/?q=... 全结果页。
 * 失焦/ESC 收起下拉。点击外部关闭。
 *
 * pagefind 索引在构建后生成（/pagefind/pagefind.js），dev 环境可能未生成 →
 * 搜索框仍显示但提示索引未就绪。
 */

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

interface SearchResult {
  id: string;
  url: string;
  title: string;
  excerpt: string;
}

/** 把 pagefind 返回的 url 规范化为 next/link 可用的相对路径（去掉 basePath 前缀） */
function normalizeUrl(url: string): string {
  if (url.startsWith(`${BASE_PATH}/`)) return url.slice(BASE_PATH.length);
  if (url === BASE_PATH) return "/";
  return url;
}

export default function HeaderSearch() {
  const [pf, setPf] = useState<PagefindModule | null>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载 pagefind
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
        // dev 环境未生成索引，静默；搜索框显示但 disabled
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 点击外部关闭
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // 防抖搜索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q || !pf) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await pf.search(q);
        const items: SearchResult[] = await Promise.all(
          res.results.slice(0, 6).map(async (r) => {
            const d = await r.data();
            return {
              id: r.id,
              url: d.url,
              title: d.meta_title || d.url,
              excerpt: d.excerpt,
            };
          }),
        );
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, pf]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const q = query.trim();
      if (q) window.location.href = `${BASE_PATH}/search/?q=${encodeURIComponent(q)}`;
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown =
    open && query.trim().length > 0 && (searching || results.length > 0 || ready);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search
          aria-hidden
          size={15}
          className="pointer-events-none absolute left-3 text-[var(--foreground-muted)]"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="搜索文章…"
          aria-label="搜索文章"
          disabled={!ready}
          className="w-44 rounded-md border border-[var(--border)] bg-[var(--surface)] py-1.5 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] transition-all duration-200 focus:w-56 focus:border-[var(--accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:w-52"
          style={{ paddingLeft: "2.25rem" }}
        />
        {searching && (
          <Loader2
            aria-hidden
            size={14}
            className="absolute right-3 animate-spin text-[var(--foreground-muted)]"
          />
        )}
      </div>

      {/* 结果下拉 */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          style={{ minWidth: "20rem" }}
        >
          {/* 顶部 accent 线（pass 节点风） */}
          <span aria-hidden className="block h-0.5 w-full bg-[var(--accent)] opacity-50" />
          {results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={normalizeUrl(r.url)}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="block border-b border-[var(--border)] px-4 py-3 transition-colors duration-150 last:border-b-0 hover:bg-[var(--surface-2)]"
                  >
                    <p className="font-[family-name:var(--font-serif)] text-sm font-semibold leading-snug text-[var(--foreground)]">
                      {r.title}
                    </p>
                    {r.excerpt && (
                      <p
                        className="mt-1 line-clamp-1 text-xs text-[var(--foreground-muted)] [&_mark]:(bg-[var(--surface-2)] px-0.5 text-[var(--foreground)])"
                        dangerouslySetInnerHTML={{ __html: r.excerpt }}
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-[var(--foreground-muted)]">
              {ready ? `没有与「${query.trim()}」相关的内容` : "搜索索引未就绪"}
            </p>
          )}
          {/* 底部：回车看全结果 */}
          {results.length > 0 && (
            <a
              href={`${BASE_PATH}/search/?q=${encodeURIComponent(query.trim())}`}
              className="block border-t border-[var(--border)] px-4 py-2 font-mono text-[0.7rem] text-[var(--foreground-muted)] transition-colors hover:text-[var(--accent)]"
            >
              回车查看全部结果 →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
