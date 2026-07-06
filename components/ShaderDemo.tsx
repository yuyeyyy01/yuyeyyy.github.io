"use client";
import { useId, useRef, useEffect } from "react";
import { renderShaderHTML } from "@/components/webgl-demos/inline-renderer";
import { mountHTMLString } from "@/components/webgl-demos/mount";

/**
 * ShaderDemo —— vanilla WebGL2 全屏 triangle shader demo 外壳（替代 react-three-fiber 版）。
 * 实际渲染逻辑在 renderShaderHTML 返回的 HTML 字符串里，通过 mountHTMLString 激活。
 */
export default function ShaderDemo({ className }: { className?: string }) {
  const id = useId().replace(/[:]/g, "");
  const canvasId = "demo-" + id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    mountHTMLString(renderShaderHTML({ demoId: "shader-demo", canvasId, height: 320 }), ref.current);
  }, [canvasId]);
  return <div ref={ref} className={className} />;
}
