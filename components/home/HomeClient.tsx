"use client";

import type { ReactNode } from "react";
import ArticleCard, { type ArticleCardProps } from "@/components/ArticleCard";
import FeaturedLab from "@/components/home/FeaturedLab";
import Glossary from "@/components/home/Glossary";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  whileInViewConfig,
} from "@/lib/motion";

const RECENT_ARTICLES: ArticleCardProps[] = [
  {
    slug: "custom-pbr-vs-unity-lit",
    title: "自定义 PBR 与 Unity Lit 的差异拆解",
    date: "2025-11-23",
    category: "Shader / PBR",
    excerpt:
      "记录我如何从零写一套 PBR，并对比 Unity URP/Lit：为什么要改 BRDF、为什么要拆近场和远场光照。",
  },
  {
    slug: "skin-sss-thickness-lut",
    title: "基于厚度图的皮肤 SSS：预积分 LUT 实战",
    date: "2025-11-15",
    category: "Skin / SSS",
    excerpt:
      "从厚度图获取数据、生成 SSS kernel，再到 LUT 采样和屏幕空间模糊的一条完整流程示例。",
  },
  {
    slug: "kajiya-kay-marschner-hair",
    title: "Kajiya-Kay & \"类 Marschner\" 头发高光",
    date: "2025-11-05",
    category: "Hair",
    excerpt:
      "为什么用两条 Kajiya 高光来近似 Marschner，多分支高光在头发体积感中的作用是什么。",
  },
];

/**
 * section 标签行：framegraph pass 风格——§ Name + 细线延伸。
 * 刻意不用 01/02/03 编号（skill 指出：除非是真序列否则编号是装饰）。
 */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="section-rule">
      <span>{children}</span>
    </div>
  );
}

interface HomeClientProps {
  /** 插在 § Glossary 与 § About 之间的内容（§ Stats + § Tags，由 page.tsx 在 build 期取数后注入的 client 子组件） */
  children?: ReactNode;
}

/**
 * 首页客户端主体：承载所有 framer-motion 入场动效。
 * page.tsx 改为 server component 取 fs 数据，本组件承接原 page.tsx 的 motion 用法。
 * 视觉与原 page.tsx 完全一致，只是把 motion 调用集中到 client 边界。
 *
 * 顺序：§ Latest → § Featured Lab → § Glossary → children(§ Stats + § Tags) → § About
 */
export default function HomeClient({ children }: HomeClientProps) {
  return (
    <>
      {/* 最近更新 */}
      <section className="container-page py-20 md:py-28">
        <SectionLabel>§ Latest</SectionLabel>
        <motion.header
          variants={fadeUp}
          {...whileInViewConfig}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-5 max-w-2xl"
        >
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            最近更新
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
            一些关于渲染技术、Shader 实现细节和踩坑记录。如果你也在做实时渲染，应该会有点参考价值。
          </p>
        </motion.header>

        <motion.div
          variants={staggerContainer}
          {...whileInViewConfig}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {RECENT_ARTICLES.map((a) => (
            <ArticleCard key={a.slug} {...a} entryVariant={staggerItem} />
          ))}
        </motion.div>
      </section>

      {/* Featured Lab：首页可交互 shader demo（独立 client 组件，自带 § header） */}
      <FeaturedLab />

      {/* 渲染术语速查 */}
      <section className="container-page py-20 md:py-28">
        <SectionLabel>§ Glossary</SectionLabel>
        <motion.header
          variants={fadeUp}
          {...whileInViewConfig}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-5 max-w-2xl"
        >
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            渲染术语速查
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
            实时渲染核心概念的精简卡片。点开任意卡片看公式与延伸解释——写文章时反复查的那一组。
          </p>
        </motion.header>

        <Glossary />
      </section>

      {/* § Tags（由 server 取数后注入的 client 子组件） */}
      {children}

      {/* 关于我 */}
      <section className="container-page py-20 md:py-28">
        <SectionLabel>§ About</SectionLabel>
        <motion.header
          variants={fadeUp}
          {...whileInViewConfig}
          viewport={{ once: true, margin: "-60px" }}
          className="mt-5 max-w-2xl"
        >
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            关于我
          </h2>
        </motion.header>

        <div className="card mt-8 p-6 md:p-8">
          <p className="text-base leading-relaxed text-[var(--foreground-soft)]">
            Unity 图形 / Shader 爱好者，偏技术美术 / 渲染工程方向。喜欢把&ldquo;看起来很玄学&rdquo;的效果拆成数学和代码，再一点点还原出来。这个站会集中记录：图形学基础复习提纲、渲染管线学习笔记、Unity URP 实战 Shader、以及一些面向面试的问答整理。
          </p>
          <Link
            href="/about/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
          >
            了解更多
            <ArrowRight size={16} className="-translate-y-px" />
          </Link>
        </div>
      </section>
    </>
  );
}
