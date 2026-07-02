"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import avatarImg from "@/public/assets/me.png";
import { staggerContainer, staggerItem, easeOut, DUR } from "@/lib/motion";

/**
 * 首页 Hero 区：苹果风居中布局。
 * 克制的小圆头像 -> eyebrow -> 大标题（两行，第二行弱化）-> 副标题 -> 双 CTA。
 * 内部元素错落依次淡入上移，间隔 80ms。
 */
export default function Hero() {
  return (
    <section className="container-page py-24 md:py-32">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-3xl text-center"
      >
        <motion.div variants={staggerItem}>
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
          className="mt-5 text-5xl font-semibold leading-[1.08] tracking-[-0.03em] md:text-7xl"
        >
          把玄学的效果，
          <br />
          <span className="text-[var(--foreground-soft)]">拆成数学和代码。</span>
        </motion.h1>

        <motion.p
          variants={staggerItem}
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
    </section>
  );
}
