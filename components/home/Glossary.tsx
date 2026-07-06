"use client";

import { motion } from "framer-motion";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  whileInViewConfig,
} from "@/lib/motion";
import { GLOSSARY } from "@/lib/glossary-data";

/**
 * § Rendering Glossary —— 渲染术语速查卡片墙。
 *
 * 用原生 <details>/<summary> 做展开/收起：
 * - 免 useState、SEO 友好（detail 内容默认在 DOM 里可被索引）
 * - 无障碍：键盘可聚焦、回车展开、屏幕阅读器原生支持
 * - 不需要 JS 也能工作（静态导出友好）
 *
 * 视觉：复用 .card 的细边框材质面板语言；hover 时换 accent 边框。
 * 公式先用 mono 原样显示 LaTeX 源码，不引 katex（保持轻量）。
 * Reduced-motion 友好：动效只挂在容器入场，卡片展开是 CSS transition。
 */
export default function Glossary() {
  return (
    <motion.div
      variants={staggerContainer}
      {...whileInViewConfig}
      viewport={{ once: true, margin: "-60px" }}
      className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    >
      {GLOSSARY.map((item) => (
        <GlossaryCard key={item.term} item={item} />
      ))}
    </motion.div>
  );
}

function GlossaryCard({ item }: { item: (typeof GLOSSARY)[number] }) {
  return (
    <motion.details
      variants={staggerItem}
      className="card group cursor-pointer p-0 transition-all duration-300 ease-out hover:border-[var(--accent)] open:border-[var(--accent)] open:bg-[var(--surface-2)] focus-visible:outline-none"
    >
      {/* summary：始终可见的卡片头。list-item 默认有 marker，统一隐藏 */}
      <summary className="flex list-none flex-col gap-2 p-4 outline-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-mono text-sm font-semibold leading-tight text-[var(--foreground)]">
            {item.term}
          </h3>
          {item.symbol ? (
            <span
              className="font-mono text-[0.7rem] text-[var(--accent)]"
              aria-hidden
            >
              {item.symbol}
            </span>
          ) : null}
        </div>
        <p className="font-[family-name:var(--font-serif)] text-sm leading-relaxed text-[var(--foreground-soft)]">
          {item.short}
        </p>
      </summary>

      {/* 展开后内容：detail + formula + relatedTag */}
      <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
        <p className="text-sm leading-relaxed text-[var(--foreground-soft)]">
          {item.detail}
        </p>

        {item.formula ? (
          <div className="mt-3">
            <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
              formula
            </div>
            <pre
              className="mt-1.5 overflow-x-auto font-mono text-[0.72rem] leading-relaxed text-[var(--accent)]"
              // LaTeX 源码原样显示，保留反斜杠
            >
              {item.formula}
            </pre>
          </div>
        ) : null}

        {item.relatedTag ? (
          <div className="mt-3 flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
            <span aria-hidden>§</span>
            <span className="text-[var(--accent-warm)]">{item.relatedTag}</span>
          </div>
        ) : null}
      </div>
    </motion.details>
  );
}
