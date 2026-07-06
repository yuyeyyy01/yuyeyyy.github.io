"use client";

import { useEffect, useRef } from "react";

/**
 * MiniShader —— 卡片内的轻量 WebGL2 着色器预览。
 * 一个全屏 triangle + 自定义 fragment shader，原生 WebGL2 不引依赖。
 *
 * 设计纪律（与首页 framegraph 视觉系统一致）：
 * - 不闪烁不乱飞：shader 自带 iTime 但动效必须缓慢、克制。
 * - reduced-motion 下停止渲染（只显示首帧静态）。
 * - 容器外层 framegraph pass 风：顶部 accent 线 + § shader 标签（由 ProjectCard 包裹）。
 *
 * fragment shader 约定 uniform：iTime, iResolution。
 */
export interface MiniShaderProps {
  /** fragment shader 源码（GLSL ES 3.0）。约定可用 iTime、iResolution、uv。 */
  fragment: string;
  /** 可选的 § 标签名（显示在 canvas 左上角） */
  label?: string;
  className?: string;
}

const VERT = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG_PRELUDE = `#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;
#define uv (gl_FragCoord.xy / iResolution.xy)
`;

export default function MiniShader({ fragment, label, className }: MiniShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // reduced-motion：不渲染动画，只留静态 canvas
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const glCtx = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!glCtx) return;
    // 非空别名：TS 在嵌套闭包里不保留 null 窄化，给一个确定非 null 的引用
    const gl: WebGL2RenderingContext = glCtx;

    let raf = 0;
    let disposed = false;

    function compile(type: number, src: string): WebGLShader | null {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("shader compile error:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_PRELUDE + fragment);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("program link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // 全屏 triangle
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "iTime");
    const uRes = gl.getUniformLocation(prog, "iResolution");

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const t0 = performance.now();
    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas!.width, canvas!.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [fragment]);

  return (
    <div className={"relative overflow-hidden " + (className ?? "")}>
      <canvas ref={canvasRef} className="block h-full w-full" />
      {label ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-1.5 font-mono text-[0.6rem] tracking-[0.02em] text-[var(--foreground)] opacity-70 mix-blend-difference"
        >
          <span className="text-[var(--accent)]">§</span> {label}
        </span>
      ) : null}
    </div>
  );
}
