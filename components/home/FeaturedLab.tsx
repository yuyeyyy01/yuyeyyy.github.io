"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";
import { LAB_DEMOS } from "@/components/lab/demos";
import LabPlayground from "@/components/lab/LabPlayground";

type UniformValue = number | [number, number, number];

const DIFFICULTY_LABEL: Record<string, string> = {
  basic: "基础",
  intermediate: "进阶",
  advanced: "高阶",
};

/**
 * § Featured Lab —— 首页主推可交互 shader demo。
 *
 * 取 LAB_DEMOS 首项（volumetric-clouds）用 LabPlayground 全屏渲染，
 * 顶部 SectionLabel + 宋体大标题，下方 demo 元信息（title/description/difficulty）
 * + 进入实验室 Link。LabPlayground 自带预设圆点按钮，无需额外滑块面板。
 * framegraph pass 节点风：accent 顶线 + § 标签。
 */
export default function FeaturedLab() {
  const demo = LAB_DEMOS[0];
  const [values, setValues] = useState<Record<string, UniformValue>>(
    () => ({ ...demo.defaults }),
  );

  return (
    <section className="container-page py-20 md:py-28">
      {/* 顶部 accent 线 + § 标签：framegraph pass 节点风 */}
      <div
        aria-hidden
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--accent) 20%, var(--accent) 80%, transparent)",
        }}
      />
      <div className="section-rule mt-4">
        <span>§ Featured Lab</span>
      </div>

      <motion.header
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-5 max-w-2xl"
      >
        <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-tight md:text-4xl">
          渲染实验 · 可调参
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
          一个全屏可调参的 shader demo，进来就能玩。预设圆点切换天气，看 fbm 云密度场在前向透射下的青绿/琥珀变化。
        </p>
      </motion.header>

      {/* demo 元信息行：title · difficulty 标签，mono 风 */}
      <motion.div
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-8 flex flex-wrap items-center gap-3 font-mono text-xs"
      >
        <span className="text-[var(--foreground)]">{demo.title}</span>
        <span aria-hidden className="text-[var(--foreground-muted)]">·</span>
        <span className="text-[var(--accent)]">
          {DIFFICULTY_LABEL[demo.difficulty] ?? demo.difficulty}
        </span>
      </motion.div>

      {/* 主 demo 容器：card + accent 顶线，LabPlayground 60vh */}
      <motion.div
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="card mt-4 overflow-hidden p-0"
      >
        <LabPlayground
          fragment={demo.fragment}
          mesh={demo.mesh}
          uniforms={demo.uniforms}
          defaults={demo.defaults}
          presets={demo.presets}
          values={values}
          onValuesChange={setValues}
          allowDrag={false}
          height={60}
        />
      </motion.div>

      {/* 描述 + 进入实验室 Link */}
      <motion.p
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--foreground-soft)]"
      >
        {demo.description}
      </motion.p>

      <motion.div
        variants={fadeUp}
        {...whileInViewConfig}
        viewport={{ once: true, margin: "-60px" }}
        className="mt-6"
      >
        <Link
          href="/lab/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
        >
          进入实验室
          <ArrowRight size={16} className="-translate-y-px" />
        </Link>
      </motion.div>
    </section>
  );
}
