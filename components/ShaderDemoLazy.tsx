"use client";

import dynamic from "next/dynamic";

/**
 * ShaderDemoLazy —— ShaderDemo 的 dynamic 懒加载包装。
 * 同 SceneLazy 的理由：把 react-three-fiber 系延迟到实际渲染时加载。
 */
const ShaderDemo = dynamic(() => import("@/components/ShaderDemo"), {
  ssr: false,
  loading: () => (
    <div
      className="relative h-80 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background-soft)]"
      aria-hidden
    >
      <span className="absolute left-3 top-2 font-mono text-[0.65rem] tracking-[0.02em] text-[var(--foreground-muted)]">
        <span className="text-[var(--accent)]">§</span> loading shader…
      </span>
    </div>
  ),
});

export default ShaderDemo;
