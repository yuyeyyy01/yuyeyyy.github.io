"use client";
import { useId, useRef, useEffect } from "react";
import { renderShaderHTML } from "@/components/webgl-demos/inline-renderer";
import { renderControlsHTML } from "@/components/webgl-demos/controls-html";
import { DEMOS } from "@/components/webgl-demos/shaders";
import { mountHTMLString } from "@/components/webgl-demos/mount";

/**
 * Playground —— 单个预配置 shader 沙盒外壳。
 * 把渲染器 + 控件两段 HTML 字符串拼起来，mountHTMLString 激活 <script>。
 */
function Playground({ demoId }: { demoId: "pbr" | "sss" | "hair" }) {
  const id = useId().replace(/[:]/g, "");
  const canvasId = "pg-" + id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const html =
      renderShaderHTML({ demoId, canvasId, height: 320 }) +
      renderControlsHTML({ canvasId, uniforms: DEMOS[demoId].uniforms });
    mountHTMLString(html, ref.current);
  }, [demoId, canvasId]);
  return <div ref={ref} />;
}

/** PBR 沙盒：roughness / metallic 滑块，呼应 custom-pbr-vs-unity-lit.mdx */
export function PlaygroundPBR() {
  return <Playground demoId="pbr" />;
}

/** SSS 沙盒：thickness / tint 滑块，呼应 skin-sss-thickness-lut.mdx */
export function PlaygroundSSS() {
  return <Playground demoId="sss" />;
}

/** Hair 沙盒：shift 滑块，呼应 kajiya-kay-marschner-hair.mdx */
export function PlaygroundHair() {
  return <Playground demoId="hair" />;
}
