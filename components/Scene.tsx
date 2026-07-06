"use client";
import { useId, useRef, useEffect } from "react";
import { renderSceneHTML } from "@/components/webgl-demos/scene-mesh";
import { mountHTMLString } from "@/components/webgl-demos/mount";

export interface SceneProps {
  autoRotate?: boolean;
  mesh?: "octahedron" | "icosahedron";
  className?: string;
  children?: never;
}

/**
 * Scene —— vanilla WebGL2 mesh 场景外壳（替代 react-three-fiber 版）。
 * 实际渲染逻辑在 renderSceneHTML 返回的 HTML 字符串里，通过 mountHTMLString 激活。
 * children 不再支持（vanilla 版没有 r3f mesh 语法），传了会被忽略。
 */
export default function Scene({ autoRotate = false, mesh = "octahedron", className }: SceneProps) {
  const id = useId().replace(/[:]/g, "");
  const canvasId = "scene-" + id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    mountHTMLString(renderSceneHTML({ canvasId, height: 320, autoRotate, mesh }), ref.current);
  }, [autoRotate, mesh, canvasId]);
  return <div ref={ref} className={className} />;
}
