"use client";

import { motion } from "framer-motion";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  whileInViewConfig,
} from "@/lib/motion";

/**
 * § Stats —— 站点统计做成 framegraph 渲染管线状态仪表盘。
 *
 * 数据由 server 端 page.tsx 在 build 期算好后以 props 注入，避免把
 * node:fs（getAllPosts/getAllTags）打进 client bundle；同时保留 motion
 * 入场动效（复用 fadeUp / staggerContainer / staggerItem，reduced-motion 静态）。
 *
 * 视觉：5 个 § pass 节点（grid-cols-2 md:grid-cols-5），每格顶部一条
 * .lut-bar 渐变条作 framegraph 状态指示，§ 标签用 mono muted，大数字用
 * mono accent（青绿），单位/说明用 mono muted。日期格字号收窄以防溢出。
 */
export interface StatsPanelProps {
  /** 文章数 */
  postCount: number;
  /** Lab demo 数 */
  labCount: number;
  /** 所有文章 content 的字符数总和（中文按字粗略算） */
  totalChars: number;
  /** 最近更新日期，格式 YYYY-MM-DD */
  lastUpdate: string;
  /** 渲染技术标签数 */
  tagCount: number;
}

interface StatNode {
  /** § pass 标签名，如 § Posts */
  label: string;
  /** 大数字显示文本 */
  value: string;
  /** 单位/说明 */
  unit: string;
  /** 是否日期格（日期格字号收窄） */
  isDate?: boolean;
}

export default function StatsPanel({
  postCount,
  labCount,
  totalChars,
  lastUpdate,
  tagCount,
}: StatsPanelProps) {
  const stats: StatNode[] = [
    { label: "§ Posts", value: String(postCount), unit: "篇文章" },
    { label: "§ Labs", value: String(labCount), unit: "个 Lab demo" },
    {
      label: "§ Words",
      value: totalChars.toLocaleString("en-US"),
      unit: "字（含代码）",
    },
    {
      label: "§ Updated",
      value: lastUpdate || "—",
      unit: "最近更新",
      isDate: true,
    },
    { label: "§ Tags", value: String(tagCount), unit: "个技术标签" },
  ];

  return (
    <section className="container-page py-20 md:py-28">
      {/* § pass 标签行：framegraph pass 风 */}
      <div className="section-rule">
        <span>§ Stats</span>
      </div>

      <motion.header
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-5 max-w-2xl"
      >
        <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-tight md:text-4xl">
          管线状态
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
          截止当前，站点的渲染管线产出。
        </p>
      </motion.header>

      {/* 仪表盘 grid：5 个 § pass 节点 */}
      <motion.div
        variants={staggerContainer}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5"
      >
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </motion.div>
    </section>
  );
}

function StatCard({ stat }: { stat: StatNode }) {
  return (
    <motion.div
      variants={staggerItem}
      className="card flex flex-col gap-3 p-4 transition-colors duration-300 hover:border-[var(--accent)]"
    >
      {/* 顶部 LUT 渐变条：framegraph 状态指示器装饰 */}
      <div className="lut-bar" aria-hidden />

      {/* § pass 标签：mono muted */}
      <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
        {stat.label}
      </div>

      {/* 大数字：mono accent；日期格字号收窄防溢出 */}
      <div
        className={
          "font-mono font-semibold leading-none text-[var(--accent)] " +
          (stat.isDate
            ? "text-base md:text-lg"
            : "text-2xl md:text-3xl")
        }
      >
        {stat.value}
      </div>

      {/* 单位/说明：mono muted */}
      <div className="font-mono text-[0.68rem] text-[var(--foreground-muted)]">
        {stat.unit}
      </div>
    </motion.div>
  );
}
