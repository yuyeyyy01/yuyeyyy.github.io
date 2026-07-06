"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  whileInViewConfig,
} from "@/lib/motion";

/** 序列化后传给客户端的最小文章结构（去掉大块 content） */
export interface TagCloudPost {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags?: string[];
}

interface TagCloudProps {
  /** 全部文章（已按 date 降序） */
  posts: TagCloudPost[];
  /** 全部标签全集 */
  tags: string[];
}

/**
 * § Tags —— 标签云 + 按标签筛选。
 * 数据由 server 端 page.tsx 序列化传入，筛选完全在浏览器进行。
 *
 * 视觉：framegraph § pass 节点胶囊（mono + accent 边框），选中态 accent 填充。
 * 选中标签后下方展开该标签的文章列表（宋体标题 + mono 日期 + 链接）。
 * 动效复用 fadeUp / staggerContainer / staggerItem，reduced-motion 下静态。
 */
export default function TagCloud({ posts, tags }: TagCloudProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // 标签按文章数降序，同数按字母序 —— framegraph pass 按重要性排序的气质
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      if (post.tags) {
        for (const t of post.tags) {
          map.set(t, (map.get(t) ?? 0) + 1);
        }
      }
    }
    return map;
  }, [posts]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      const ca = tagCounts.get(a) ?? 0;
      const cb = tagCounts.get(b) ?? 0;
      if (ca !== cb) return cb - ca;
      return a.localeCompare(b);
    });
  }, [tags, tagCounts]);

  const filteredPosts = useMemo(() => {
    if (!activeTag) return [];
    return posts.filter(
      (post) => post.tags?.some((t) => t === activeTag) ?? false,
    );
  }, [posts, activeTag]);

  return (
    <section className="container-page py-20 md:py-28">
      {/* § pass 标签行 */}
      <div className="section-rule">
        <span>§ Tags</span>
      </div>

      <motion.header
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-5 max-w-2xl"
      >
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          按标签浏览
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
          每篇文章都标了技术标签，点选一个标签筛选出相关笔记。
        </p>
      </motion.header>

      {/* 标签云：§ pass 节点胶囊，按出现文章数排序 */}
      {sortedTags.length > 0 ? (
        <motion.div
          variants={staggerContainer}
          {...whileInViewConfig}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-8 flex flex-wrap gap-2"
        >
          {sortedTags.map((tag) => {
            const count = tagCounts.get(tag) ?? 0;
            const active = activeTag === tag;
            return (
              <motion.button
                key={tag}
                variants={staggerItem}
                type="button"
                onClick={() => setActiveTag(active ? null : tag)}
                aria-pressed={active}
                className={
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs tracking-[0.04em] transition-all duration-200 " +
                  (active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border-[var(--border-strong)] text-[var(--foreground-soft)] hover:border-[var(--accent)] hover:text-[var(--foreground)]")
                }
              >
                {/* § pass 节点状态点：未选中空心 accent，选中实心 accent-foreground */}
                <span
                  aria-hidden
                  className={
                    "inline-block h-1.5 w-1.5 rounded-full " +
                    (active
                      ? "bg-[var(--accent-foreground)]"
                      : "bg-[var(--accent)] opacity-70")
                  }
                />
                <span>{tag}</span>
                <span
                  aria-hidden
                  className={
                    "ml-0.5 " +
                    (active
                      ? "text-[var(--accent-foreground)] opacity-70"
                      : "text-[var(--foreground-muted)]")
                  }
                >
                  · {count}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      ) : (
        <p className="mt-8 font-mono text-sm text-[var(--foreground-muted)]">
          暂无标签。
        </p>
      )}

      {/* 选中标签的文章列表 / 提示 */}
      <div className="mt-10">
        {!activeTag ? (
          <motion.p
            variants={fadeUp}
            {...whileInViewConfig}
            viewport={{ once: true, margin: "-60px" }}
            className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]"
          >
            点击标签筛选文章
          </motion.p>
        ) : (
          <TagResultList
            key={activeTag}
            tag={activeTag}
            posts={filteredPosts}
          />
        )}
      </div>
    </section>
  );
}

/**
 * 选中标签后的文章列表：framegraph pass 节点风。
 * 每项：mono 日期 · 分类 + 宋体标题（链接到 /blog/[slug]/）。
 */
function TagResultList({
  tag,
  posts,
}: {
  tag: string;
  posts: TagCloudPost[];
}) {
  return (
    <motion.div
      key={tag}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="card overflow-hidden"
    >
      {/* pass 头：§ <tag> · count —— 像一个 framegraph pass 节点标题栏 */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--foreground-soft)]">
          <span className="text-[var(--accent)]">§</span> {tag}
        </span>
        <span className="font-mono text-xs text-[var(--foreground-muted)]">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </span>
      </div>

      {posts.length === 0 ? (
        <p className="px-4 py-6 font-mono text-sm text-[var(--foreground-muted)]">
          没有匹配的文章。
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {posts.map((post) => (
            <motion.li key={post.slug} variants={staggerItem}>
              <Link
                href={`/blog/${post.slug}/`}
                className="group flex items-baseline gap-3 px-4 py-3 transition-colors duration-200 hover:bg-[var(--surface-2)]"
              >
                {/* 日期 · 分类：mono，材质属性面板 key 行风 */}
                <div className="hidden shrink-0 items-center gap-2 font-mono text-[0.7rem] text-[var(--foreground-muted)] sm:flex">
                  <time dateTime={post.date}>{post.date}</time>
                  <span aria-hidden>·</span>
                  <span className="text-[var(--accent)]">{post.category}</span>
                </div>
                {/* 标题：宋体 */}
                <h3 className="flex-1 font-[family-name:var(--font-serif)] text-base font-semibold leading-snug text-[var(--foreground)] transition-colors duration-200 group-hover:text-[var(--accent)]">
                  {post.title}
                </h3>
                {/* 移动端日期 */}
                <span className="shrink-0 font-mono text-[0.7rem] text-[var(--foreground-muted)] sm:hidden">
                  {post.date}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
