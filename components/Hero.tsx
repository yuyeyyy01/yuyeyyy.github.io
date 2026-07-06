"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import avatarImg from "@/public/assets/me.png";
import { staggerContainer, staggerItem, easeOut, DUR } from "@/lib/motion";
import FrameIndicator from "@/components/FrameIndicator";
import HeroShader from "@/components/HeroShader";

/**
 * 首页 Hero 区：全屏交互式体积云 shader 背景 + 文字叠加。
 *
 * 布局：section min-h-screen，HeroShader 作背景层（z-0），
 * 遮罩层（z-10）三层渐变让文字可读，文字层 z-20。
 * FrameIndicator 移到左上角（渲染调试语言）。
 *
 * 鼠标交互：pointermove 写 mouseRef（归一化 0-1，左下原点），
 * 不进 React state，直接被 HeroShader 每帧读取作光源方向。
 *
 * 克制动效：保留 staggerContainer/staggerItem 入场，删旧鼠标微视差。
 */
export default function Hero() {
  // 鼠标位置归一化 0-1（左下原点），ref 不触发重渲染
  const mouseRef = useRef<[number, number]>([0.5, 0.6]);

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const { innerWidth, innerHeight } = window;
    mouseRef.current = [
      e.clientX / innerWidth,
      1 - e.clientY / innerHeight, // 转左下原点
    ];
  }

  function handlePointerLeave() {
    mouseRef.current = [0.5, 0.6];
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

  return (
    <section
      className="relative flex min-h-screen flex-col justify-end overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* 背景层：体积云 shader */}
      <HeroShader mouseRef={mouseRef} />

      {/* 遮罩层：三层渐变让文字可读 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to top, var(--background) 0%, transparent 45%)," +
            "linear-gradient(to right, var(--background) 0%, transparent 50%)," +
            "linear-gradient(to top, transparent 70%, rgba(7,7,8,0.6) 100%)",
        }}
      />

      {/* signature：左上角渲染状态指示器 */}
      <div className="absolute left-4 top-6 z-20 md:left-8">
        <FrameIndicator />
      </div>

      {/* 文字层 */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="container-page relative z-20 pb-20 pt-32"
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
          className="mt-6 font-[family-name:var(--font-mono)] text-5xl font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--foreground)] md:text-8xl"
        >
          Render Notes.
        </motion.h1>

        {/* 副标题 */}
        <motion.p
          variants={staggerItem}
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
            href="#featured"
            onClick={(e) => handleAnchorClick(e, "#featured")}
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
        href="#featured"
        onClick={(e) => handleAnchorClick(e, "#featured")}
        aria-label="向下滚动查看更多"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: DUR.slow, ease: easeOut }}
        className="absolute inset-x-0 bottom-6 z-20 mx-auto flex w-fit flex-col items-center gap-1 text-[var(--foreground-muted)] transition-opacity duration-300 hover:text-[var(--foreground-soft)]"
      >
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em]">向下探索</span>
        <ChevronDown size={16} aria-hidden className="hero-scroll-cue" />
      </motion.a>
    </section>
  );
}
