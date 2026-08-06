"use client";

import { useEffect, useRef } from "react";
import { ABOUT_BACKDROP_FRAG } from "@/components/about/about-backdrop-shader";
import { BASE_PATH } from "@/lib/site";

/**
 * AboutBackdrop —— 关于页 Hero 区交互背景。
 *
 * 参考 leyangzhang.cargo.site 的 `legacy/ripple` backdrop：
 * 鼠标划过背景留下扩散涟漪，底图沿固定方向缓慢漂移。
 *
 * 定位方式对齐首页 HeroShader（components/HeroShader.tsx）：
 * absolute inset-0，挂在父级 relative 容器（AboutHero 的 section）内，
 * 只覆盖 banner 区域，不是 fixed 全屏层——之前用 fixed 铺满整个视口、
 * 随内容滚动露出全站背景的做法已废弃。
 *
 * 实现要点：
 * - 指针移动 → 按距离阈值投放 ripple 到环形槽位（8 个），不进 React state
 * - 指针离开 → uPointerFade 平滑归零，涟漪自然衰减而非突然消失
 * - 主题切换 → MutationObserver 监听 data-theme，uTheme 做 0.35s 缓动过渡
 * - reduced-motion → 只画一帧静态，不绑 pointermove，不开 raf
 * - 半分辨率渲染（移动端 0.6），底图是静态贴图，降分辨率对清晰度影响也很小
 * - IntersectionObserver：区域收窄后离开视口的概率变高，改用它在滚出
 *   视口时暂停 raf 省电（fixed 全屏层时用不上，现在用得上）
 * - 底图（public/assets/about-bg.jpg）异步加载：图未就位前先用纯色占位帧，
 *   避免白屏或报错；加载完成后一次性上传纹理，之后走正常渲染循环
 */

const RIPPLE_COUNT = 8;
const BG_IMAGE_SRC = `${BASE_PATH}/assets/about-bg.jpg`;

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

function readTheme(): number {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" ? 0 : 1;
}

