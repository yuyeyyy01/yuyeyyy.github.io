"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";
import { ArrowUpRight } from "lucide-react";

export interface ProjectCardProps {
  /** 项目名称 */
  title: string;
  /** 项目描述 */
  description: string;
  /** 可选的 lucide 图标节点，渲染在 48x48 圆角方块中 */
  icon?: ReactNode;
  /** 可选跳转链接：以 http 开头视为外链（新窗口打开），否则走 next/link（自动 basePath） */
  href?: string;
}

/**
 * 苹果风项目卡片。
 * 若提供 href，整卡由 Link / <a> 包裹可点击跳转。
 * hover 时柔和上移 + 阴影 + 加深边框，右下角浮现「访问 ↗」指示。
 * 滚动进入视口时淡入上移（whileInView，只触发一次）。
 */
export default function ProjectCard({
  title,
  description,
  icon,
  href,
}: ProjectCardProps) {
  const isExternal = href?.startsWith("http");

  const content = (
    <motion.article
      variants={fadeUp}
      {...whileInViewConfig}
      viewport={{ once: true, margin: "-60px" }}
      className="card group relative h-full p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
    >
      {/* 图标区：48x48 圆角方块，hover 时柔和缩放 */}
      {icon ? (
        <motion.div
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {icon}
        </motion.div>
      ) : null}

      <h3 className="mt-4 text-lg font-medium leading-snug text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-soft)]">
        {description}
      </p>

      {/* 右下角访问指示：hover 时滑入显现 */}
      {href ? (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-5 right-5 inline-flex translate-x-1 items-center gap-0.5 text-xs font-medium text-[var(--foreground-muted)] opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:text-[var(--accent)] group-hover:opacity-100"
        >
          访问
          <ArrowUpRight size={14} />
        </span>
      ) : null}
    </motion.article>
  );

  if (!href) {
    return content;
  }

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
        aria-label={title}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block h-full" aria-label={title}>
      {content}
    </Link>
  );
}
