"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { fadeUp, staggerItem, whileInViewConfig } from "@/lib/motion";
import { ArrowUpRight } from "lucide-react";
import MiniShader from "@/components/MiniShader";

export interface ProjectCardProps {
  /** 项目名称 */
  title: string;
  /** 项目描述 */
  description: string;
  /** 可选的 lucide 图标节点，渲染在 48x48 圆角方块中 */
  icon?: ReactNode;
  /** 可选跳转链接：以 http 开头视为外链（新窗口打开），否则走 next/link（自动 basePath） */
  href?: string;
  /** 入场动效变体：默认独立 fadeUp；传 staggerItem 时继承父容器错落入场 */
  entryVariant?: Variants;
  /** 可选 mini shader 预览：fragment 源码（GLSL ES 3.0，可用 iTime/iResolution/uv）。
   *  传入则卡片顶部渲染 16:9 shader 预览区，替代图标。 */
  shader?: string;
  /** shader 预览区左上角的 § 标签名 */
  shaderLabel?: string;
}

/**
 * framegraph 项目卡片。
 * 若提供 href，整卡由 Link / <a> 包裹可点击跳转。
 * hover 时上移 + accent 边框，右下角浮现「访问 ↗」指示。
 * 传入 shader 则顶部跑一个轻量 WebGL2 着色器预览（渲染管线 demo 卡的招牌）。
 */
export default function ProjectCard({
  title,
  description,
  icon,
  href,
  entryVariant = fadeUp,
  shader,
  shaderLabel,
}: ProjectCardProps) {
  const isExternal = href?.startsWith("http");

  const entryProps =
    entryVariant === staggerItem
      ? { variants: entryVariant }
      : { variants: entryVariant, ...whileInViewConfig, viewport: { once: true, margin: "-60px" } };

  const content = (
    <motion.article
      {...entryProps}
      className="card group relative flex h-full flex-col overflow-hidden p-0 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--accent)]"
    >
      {/* 顶部：mini shader 预览（16:9）或图标，二选一。shader 优先。 */}
      {shader ? (
        <div className="relative aspect-[16/9] w-full border-b border-[var(--border)] bg-[var(--surface-2)]">
          <MiniShader
            fragment={shader}
            label={shaderLabel}
            className="h-full w-full"
          />
        </div>
      ) : icon ? (
        <div className="p-5 pb-0">
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {icon}
          </motion.div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-[family-name:var(--font-serif)] text-lg font-semibold leading-snug text-[var(--foreground)]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-soft)]">
          {description}
        </p>
      </div>

      {/* 右下角访问指示：hover 时滑入显现 */}
      {href ? (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-4 right-4 inline-flex translate-x-1 items-center gap-0.5 font-mono text-[0.7rem] text-[var(--foreground-muted)] opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:text-[var(--accent)] group-hover:opacity-100"
        >
          访问
          <ArrowUpRight size={13} />
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
