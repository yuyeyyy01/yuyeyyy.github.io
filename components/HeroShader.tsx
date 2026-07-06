"use client";

import { useEffect, useRef } from "react";
import { HERO_FRAG } from "@/components/hero-shader";

/**
 * HeroShader —— 首页全屏体积云背景。
 * 复制 MiniShader 的 WebGL2 基建，扩展：
 * - iMouse uniform（从 mouseRef 读值，不进 React state）
 * - IntersectionObserver：离开视口 cancel，回到视口恢复
 * - reduced-motion：编译并绘制一帧静态（t=0），不开 raf，不绑 pointermove
 * - webglcontextlost/restored 处理
 * - DPR 桌面≤2 移动≤1.5
 *
 * canvas absolute inset-0 z-0；容器 bg-[var(--background)] 防白闪。
 */
export interface HeroShaderProps {
  mouseRef: React.MutableRefObject<[number, number]>;
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
uniform vec2 iMouse;
out vec4 fragColor;
#define uv (gl_FragCoord.xy / iResolution.xy)
`;

export default function HeroShader({ mouseRef }: HeroShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const glCtx = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!glCtx) return;
    const gl: WebGL2RenderingContext = glCtx;

    let raf = 0;
    let disposed = false;
    let program: WebGLProgram | null = null;
    let vertShader: WebGLShader | null = null;
    let fragShader: WebGLShader | null = null;
    let buffer: WebGLBuffer | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uMouse: WebGLUniformLocation | null = null;
    let aPosLoc = -1;
    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let inView = true;
    let t0 = performance.now();

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

    function buildProgram(): boolean {
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG_PRELUDE + HERO_FRAG);
      if (!vs || !fs) return false;
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("program link error:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return false;
      }
      // 清理旧资源（context restored 时复用）
      if (program) gl.deleteProgram(program);
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
      if (buffer) gl.deleteBuffer(buffer);

      program = prog;
      vertShader = vs;
      fragShader = fs;
      gl.useProgram(prog);

      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      aPosLoc = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPosLoc);
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

      uTime = gl.getUniformLocation(prog, "iTime");
      uRes = gl.getUniformLocation(prog, "iResolution");
      uMouse = gl.getUniformLocation(prog, "iMouse");
      return true;
    }

    if (!buildProgram()) return;

    function resize() {
      if (!canvas) return;
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    }
    resize();
    ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function drawFrame(t: number) {
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas!.width, canvas!.height);
      const m = mouseRef.current;
      gl.uniform2f(uMouse, m[0], m[1]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000;
      drawFrame(t);
    }

    if (reduced) {
      // reduced-motion：编译并绘制一帧静态（t=0），不开 raf
      drawFrame(0);
    } else {
      // IntersectionObserver：离开视口暂停 raf，回到视口恢复
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            inView = e.isIntersecting;
            if (disposed || !program) return;
            if (inView) {
              if (!raf) {
                // 重置起点避免恢复时时间跳变
                t0 = performance.now();
                frame();
              }
            } else {
              if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
              }
            }
          }
        },
        { threshold: 0 },
      );
      io.observe(canvas);
      frame();
    }

    function onContextLost(e: Event) {
      e.preventDefault();
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    function onContextRestored() {
      // 重建程序并继续渲染
      if (!buildProgram()) return;
      resize();
      if (reduced) {
        drawFrame(0);
      } else {
        t0 = performance.now();
        if (inView) frame();
      }
    }
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (program) gl.deleteProgram(program);
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
      if (buffer) gl.deleteBuffer(buffer);
    };
    // mouseRef 是 ref，引用稳定，不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-[var(--background)]">
      <canvas
        ref={canvasRef}
        aria-hidden
        className="block h-full w-full"
      />
    </div>
  );
}
