"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { fadeUp, staggerItem, whileInViewConfig } from "@/lib/motion";

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
  /** 入场动效变体：默认独立 fadeUp；传 staggerItem 时继承父容器错落入场 */
  entryVariant?: Variants;
}

/**
 * 苹果风文章卡片。
 * 整卡可点击跳转到 `/blog/<slug>/`，hover 时柔和上移 + 阴影 + 加深边框。
 * 滚动进入视口时淡入上移（whileInView，只触发一次）；
 * 若 entryVariant 传入 staggerItem，则改为继承父 motion 容器错落入场。
 */
export default function ArticleCard({
  slug,
  title,
  date,
  category,
  excerpt,
  entryVariant = fadeUp,
}: ArticleCardProps) {
  // 独立入场用 whileInView；继承父容器时只设 variants，由父级 stagger 驱动
  const entryProps =
    entryVariant === staggerItem
      ? { variants: entryVariant }
      : { variants: entryVariant, ...whileInViewConfig, viewport: { once: true, margin: "-60px" } };

  return (
    <Link
      href={`/blog/${slug}/`}
      className="group block h-full"
      aria-label={title}
    >
      <motion.article
        {...entryProps}
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

        {/* 底部：阅读 + 箭头，整卡 hover 时箭头滑出 */}
        <div className="mt-auto flex items-center gap-1 pt-6 text-xs text-[var(--foreground-muted)] transition-colors duration-300 group-hover:text-[var(--accent)]">
          <span>阅读</span>
          <ArrowRight
            size={14}
            aria-hidden
            className="inline-flex transition-transform duration-300 ease-out group-hover:translate-x-1"
          />
        </div>
      </motion.article>
    </Link>
  );
}
