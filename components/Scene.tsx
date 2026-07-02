"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, type ReactNode } from "react";

export interface SceneProps {
  /** 自定义 Canvas 内的 meshes；不传则渲染默认示例场景 */
  children?: ReactNode;
  /** 容器额外 className，覆盖默认高度等 */
  className?: string;
  /** OrbitControls 自动旋转 */
  autoRotate?: boolean;
}

/**
 * 默认示例场景：一个带 flatShading 的八面体。
 * 颜色用苹果橙，深浅主题下都看得清。
 */
function DefaultScene() {
  return (
    <mesh rotation={[0.4, 0.6, 0]}>
      <octahedronGeometry args={[1.2, 0]} />
      <meshStandardMaterial
        color="#ff9f0a"
        metalness={0.3}
        roughness={0.35}
        flatShading
      />
    </mesh>
  );
}

/**
 * 可交互 3D demo 容器。
 * - Canvas 透明，背景由外层 div 提供（var(--background-soft)）。
 * - OrbitControls 支持拖拽旋转 + 滚轮缩放，禁用平移避免误触。
 * - 传 children 自定义 meshes；不传则渲染 DefaultScene。
 */
export default function Scene({
  children,
  className,
  autoRotate = false,
}: SceneProps) {
  const containerClass = useMemo(
    () =>
      [
        "relative h-80 w-full overflow-hidden rounded-2xl border",
        "border-[var(--border)] bg-[var(--background-soft)]",
        className ?? "",
      ].join(" "),
    [className],
  );

  return (
    <div className={containerClass}>
      <Canvas camera={{ position: [3, 2.5, 3], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 5, 3]} intensity={1.1} />
        <directionalLight
          position={[-3, -2, -4]}
          intensity={0.35}
          color="#88aaff"
        />
        {children ?? <DefaultScene />}
        <OrbitControls
          enablePan={false}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          minDistance={2.5}
          maxDistance={12}
        />
      </Canvas>
    </div>
  );
}
