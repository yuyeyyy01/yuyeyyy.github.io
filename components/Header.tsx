"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { easeOut } from "@/lib/motion";
import ThemeToggle from "@/components/theme-toggle";

/**
 * 站点顶部导航 —— 苹果风。
 * 毛玻璃 sticky，左侧站点标识，右侧导航 + GitHub 外链 + 主题切换。
 * next/link 自动处理 basePath，外链用普通 <a>。
 * 导航链接 hover 时下方有细线从左滑出（width 0 -> 100%）。
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
          className="flex items-baseline gap-2 text-sm font-medium no-underline transition-colors duration-300"
        >
          <span className="text-[var(--foreground)]">Yuyeyyy</span>
          <span
            aria-hidden
            className="text-[var(--foreground-muted)]"
          >
            ·
          </span>
          <span className="text-[var(--foreground-muted)]">Graphics</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <NavLink href="/blog/">博客</NavLink>
          <NavLink href="/about/">关于</NavLink>
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
              className="absolute -bottom-0.5 left-0 h-px bg-[var(--foreground)]"
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
        className="absolute -bottom-0.5 left-0 h-px bg-[var(--foreground)]"
      />
    </MotionLink>
  );
}
