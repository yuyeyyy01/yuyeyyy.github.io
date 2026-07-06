"use client";

import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";

/**
 * LabListHeader —— /lab 列表页标题区（客户端组件）。
 * 从 app/lab/page.tsx 抽出：framer-motion v12 的 motion.xxx 会在服务端
 * 调用 createMotionComponent()，服务端组件直接用 motion 会导致 prerender 报错。
 * 这里用 "use client" 把 motion 用法隔离，列表页本身仍保留 metadata 服务端导出。
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
        渲染实验室
      </motion.h1>
      <motion.p
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]"
      >
        纯 WebGL2 实时着色器 demo，不引 three。每个 demo 都可在浏览器里拖参数实时看效果，fragment 源码完全开放。配色青绿 + 琥珀，与 framegraph 视觉一致。
      </motion.p>
    </header>
  );
}
