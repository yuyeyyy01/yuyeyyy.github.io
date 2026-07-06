"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { easeOut } from "@/lib/motion";
import ThemeToggle from "@/components/theme-toggle";
import HeaderSearch from "@/components/HeaderSearch";

/**
 * 站点顶部导航 —— framegraph 风。
 * 毛玻璃 sticky，左侧站点标识，右侧导航 + Slack 式搜索框 + GitHub + 主题切换。
 * 搜索直接嵌在 Header（HeaderSearch），输入时下拉出结果，不再用"搜索"文字链接跳页。
 */
const MotionLink = motion.create(Link);

// 下划线变体：rest 隐藏，hover 展开
const underlineVariants: Variants = {
  rest: { width: 0 },
  hover: { width: "100%" },
};

const underlineTransition = { duration: 0.3, ease: easeOut } as const;

export default function Header() {
  return (
    <header className="glass sticky top-0 z-10">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
        <Link
          href="/"
          className="flex items-baseline gap-2 font-mono text-sm font-medium no-underline transition-colors duration-300"
        >
          <span className="text-[var(--foreground)]">Yuyeyyy</span>
          <span aria-hidden className="text-[var(--foreground-muted)]">/</span>
          <span className="text-[var(--foreground-muted)]">render-notes</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <NavLink href="/blog/">博客</NavLink>
          <NavLink href="/archive/">归档</NavLink>
          <NavLink href="/about/">关于</NavLink>
          <HeaderSearch />
          <motion.a
            href="https://github.com/yuyeyyy"
            target="_blank"
            rel="noopener noreferrer"
            initial="rest"
            whileHover="hover"
            className="relative inline-block text-[var(--foreground-soft)] no-underline transition-colors duration-300 hover:text-[var(--foreground)]"
          >
            GitHub
            <motion.span
              aria-hidden
              variants={underlineVariants}
              transition={underlineTransition}
              className="absolute -bottom-0.5 left-0 h-px bg-[var(--accent)]"
            />
          </motion.a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

/**
 * 内部导航链接。next/link 自动拼接 basePath。
 * hover 时下方细线从左滑出。
 */
function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <MotionLink
      href={href}
      initial="rest"
      whileHover="hover"
      className="relative inline-block text-[var(--foreground-soft)] no-underline transition-colors duration-300 hover:text-[var(--foreground)]"
    >
      {children}
      <motion.span
        aria-hidden
        variants={underlineVariants}
        transition={underlineTransition}
        className="absolute -bottom-0.5 left-0 h-px bg-[var(--accent)]"
      />
    </MotionLink>
  );
}
