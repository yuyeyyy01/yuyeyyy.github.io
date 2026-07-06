"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * 阅读进度条 —— 顶部固定，framegraph 渲染进度风。
 * 一条 LUT 渐变（冷青 → 琥珀，与 signature 呼应）按滚动比例从左铺到右；
 * 末端带一个移动的"扫描头"亮线，像 framegraph 的进度光标。
 * 用 framer-motion useScroll 读取整页滚动比例，scaleX 从左伸展。
 */
export default function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-20 h-0.5 origin-left bg-[var(--border)]"
    >
      {/* LUT 渐变填充：按滚动比例从左伸展 */}
      <motion.div
        style={{ scaleX }}
        className="h-full origin-left"
        // 与 signature 的 LUT 条同色板：accent → accent-warm
      >
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--accent), var(--accent-warm))",
          }}
        />
      </motion.div>
    </div>
  );
}
