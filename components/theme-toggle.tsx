"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { easeOut } from "@/lib/motion";

/**
 * 主题切换按钮 —— 苹果风，放在 Header 右侧。
 * 图标用 AnimatePresence 旋转淡入淡出，类似 iOS 控制中心的图标翻转感。
 */
const iconVariants = {
  hidden: { opacity: 0, rotate: -90, scale: 0.5 },
  visible: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: { duration: 0.3, ease: easeOut },
  },
  exit: {
    opacity: 0,
    rotate: 90,
    scale: 0.5,
    transition: { duration: 0.2, ease: easeOut },
  },
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免水合不匹配
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // 占位，保持布局尺寸，避免水合跳动
    return <div className="h-9 w-9" aria-hidden />;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--foreground-soft)] transition-colors duration-300 hover:text-[var(--foreground)]"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={isDark ? "sun" : "moon"}
          variants={iconVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex items-center justify-center"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
