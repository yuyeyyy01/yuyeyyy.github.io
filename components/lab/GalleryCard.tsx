"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { staggerItem } from "@/lib/motion";
import type { GalleryItem } from "@/lib/lab-gallery";

/**
 * GalleryCard —— /lab 作品集 / 练习卡片。
 *
 * 交互设计（双击进入）：
 * - 指针精确设备（鼠标）：双击卡片跳转。单击一次先给「再点一次查看笔记」提示，
 *   1.6s 后提示自动消失，避免误触直接跳走。
 * - 触屏（pointer: coarse）：移动端没有双击手势习惯，降级为单击直接跳转。
 * - 键盘：Enter / Space 直接跳转，保证无障碍可达（不要求双击）。
 *
 * href 缺省表示笔记还在整理中：卡片不可跳转，右下角显示 § wip。
 */
export default function GalleryCard({ item }: { item: GalleryItem }) {
  const router = useRouter();
  const [hintVisible, setHintVisible] = useState(false);
  const [isCoarse, setIsCoarse] = useState(false);
  const hintTimer = useRef<number | null>(null);

  const disabled = !item.href;

  // 触屏检测：coarse pointer 下单击即跳，不强制双击
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    setIsCoarse(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsCoarse(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // 卸载时清掉提示计时器，避免 setState on unmounted
  useEffect(() => {
    return () => {
      if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    };
  }, []);

  const go = () => {
    if (!item.href) return;
    router.push(item.href);
  };

  const handleClick = () => {
    if (disabled) return;
    // 触屏：单击直达
    if (isCoarse) {
      go();
      return;
    }
    // 鼠标：先提示，等第二次点击（dblclick）
    setHintVisible(true);
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintVisible(false), 1600);
  };

  const handleDoubleClick = () => {
    if (disabled || isCoarse) return;
    go();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };

  const isVideo = item.kind === "video";

  return (
    <motion.article
      variants={staggerItem}
      role={disabled ? undefined : "link"}
      tabIndex={disabled ? undefined : 0}
      aria-label={disabled ? undefined : `${item.title}（双击查看笔记）`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className={
        "card group relative flex h-full flex-col overflow-hidden p-0 transition-all duration-300 ease-out focus:outline-none focus-visible:border-[var(--accent)] " +
        (disabled
          ? "cursor-default"
          : "cursor-pointer select-none hover:-translate-y-0.5 hover:border-[var(--accent)]")
      }
    >
      {/* 封面区：video 走 16:9，image 走 4:3 */}
      <div
        className={
          "relative w-full overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)] " +
          (isVideo ? "aspect-video" : "aspect-[4/3]")
        }
      >
        <Image
          src={item.cover}
          alt={item.title}
          fill
          sizes={
            isVideo
              ? "(min-width: 768px) 50vw, 100vw"
              : "(min-width: 768px) 33vw, 100vw"
          }
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />

        {/* § kind 标签：左上角 mono 小字 */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-1.5 font-mono text-[0.6rem] tracking-[0.02em] text-white opacity-80 mix-blend-difference"
        >
          <span className="text-[var(--accent)]">§</span> {item.kind}
        </span>

        {/* 视频：中央播放标记，纯视觉提示，不内嵌 player 以免抢带宽 */}
        {isVideo ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-black/35 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
              <Play
                size={18}
                className="translate-x-px text-white"
                fill="currentColor"
              />
            </span>
          </span>
        ) : null}

        {/* 单击提示：鼠标端第一次点击后浮现 */}
        {hintVisible ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--accent)] px-3 py-1.5 text-center font-mono text-[0.68rem] text-white">
            再点一次查看笔记
          </span>
        ) : null}
      </div>

      {/* 文字区 */}
      <div className="flex flex-1 flex-col p-5">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
          <span className="text-[var(--accent)]">§</span> {item.category}
        </span>
        <h3 className="mt-2 font-[family-name:var(--font-serif)] text-lg font-semibold leading-snug text-[var(--foreground)]">
          {item.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-soft)]">
          {item.summary}
        </p>

        {/* 标签行 */}
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-[0.65rem] text-[var(--foreground-muted)]">
          {item.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      {/* 右下角状态指示 */}
      <span
        aria-hidden
        className={
          "pointer-events-none absolute bottom-4 right-4 font-mono text-[0.68rem] " +
          (disabled
            ? "text-[var(--accent-warm)]"
            : "translate-x-1 text-[var(--foreground-muted)] opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:text-[var(--accent)] group-hover:opacity-100")
        }
      >
        {disabled ? "§ wip" : "双击进入"}
      </span>
    </motion.article>
  );
}
