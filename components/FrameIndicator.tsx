"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Signature 元素：渲染状态指示器。
 *
 * 视觉来自渲染调试的真实语言——一条 LUT 渐变条（冷青 → 琥珀），
 * 上面浮一个 frame 计数 + fps 标签，frame 计数随时间缓慢自增。
 * 这是本页被记住的那一个东西：换个非渲染项目就不会长这样。
 *
 * 克制纪律：
 * - 只有一条线、一个数字、缓慢计数，不闪烁不乱飞。
 * - reduced-motion 下停止计数动效，只保留静态条 + 标签。
 * - SSR 安全：初始帧 0000，挂载后才开始递增，避免 hydration 不匹配。
 */
export default function FrameIndicator() {
  const [frame, setFrame] = useState(0);
  const [fps, setFps] = useState(60);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // 尊重 reduced-motion：不跑计数动效，静态展示即可
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    let last = performance.now();
    let frames = 0;
    let fpsAcc = 0;
    let lastFpsUpdate = last;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      frames++;
      fpsAcc++;
      // 每 ~500ms 更新一次 fps 显示，避免数字抖动太快
      if (now - lastFpsUpdate >= 500) {
        setFps(Math.round((fpsAcc * 1000) / (now - lastFpsUpdate)));
        fpsAcc = 0;
        lastFpsUpdate = now;
      }
      // frame 计数：每秒约 60 帧递增 1（用 dt 累加更稳，但简单起见每 raf +1）
      setFrame((f) => f + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // frame 显示为 4 位补零：0001 / 0042 / 0123
  const frameStr = String(frame).padStart(4, "0");

  return (
    <div
      aria-hidden
      className="frame-indicator flex items-center gap-3 select-none"
    >
      {/* LUT 渐变条 + 周期掠过的扫描光 */}
      <div className="relative w-16 overflow-hidden rounded-[2px] lut-bar">
        <span
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/40"
          style={{ animation: "lut-sweep 4.2s ease-in-out infinite" }}
        />
      </div>
      <span>
        § FRAME {frameStr} · {fps}.0fps
      </span>
    </div>
  );
}
