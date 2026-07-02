"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";

export interface ArticleCardProps {
  /** 文章 slug，用于生成 `/blog/<slug>/` 链接 */
  slug: string;
  /** 文章标题 */
  title: string;
  /** 发布日期，例如 2025-11-23 */
  date: string;
  /** 分类标签，例如 Shader / PBR */
  category: string;
  /** 摘要描述 */
  excerpt: string;
}

/**
 * 苹果风文章卡片。
 * 整卡可点击跳转到 `/blog/<slug>/`，hover 时柔和上移 + 阴影 + 加深边框。
 * 滚动进入视口时淡入上移（whileInView，只触发一次）。
 */
export default function ArticleCard({
  slug,
  title,
  date,
  category,
  excerpt,
}: ArticleCardProps) {
  return (
    <Link
      href={`/blog/${slug}/`}
      className="group block h-full"
      aria-label={title}
    >
      <motion.article
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="card flex h-full flex-col p-6 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:border-[var(--border-strong)] group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
      >
        {/* 顶部元信息：日期 · 分类 */}
        <div className="flex items-center gap-2">
          <time
            dateTime={date}
            className="font-mono text-xs text-[var(--foreground-muted)]"
          >
            {date}
          </time>
          <span
            aria-hidden
            className="text-xs text-[var(--foreground-muted)]"
          >
            ·
          </span>
          <span className="text-xs text-[var(--accent)]">{category}</span>
        </div>

        {/* 标题 */}
        <h3 className="mt-3 text-lg font-medium leading-snug text-[var(--foreground)]">
          {title}
        </h3>

        {/* 摘要 */}
        <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-soft)]">
          {excerpt}
        </p>

        {/* 底部：阅读 + 箭头 */}
        <div className="mt-auto flex items-center gap-1 pt-6 text-xs text-[var(--foreground-muted)] transition-colors duration-300 group-hover:text-[var(--accent)]">
          <span>阅读</span>
          <motion.span
            className="inline-flex"
            initial={{ opacity: 0.7, x: 0 }}
            whileHover={{ opacity: 1, x: 4 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <ArrowRight size={14} aria-hidden />
          </motion.span>
        </div>
      </motion.article>
    </Link>
  );
}
