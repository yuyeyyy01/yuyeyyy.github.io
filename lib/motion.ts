/**
 * 统一动效语言 —— 苹果风，克制柔和。
 * 所有组件共用这些预设，保证整站动效一致。
 */
import type { Variants, Transition } from "framer-motion";

// 标准缓动：苹果常用的 ease-out 曲线
export const easeOut: Transition["ease"] = [0.16, 1, 0.3, 1];
export const easeInOut: Transition["ease"] = [0.65, 0, 0.35, 1];

// 标准时长
export const DUR = {
  fast: 0.2,
  base: 0.4,
  slow: 0.6,
  slower: 0.8,
};

// 淡入上移（入场默认）
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: easeOut },
  },
};

// 纯淡入
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base, ease: easeOut } },
};

// 缩放淡入（用于图标切换等）
export const scaleFade: Variants = {
  hidden: { opacity: 0, scale: 0.6, rotate: -45 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: DUR.base, ease: easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.6,
    rotate: 45,
    transition: { duration: DUR.fast, ease: easeInOut },
  },
};

// 错落容器（子元素依次入场）
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

// 错落子项
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: easeOut },
  },
};

// 滚动进入视口时的配置
export const whileInViewConfig = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, margin: "-80px" },
} as const;
