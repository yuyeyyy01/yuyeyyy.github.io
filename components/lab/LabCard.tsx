"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";
import MiniShader from "@/components/MiniShader";
import type { LabDemo } from "./types";

/**
 * LabCard —— /lab 列表页卡片。
 * 顶部 MiniShader 实时 mini shader 预览（用 demo 的精简 fragment），
 * 底部宋体标题 + mono 难度标签 + 简介。整卡 Link 到 /lab/[slug]/。
 * hover accent 边框 + 上移。
 */
export default function LabCard({ demo }: { demo: LabDemo }) {
  return (
    <motion.div
      variants={fadeUp}
      {...whileInViewConfig}
      viewport={{ once: true, margin: "-60px" }}
    >
      <Link href={`/lab/${demo.slug}/`} className="block h-full" aria-label={demo.title}>
        <article className="card group relative flex h-full flex-col overflow-hidden p-0 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--accent)]">
          <div className="relative aspect-[4/3] w-full border-b border-[var(--border)] bg-[var(--surface-2)]">
            <MiniShader fragment={demo.miniFragment} label={demo.slug} className="h-full w-full" />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                <span className="text-[var(--accent)]">§</span> {demo.difficulty}
              </span>
            </div>
            <h3 className="mt-2 font-[family-name:var(--font-serif)] text-lg font-semibold leading-snug text-[var(--foreground)]">
              {demo.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-soft)]">
              {demo.description}
            </p>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
