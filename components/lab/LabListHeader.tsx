"use client";

import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";

/**
 * LabListHeader —— /lab 列表页标题区（客户端组件）。
 * framer-motion v12 的 motion.xxx 会在服务端调用 createMotionComponent()，
 * 服务端组件直接用 motion 会导致 prerender 报错。这里用 "use client" 隔离，
 * 列表页本身仍保留 metadata 服务端导出。
 */
export default function LabListHeader() {
  return (
    <header className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
        <span className="text-[var(--accent)]">§</span> Lab
      </p>
      <motion.h1
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-4 font-[family-name:var(--font-serif)] text-3xl font-bold leading-tight tracking-[-0.02em] text-[var(--foreground)] md:text-4xl"
      >
        作品集与渲染练习
      </motion.h1>
      <motion.p
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]"
      >
        上半部分是完整落地的项目，配效果视频；下半部分是按渲染方向拆的专项练习，配静态图。
        每张卡片<span className="font-mono text-[var(--accent)]">双击</span>
        进入对应的技术笔记，
        <span className="font-mono text-[var(--accent-warm)]">§ wip</span>{" "}
        表示笔记还在整理中。
      </motion.p>
    </header>
  );
}
