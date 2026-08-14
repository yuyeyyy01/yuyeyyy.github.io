"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, whileInViewConfig } from "@/lib/motion";
import GalleryCard from "./GalleryCard";
import type { GalleryItem } from "@/lib/lab-gallery";

export interface GallerySectionProps {
  /** § 标签，如 "§ Portfolio" */
  label: string;
  /** 宋体大标题 */
  title: string;
  /** 标题下的说明段 */
  description: string;
  items: GalleryItem[];
  /** 网格列数：video 分区用 2 列大卡，image 分区用 3 列小卡 */
  columns: 2 | 3;
}

/**
 * GallerySection —— /lab 的一个分区（§ Portfolio 或 § Exercises）。
 *
 * framegraph pass 风：§ 标签行 + 宋体标题 + 说明段 + 错落入场的卡片网格。
 * 卡片网格用 staggerContainer 驱动 GalleryCard 的 staggerItem 依次入场。
 */
export default function GallerySection({
  label,
  title,
  description,
  items,
  columns,
}: GallerySectionProps) {
  if (items.length === 0) return null;

  const gridCols =
    columns === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="py-16 md:py-20">
      <div className="section-rule">
        <span>{label}</span>
      </div>

      <motion.header
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-5 max-w-2xl"
      >
        <h2 className="font-[family-name:var(--font-serif)] text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--foreground-soft)]">
          {description}
        </p>
      </motion.header>

      <motion.div
        variants={staggerContainer}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className={`mt-8 grid gap-5 ${gridCols}`}
      >
        {items.map((item) => (
          <GalleryCard key={item.slug} item={item} />
        ))}
      </motion.div>
    </section>
  );
}
