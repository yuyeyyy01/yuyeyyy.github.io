"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * 阅读进度条 —— 顶部固定细线。
 * 用 framer-motion useScroll 读取整页滚动比例，
 * scaleX 跟随，origin-left 让线从左往右伸展。
 * h-0.5 苹果风克制，accent 配色。
 */
export default function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-20 h-0.5 origin-left bg-[var(--accent)]"
    />
  );
}
