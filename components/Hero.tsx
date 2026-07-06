"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import avatarImg from "@/public/assets/me.png";
import { staggerContainer, staggerItem, easeOut, DUR } from "@/lib/motion";
import FrameIndicator from "@/components/FrameIndicator";

/**
 * 首页 Hero 区：左对齐编辑式布局（非居中三件套）。
 * 右上角 signature = FrameIndicator（LUT 条 + frame 计数），渲染调试语言。
 * 标题中文宋体（出版物气质），英文 eyebrow 用 mono（代码气质）。
 *
 * 克制动效：鼠标微视差（头像/标题按不同系数偏移几像素）。
 * 删掉了旧的背景光晕层与滚动视差（廉价感来源）。
 */
export default function Hero() {
  // ---- 鼠标微视差：归一化到 [-1, 1]，再乘以各自系数 ----
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18, mass: 0.3 });
  const sy = useSpring(my, { stiffness: 120, damping: 18, mass: 0.3 });

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const { innerWidth, innerHeight } = window;
    mx.set((e.clientX / innerWidth - 0.5) * 2);
    my.set((e.clientY / innerHeight - 0.5) * 2);
  }
  function handlePointerLeave() {
    mx.set(0);
    my.set(0);
  }

  // 锚点跳转：程序化平滑滚动，不依赖全局 scroll-behavior
  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href.startsWith("#") && href.length > 1) {
      const el = document.querySelector(href);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  // 各层位移：标题系数最大，副标题更小
  const titleX = useTransform(sx, [-1, 1], [-4, 4]);
  const titleY = useTransform(sy, [-1, 1], [-4, 4]);
  const subX = useTransform(sx, [-1, 1], [-2, 2]);
  const subY = useTransform(sy, [-1, 1], [-2, 2]);

  return (
    <section
      className="container-page relative py-24 md:py-32"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* signature：右上角渲染状态指示器 */}
      <div className="absolute right-4 top-20 md:right-8 md:top-24">
        <FrameIndicator />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative max-w-3xl"
      >
        {/* eyebrow：英文 mono，渲染管线标签风 */}
        <motion.p
          variants={staggerItem}
          className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]"
        >
          Rendering Notes · PBR / SSS / Hair
        </motion.p>

        {/* 标题：Render Notes —— mono 大字，framegraph pass 名气质
            末尾的句号是刻意的视觉锚点，像代码行尾的标点。 */}
        <motion.h1
          variants={staggerItem}
          style={{ x: titleX, y: titleY }}
          className="mt-6 font-[family-name:var(--font-mono)] text-5xl font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--foreground)] md:text-7xl"
        >
          Render Notes.
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          variants={staggerItem}
          style={{ x: subX, y: subY }}
          className="mt-6 max-w-xl text-base leading-relaxed text-[var(--foreground-soft)] md:text-lg"
        >
          在做 Unity / URP 渲染与 Shader 开发。这里记录 PBR、皮肤与头发渲染、Portal、水体、体积光的折腾笔记。
        </motion.p>

        {/* CTA：左对齐，非居中 */}
        <motion.div variants={staggerItem} className="mt-10 flex items-center gap-3">
          <Link href="/blog/" className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-sm">
            查看文章
            <ArrowRight size={15} className="-translate-y-px" />
          </Link>
          <Link
            href="#projects"
            onClick={(e) => handleAnchorClick(e, "#projects")}
            className="btn-secondary inline-flex items-center px-5 py-2.5 text-sm"
          >
            看看效果
          </Link>
        </motion.div>

        {/* 头像 + 名字小行：放在标题区下方左侧，不再居中大头像 */}
        <motion.div variants={staggerItem} className="mt-12 flex items-center gap-3">
          <Image
            src={avatarImg}
            alt="Yuyeyyy"
            width={36}
            height={36}
            priority
            className="rounded-full border border-[var(--border)]"
          />
          <div className="font-mono text-xs text-[var(--foreground-muted)]">
            <span className="text-[var(--foreground-soft)]">Yuyeyyy</span>
            <span className="mx-1.5" aria-hidden>·</span>
            <span>Graphics / Rendering</span>
          </div>
        </motion.div>
      </motion.div>

      {/* 滚动提示：底部小箭头 + 文字缓慢浮动，引导向下 */}
      <motion.a
        href="#projects"
        onClick={(e) => handleAnchorClick(e, "#projects")}
        aria-label="向下滚动查看更多"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: DUR.slow, ease: easeOut }}
        className="absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1 text-[var(--foreground-muted)] transition-opacity duration-300 hover:text-[var(--foreground-soft)]"
      >
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em]">向下探索</span>
        <ChevronDown size={16} aria-hidden className="hero-scroll-cue" />
      </motion.a>
    </section>
  );
}
