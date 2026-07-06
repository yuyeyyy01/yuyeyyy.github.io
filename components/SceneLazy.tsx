"use client";

import dynamic from "next/dynamic";

/**
 * SceneLazy —— Scene 的 dynamic 懒加载包装。
 *
 * Next 15 静态导出下，ssr:false 不能直接在 Server Component 用，
 * 必须用 Client Component 包一层。这里就是那一层。
 *
 * 收益：three + @react-three/fiber + @react-three/drei（~165KB gzip）
 * 不再进文章页首屏 bundle，只在 MDX 实际渲染 <Scene/> 时才加载。
 *
 * 占位固定 h-80（与 Scene 容器同尺寸），避免 hydration 布局跳动。
 * framegraph 视觉：§ loading scene… mono 标签。
 */
const Scene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
  loading: () => (
    <div
      className="relative h-80 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background-soft)]"
      aria-hidden
    >
      <span className="absolute left-3 top-2 font-mono text-[0.65rem] tracking-[0.02em] text-[var(--foreground-muted)]">
        <span className="text-[var(--accent)]">§</span> loading scene…
      </span>
    </div>
  ),
});

export default Scene;
