"use client";

import Hero from "@/components/Hero";
import ArticleCard, { type ArticleCardProps } from "@/components/ArticleCard";
import ProjectCard, { type ProjectCardProps } from "@/components/ProjectCard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, whileInViewConfig } from "@/lib/motion";

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

const RENDER_PROJECTS: ProjectCardProps[] = [
  {
    title: "Tequila Sunset 动态天空盒",
    description:
      "仿《极乐迪斯科》的龙舌兰日落风格天空，带大气散射、日夜循环和体积云雾的尝试。",
    href: "https://github.com/yuyeyyy",
  },
  {
    title: "Inception 风格 Portal",
    description:
      "使用 URP ScriptableRendererFeature 实现的多相机 Portal，支持折射、边缘 FX 和多层嵌套。",
    href: "https://github.com/yuyeyyy",
  },
  {
    title: "水体 & 草地交互",
    description:
      "通过深度、法线与顶点动画实现风动草地和角色交互波纹，兼顾移动端性能优化。",
    href: "https://github.com/yuyeyyy",
  },
];

export default function Home() {
  return (
    <main>
      <Hero />

      {/* 最近更新 */}
      <section className="container-page py-20 md:py-28">
        <motion.header
          variants={fadeUp}
          {...whileInViewConfig}
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-2xl"
        >
          <p className="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">
            Latest
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            最近更新
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
            一些关于渲染技术、Shader 实现细节和踩坑记录。如果你也在做实时渲染，应该会有点参考价值。
          </p>
        </motion.header>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {RECENT_ARTICLES.map((a) => (
            <ArticleCard key={a.slug} {...a} />
          ))}
        </div>
      </section>

      {/* 渲染实验 */}
      <section id="projects" className="container-page scroll-mt-20 py-20 md:py-28">
        <motion.header
          variants={fadeUp}
          {...whileInViewConfig}
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-2xl"
        >
          <p className="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">
            Experiments
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            一些渲染实验
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
            正在开发或已完成的效果 Demo，未来会陆续整理成文章和开源仓库。
          </p>
        </motion.header>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {RENDER_PROJECTS.map((p) => (
            <ProjectCard key={p.title} {...p} />
          ))}
        </div>
      </section>

      {/* 关于我 */}
      <section className="container-page py-20 md:py-28">
        <motion.header
          variants={fadeUp}
          {...whileInViewConfig}
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-2xl"
        >
          <p className="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">
            About
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
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
    </main>
  );
}
