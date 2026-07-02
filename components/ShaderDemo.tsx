"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import type { IUniform } from "three";

export interface ShaderDemoProps {
  /** 片段着色器源码 */
  fragmentShader?: string;
  /** 顶点着色器源码 */
  vertexShader?: string;
  /** uniforms，键值对，值需符合 three 的 IUniform 形如 { value: ... } */
  uniforms?: Record<string, IUniform>;
  /** 容器额外 className */
  className?: string;
}

const DEFAULT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
void main() {
  // uv 坐标做的彩色渐变 demo
  vec3 col = vec3(vUv.x, vUv.y, 0.5 + 0.5 * sin((vUv.x + vUv.y) * 3.14159));
  gl_FragColor = vec4(col, 1.0);
}
`;

const DEFAULT_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * 全屏 plane：用 useThree().viewport 拿到世界空间视口尺寸，
 * 把 plane scale 成刚好铺满屏幕，这样 vUv 在屏幕上就是 0-1。
 */
function FullscreenPlane({
  fragmentShader,
  vertexShader,
  uniforms,
}: {
  fragmentShader: string;
  vertexShader: string;
  uniforms: Record<string, IUniform>;
}) {
  const { viewport } = useThree();
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/**
 * 全屏 shader demo 容器。
 * - 默认 fragment 是 uv 渐变；可传 fragmentShader 自定义。
 * - 容器苹果风，同 Scene。
 */
export default function ShaderDemo({
  fragmentShader = DEFAULT_FRAGMENT,
  vertexShader = DEFAULT_VERTEX,
  uniforms,
  className,
}: ShaderDemoProps) {
  const containerClass = useMemo(
    () =>
      [
        "relative h-80 w-full overflow-hidden rounded-2xl border",
        "border-[var(--border)] bg-[var(--background-soft)]",
        className ?? "",
      ].join(" "),
    [className],
  );

  // 稳定 uniforms 引用，避免每次渲染重建 material
  const stableUniforms = useMemo<Record<string, IUniform>>(
    () => uniforms ?? {},
    [uniforms],
  );

  return (
    <div className={containerClass}>
      <Canvas camera={{ position: [0, 0, 1], fov: 50 }} dpr={[1, 2]}>
        <FullscreenPlane
          fragmentShader={fragmentShader}
          vertexShader={vertexShader}
          uniforms={stableUniforms}
        />
      </Canvas>
    </div>
  );
}