export default function AboutBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const glCtx = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!glCtx) {
      // 无 WebGL2：标记降级，交给 CSS 静态渐变兜底
      canvas.parentElement?.setAttribute("data-fallback", "true");
      return;
    }
    const gl: WebGL2RenderingContext = glCtx;

    let raf = 0;
    let disposed = false;
    let program: WebGLProgram | null = null;
    let vertShader: WebGLShader | null = null;
    let fragShader: WebGLShader | null = null;
    let buffer: WebGLBuffer | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uRipples: WebGLUniformLocation | null = null;
    let uTheme: WebGLUniformLocation | null = null;
    let uPointerFade: WebGLUniformLocation | null = null;
    let uTex: WebGLUniformLocation | null = null;
    let uTexSize: WebGLUniformLocation | null = null;
    let texture: WebGLTexture | null = null;
    let texSize: [number, number] = [1, 1];
    let texReady = false;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    let io: IntersectionObserver | null = null;
    let inView = true;
    let t0 = performance.now();

    /** 环形槽位：每 3 个 float 一组 (x, y, birth) */
    const ripples = new Float32Array(RIPPLE_COUNT * 3);
    let rippleCursor = 0;
    /** 上次投放涟漪的位置（归一化 aspect 校正坐标） */
    let lastDrop: [number, number] | null = null;
    /** 指针在页面内的淡入淡出，0→1 */
    let pointerFade = 0;
    let pointerTarget = 0;
    /** 主题值平滑过渡 */
    let themeCurrent = readTheme();
    let themeTarget = themeCurrent;

    function compile(type: number, src: string): WebGLShader | null {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("about backdrop compile error:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    function buildProgram(): boolean {
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(
        gl.FRAGMENT_SHADER,
        FRAG_PRELUDE + ABOUT_BACKDROP_FRAG,
      );
      if (!vs || !fs) return false;
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("about backdrop link error:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        return false;
      }
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
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      uTime = gl.getUniformLocation(prog, "iTime");
      uRes = gl.getUniformLocation(prog, "iResolution");
      uRipples = gl.getUniformLocation(prog, "uRipples[0]");
      uTheme = gl.getUniformLocation(prog, "uTheme");
      uPointerFade = gl.getUniformLocation(prog, "uPointerFade");
      uTex = gl.getUniformLocation(prog, "uTex");
      uTexSize = gl.getUniformLocation(prog, "uTexSize");
      // 纹理单元固定用 0 号，program 重建后要重新告知 sampler
      gl.uniform1i(uTex, 0);
      return true;
    }

    if (!buildProgram()) {
      canvas.parentElement?.setAttribute("data-fallback", "true");
      return;
    }

    /**
     * 异步加载底图并上传为 WebGL 纹理。
     * 加载完成前 texReady 为 false，drawFrame 会跳过采样（shader 里 uTexSize
     * 默认是 (1,1)，配合黑色纹理不会报错，只是画面全黑——用占位背景色兜底）。
     */
    function loadTexture() {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (disposed) return;
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // 关键：<img> 解码后按"从上到下"存储，而 GL 纹理坐标原点在左下角，
        // 不翻转的话贴图会整体上下颠倒。这一行必须在 texImage2D 之前设置。
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        // CLAMP_TO_EDGE：漂移振幅已在 shader 里钳在安全边距内，不会露出重复边界
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        texSize = [img.naturalWidth, img.naturalHeight];
        texReady = true;
        // reduced-motion 只画一帧：如果那一帧发生在纹理加载完成前，
        // 需要在加载完成后补画一次，否则画面会永远停在占位色上
        if (reduced) drawFrame(0, 0);
      };
      img.onerror = () => {
        console.warn(
          "about backdrop: 底图加载失败，使用占位背景色",
          BG_IMAGE_SRC,
        );
      };
      img.src = BG_IMAGE_SRC;
    }
    loadTexture();

    function resize() {
      if (!canvas) return;
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      const scale = mobile ? 0.6 : 0.5;
      const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    }
    resize();
    ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /** 把 client 坐标转成 shader 内的 aspect 校正坐标 */
    function toShaderSpace(cx: number, cy: number): [number, number] {
      const rect = canvas!.getBoundingClientRect();
      const aspect = rect.width / Math.max(rect.height, 1);
      const nx = (cx - rect.left) / Math.max(rect.width, 1);
      // shader 内 uv.y 从底部起算，client y 从顶部 —— 翻转
      const ny = 1 - (cy - rect.top) / Math.max(rect.height, 1);
      return [(nx - 0.5) * aspect, ny - 0.5];
    }

    function dropRipple(cx: number, cy: number) {
      const [x, y] = toShaderSpace(cx, cy);
      // 距离阈值：移动够远才投放新涟漪，避免每帧刷爆槽位
      if (lastDrop) {
        const dx = x - lastDrop[0];
        const dy = y - lastDrop[1];
        if (dx * dx + dy * dy < 0.0024) return;
      }
      lastDrop = [x, y];
      const t = (performance.now() - t0) / 1000;
      const i = rippleCursor * 3;
      ripples[i] = x;
      ripples[i + 1] = y;
      ripples[i + 2] = t;
      rippleCursor = (rippleCursor + 1) % RIPPLE_COUNT;
    }

    function onPointerMove(e: PointerEvent) {
      pointerTarget = 1;
      dropRipple(e.clientX, e.clientY);
    }
    function onPointerLeave() {
      pointerTarget = 0;
      lastDrop = null;
    }
    /** 点击：在同一点连投一组，形成更强的一击 */
    function onPointerDown(e: PointerEvent) {
      pointerTarget = 1;
      lastDrop = null;
      dropRipple(e.clientX, e.clientY);
    }

    function drawFrame(t: number, dt: number) {
      // 指针淡入淡出（指数趋近）
      const k = 1 - Math.exp(-dt * 3.2);
      pointerFade += (pointerTarget - pointerFade) * k;
      // 主题过渡
      themeCurrent += (themeTarget - themeCurrent) * (1 - Math.exp(-dt * 5.0));

      if (!texReady) {
        // 底图还没加载完：用主题背景色占位清屏，避免闪黑/闪花
        const dark = themeCurrent > 0.5;
        gl.clearColor(
          dark ? 0.027 : 0.965,
          dark ? 0.028 : 0.961,
          dark ? 0.031 : 0.949,
          1,
        );
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas!.width, canvas!.height);
      gl.uniform3fv(uRipples, ripples);
      gl.uniform1f(uTheme, themeCurrent);
      gl.uniform1f(uPointerFade, pointerFade);
      gl.uniform2f(uTexSize, texSize[0], texSize[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    let lastT = 0;
    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000;
      const dt = Math.min(t - lastT, 0.05);
      lastT = t;
      drawFrame(t, dt);
    }

    // 主题切换监听（两种模式都要，静态帧也得跟着换色）
    mo = new MutationObserver(() => {
      themeTarget = readTheme();
      if (reduced) {
        themeCurrent = themeTarget;
        drawFrame(0, 0);
      }
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    if (reduced) {
      // reduced-motion：静态一帧，无涟漪、无漂移
      drawFrame(0, 0);
    } else {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      document.addEventListener("pointerleave", onPointerLeave);
      // 区域已收窄到 Hero banner，滚出视口的概率比之前 fixed 全屏层高很多，
      // 用 IntersectionObserver 在不可见时暂停 raf，省电又不影响首屏体验。
      // 初始 inView=true 且下面已调用 frame() 启动循环，
      // observer 首次回调（可见）不会重复启动，只在真正滚出/滚入时生效。
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            inView = e.isIntersecting;
            if (disposed || !program) return;
            if (inView) {
              if (!raf) {
                t0 = performance.now() - lastT * 1000;
                frame();
              }
            } else if (raf) {
              cancelAnimationFrame(raf);
              raf = 0;
            }
          }
        },
        { threshold: 0 },
      );
      io.observe(canvas);
      frame();
    }

    // 标签页隐藏时停 raf 省电
    function onVisibility() {
      if (reduced) return;
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else if (!raf && !disposed && inView) {
        lastT = (performance.now() - t0) / 1000;
        frame();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    function onContextLost(e: Event) {
      e.preventDefault();
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    function onContextRestored() {
      if (!buildProgram()) return;
      resize();
      // WebGL context 丢失会连带丢失纹理等 GPU 资源，必须重新加载
      texReady = false;
      texture = null;
      loadTexture();
      if (reduced) {
        drawFrame(0, 0);
      } else {
        t0 = performance.now();
        lastT = 0;
        frame();
      }
    }
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      mo?.disconnect();
      io?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (program) gl.deleteProgram(program);
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
      if (buffer) gl.deleteBuffer(buffer);
      if (texture) gl.deleteTexture(texture);
    };
  }, []);

  return (
    <div className="about-hero-backdrop absolute inset-0 z-0" aria-hidden>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
