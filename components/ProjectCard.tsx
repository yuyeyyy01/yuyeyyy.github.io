"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";

export interface ProjectCardProps {
  /** 项目名称 */
  title: string;
  /** 项目描述 */
  description: string;
  /** 可选的 lucide 图标节点，渲染在 48x48 圆角方块中 */
  icon?: ReactNode;
}

/**
 * 苹果风项目卡片。
 * 纯展示型，hover 时柔和上移 + 阴影 + 加深边框。
 * 滚动进入视口时淡入上移（whileInView，只触发一次）。
 */
export default function ProjectCard({
  title,
  description,
  icon,
}: ProjectCardProps) {
  return (
    <motion.article
      variants={fadeUp}
      {...whileInViewConfig}
      viewport={{ once: true, margin: "-60px" }}
      className="card group h-full p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
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
    </motion.article>
  );
}
