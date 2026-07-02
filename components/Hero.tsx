"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import avatarImg from "@/public/assets/me.png";
import { staggerContainer, staggerItem, easeOut, DUR } from "@/lib/motion";

/**
 * 首页 Hero 区：苹果风居中布局。
 * 克制的小圆头像 -> eyebrow -> 大标题（两行，第二行弱化）-> 副标题 -> 双 CTA。
 * 内部元素错落依次淡入上移，间隔 80ms。
 *
 * 三层克制动效：
 * 1) 鼠标微视差：头像/标题/副标题按不同系数随鼠标偏移几像素，制造层次（useSpring 平滑）。
 * 2) 滚动视差：背景光晕随滚动缓慢上移，内容不动，营造"光在远处"的纵深。
 * 3) 滚动提示：底部小箭头 + 文字缓慢上下浮动，引导向下滚动。纯 CSS keyframes。
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

  // 各层位移：越靠上层系数越大，制造近大远小
  const avatarX = useTransform(sx, [-1, 1], [-6, 6]);
  const avatarY = useTransform(sy, [-1, 1], [-6, 6]);
  const titleX = useTransform(sx, [-1, 1], [-4, 4]);
  const titleY = useTransform(sy, [-1, 1], [-4, 4]);
  const subX = useTransform(sx, [-1, 1], [-2, 2]);
  const subY = useTransform(sy, [-1, 1], [-2, 2]);

  // ---- 滚动视差：背景光晕随滚动上移（仅 Hero 区高度范围内）----
  const { scrollY } = useScroll();
  const glowY = useTransform(scrollY, [0, 600], [0, -60]);

  return (
    <section
      className="container-page relative py-24 md:py-32"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* 背景光晕（滚动视差层）：比内容更"远"，随滚动缓慢上移 */}
      <motion.div
        aria-hidden
        style={{ y: glowY }}
        className="pointer-events-none absolute inset-x-0 -top-10 h-72 opacity-70"
      >
        <div className="mx-auto h-full max-w-3xl bg-[radial-gradient(60%_50%_at_50%_0%,var(--bg-glow-1)_0%,transparent_70%)]" />
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative mx-auto max-w-3xl text-center"
      >
        <motion.div variants={staggerItem} style={{ x: avatarX, y: avatarY }} className="inline-block">
          <Image
            src={avatarImg}
            alt="Yuyeyyy"
            width={48}
            height={48}
            priority
            className="mx-auto rounded-full border border-[var(--border)]"
          />
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="mt-8 text-sm uppercase tracking-widest text-[var(--foreground-muted)]"
        >
          Graphics · Rendering · Shader
        </motion.p>

        <motion.h1
          variants={staggerItem}
          style={{ x: titleX, y: titleY }}
          className="mt-5 text-5xl font-semibold leading-[1.08] tracking-[-0.03em] md:text-7xl"
        >
          Render.
          <br />
          <span className="text-[var(--foreground-soft)]">Notes.</span>
        </motion.h1>

        <motion.p
          variants={staggerItem}
          style={{ x: subX, y: subY }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--foreground-soft)] md:text-xl"
        >
          在做 Unity / URP 渲染与 Shader 开发。这里记录 PBR、皮肤与头发渲染、Portal、水体、体积光的折腾笔记。
        </motion.p>

        <motion.div variants={staggerItem} className="mt-10 flex items-center justify-center gap-3">
          <Link href="/blog/" className="btn-primary inline-flex items-center gap-1.5 px-6 py-3 text-sm">
            查看文章
            <ArrowRight size={16} className="-translate-y-px" />
          </Link>
          <Link href="#projects" className="btn-secondary px-6 py-3 text-sm">
            看看效果
          </Link>
        </motion.div>
      </motion.div>

      {/* 滚动提示：底部小箭头 + 文字缓慢浮动，引导向下 */}
      <motion.a
        href="#projects"
        aria-label="向下滚动查看更多"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: DUR.slow, ease: easeOut }}
        className="absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1 text-[var(--foreground-muted)] transition-opacity duration-300 hover:text-[var(--foreground-soft)]"
      >
        <span className="text-[0.7rem] uppercase tracking-[0.18em]">向下探索</span>
        <ChevronDown
          size={18}
          aria-hidden
          className="hero-scroll-cue"
        />
      </motion.a>
    </section>
  );
}
