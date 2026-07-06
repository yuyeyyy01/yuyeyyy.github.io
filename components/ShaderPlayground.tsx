"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ShaderPlayground —— 文章内嵌的可交互 shader 沙盒。
 * 读者可编辑 fragment 源码 + 调 uniform 滑块，实时看编译结果。
 *
 * 设计纪律（与 framegraph 视觉系统一致）：
 * - 复用 MiniShader 的纯 WebGL2 全屏 triangle 基建，不引 codemirror/monaco。
 * - uniform 改值不重编译（ref + 每帧 set）；fragment 改才重编译（debounce 400ms）。
 * - textarea uncontrolled + ref，避免每次按键触发 React 重渲染。
 * - 编译错误行号减 PRELUDE_LINES 对齐用户代码。
 * - reduced-motion 下只画首帧静态，不跑 raf。
 */

export interface UniformControl {
  /** GLSL uniform 名，必须与 fragment 里声明的一致 */
  name: string;
  /** 显示名，缺省同 name */
  label?: string;
  /** float=滑块, color=vec3 颜色选择 */
  kind: "float" | "color";
  min?: number;
  max?: number;
  step?: number;
  default: number | [number, number, number];
}

export interface ShaderPlaygroundProps {
  /** fragment 源码（不含 prelude）。约定可用 iTime、iResolution、uv、fragColor */
  fragment: string;
  /** 滑块声明 */
  uniforms?: UniformControl[];
  /** § 标签，缺省 "playground" */
  label?: string;
  /** canvas 高度 px，默认 320 */
  height?: number;
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

// prelude 行数（用于错误行号偏移）：6 行 + 末尾 \n，用户代码从第 7 行开始
const PRELUDE_LINES = 6;

type UniformValue = number | [number, number, number];

function initUniforms(controls: UniformControl[] | undefined): Record<string, UniformValue> {
  const out: Record<string, UniformValue> = {};
  for (const c of controls ?? []) out[c.name] = c.default;
  return out;
}

/** 把 getShaderInfoLog 的行号减去 prelude 行数，对齐用户代码 */
function remapError(log: string): string {
  return log.replace(/ERROR:\s*0:(\d+)/g, (_m, n) => {
    const line = Math.max(1, Number(n) - PRELUDE_LINES);
    return `ERROR: 0:${line}`;
  });
}

/** hex (#rrggbb) → [r,g,b] 0..1 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

/** [r,g,b] 0..1 → #rrggbb */
function rgbToHex(rgb: [number, number, number]): string {
  const to255 = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  const h = (n: number) => to255(n).toString(16).padStart(2, "0");
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
}

export default function ShaderPlayground({
  fragment,
  uniforms = [],
  label = "playground",
  height = 320,
  className,
}: ShaderPlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lineNoRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Record<string, UniformValue>>(initUniforms(uniforms));

  // UI state（仅在需要时触发重渲染）
  const [uniformValues, setUniformValues] = useState<Record<string, UniformValue>>(() =>
    initUniforms(uniforms),
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "compiling" | "ok" | "fail">("idle");
  const [fragSrc, setFragSrc] = useState(fragment); // debounce 后触发编译

  // ---- 主编译 + 渲染 effect（依赖 fragSrc）----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus("compiling");
    const glCtx = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!glCtx) {
      setError("WebGL2 不可用");
      setStatus("fail");
      return;
    }
    const gl: WebGL2RenderingContext = glCtx;

    function compile(type: number, src: string): WebGLShader | null {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = remapError(gl.getShaderInfoLog(sh) ?? "");
        setError(log);
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_PRELUDE + fragSrc);
    if (!vs || !fs) {
      setStatus("fail");
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setError(remapError(gl.getProgramInfoLog(prog) ?? ""));
      setStatus("fail");
      return;
    }
    setError(null);
    setStatus("ok");
    gl.useProgram(prog);

    // 全屏 triangle
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "iTime");
    const uRes = gl.getUniformLocation(prog, "iResolution");
    // 缓存用户 uniform location
    const userLocs: Record<string, WebGLUniformLocation | null> = {};
    for (const c of uniforms) userLocs[c.name] = gl.getUniformLocation(prog, c.name);

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

    function setUniforms() {
      for (const c of uniforms) {
        const loc = userLocs[c.name];
        if (!loc) continue;
        const v = uniformsRef.current[c.name];
        if (c.kind === "float") {
          gl.uniform1f(loc, v as number);
        } else {
          const [r, g, b] = v as [number, number, number];
          gl.uniform3f(loc, r, g, b);
        }
      }
    }

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = mql.matches;
    let raf = 0;
    let disposed = false;
    const t0 = performance.now();

    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas!.width, canvas!.height);
      setUniforms();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // 先画一帧（无论是否 reduced）
    gl.uniform1f(uTime, 0);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    setUniforms();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced) frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragSrc]);

  // ---- debounce fragment 编辑 ----
  const debounceRef = useRef<number | undefined>(undefined);
  const onCodeChange = useCallback((v: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setFragSrc(v), 400);
  }, []);

  // ---- 滑块 onChange：同步 state + ref，不触发编译 ----
  const onUniformChange = useCallback((name: string, v: UniformValue) => {
    setUniformValues((prev) => ({ ...prev, [name]: v }));
    uniformsRef.current[name] = v;
  }, []);

  // ---- 重置 ----
  const onReset = useCallback(() => {
    if (taRef.current) taRef.current.value = fragment;
    setFragSrc(fragment);
    const init = initUniforms(uniforms);
    setUniformValues(init);
    uniformsRef.current = { ...init };
  }, [fragment, uniforms]);

  // ---- 行号 + Tab 缩进 ----
  const lineCount = fragSrc.split("\n").length;
  const onEditorScroll = useCallback(() => {
    if (lineNoRef.current && taRef.current) {
      lineNoRef.current.scrollTop = taRef.current.scrollTop;
    }
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: en, value } = ta;
    if (s === en) {
      // 无选区：插 2 空格
      const nv = value.slice(0, s) + "  " + value.slice(en);
      ta.value = nv;
      ta.selectionStart = ta.selectionEnd = s + 2;
    } else {
      // 有选区：每行行首加/去 2 空格
      const lines = value.split("\n");
      const startLine = value.slice(0, s).split("\n").length - 1;
      const endLine = value.slice(0, en).split("\n").length - 1;
      const shift = e.shiftKey;
      for (let i = startLine; i <= endLine; i++) {
        if (shift) {
          lines[i] = lines[i].replace(/^ {1,2}/, "");
        } else {
          lines[i] = "  " + lines[i];
        }
      }
      ta.value = lines.join("\n");
    }
    onCodeChange(ta.value);
  }, [onCodeChange]);

  return (
    <div className={"card overflow-hidden " + (className ?? "")}>
      {/* framegraph pass 标头 */}
      <div className="section-rule flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
          <span className="text-[var(--accent)]">§</span> {label}
        </span>
        <StatusDot status={status} />
        <button
          type="button"
          onClick={onReset}
          className="btn-secondary ml-auto !px-2 !py-0.5 !text-[0.7rem]"
        >
          重置
        </button>
      </div>

      <div className="grid lg:grid-cols-2">
        {/* 编辑器（桌面左 / 移动端下） */}
        <div className="order-2 border-t border-[var(--border)] lg:order-1 lg:border-r lg:border-t-0">
          <div className="relative flex min-h-[240px] max-h-[420px] overflow-auto bg-[var(--background-soft)]">
            <div
              ref={lineNoRef}
              aria-hidden
              className="select-none border-r border-[var(--border)] px-2 py-3 text-right font-mono text-[0.75rem] leading-[1.5] text-[var(--foreground-muted)] opacity-60"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={taRef}
              defaultValue={fragment}
              onChange={(e) => onCodeChange(e.target.value)}
              onScroll={onEditorScroll}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[0.75rem] leading-[1.5] text-[var(--foreground)] outline-none"
              style={{ tabSize: 2, whiteSpace: "pre" }}
            />
          </div>
        </div>

        {/* 预览（桌面右 / 移动端上） */}
        <div className="order-1 lg:order-2">
          <div className="relative" style={{ height }}>
            <canvas ref={canvasRef} className="block h-full w-full" />
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/70 p-4">
                <pre className="max-h-full max-w-full overflow-auto whitespace-pre-wrap border border-[var(--accent-warm)] bg-[var(--surface-2)] px-3 py-2 font-mono text-[0.7rem] leading-relaxed text-[var(--accent-warm)]">
                  {error}
                </pre>
              </div>
            )}
          </div>
          {/* uniform 滑块面板 */}
          {uniforms.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              {uniforms.map((c) => (
                <UniformRow
                  key={c.name}
                  control={c}
                  value={uniformValues[c.name]}
                  onChange={(v) => onUniformChange(c.name, v)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "idle" | "compiling" | "ok" | "fail" }) {
  const color =
    status === "compiling"
      ? "bg-[var(--accent-warm)] animate-pulse"
      : status === "ok"
        ? "bg-[var(--accent)]"
        : status === "fail"
          ? "bg-red-400"
          : "bg-[var(--foreground-muted)]";
  return (
    <span
      aria-label={`状态：${status}`}
      className={"inline-block h-1.5 w-1.5 rounded-full " + color}
    />
  );
}

function UniformRow({
  control,
  value,
  onChange,
}: {
  control: UniformControl;
  value: UniformValue;
  onChange: (v: UniformValue) => void;
}) {
  const label = control.label ?? control.name;
  if (control.kind === "color") {
    const rgb = value as [number, number, number];
    const hex = rgbToHex(rgb);
    return (
      <div className="flex items-center gap-3 py-1.5">
        <span className="w-24 font-mono text-[0.7rem] text-[var(--foreground-muted)]">{label}</span>
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(hexToRgb(e.target.value))}
          className="h-6 w-10 cursor-pointer rounded border border-[var(--border)] bg-transparent"
        />
        <span className="font-mono text-[0.7rem] text-[var(--foreground-muted)]">{hex}</span>
      </div>
    );
  }
  const num = value as number;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-24 font-mono text-[0.7rem] text-[var(--foreground-muted)]">{label}</span>
      <input
        type="range"
        min={control.min ?? 0}
        max={control.max ?? 1}
        step={control.step ?? 0.01}
        value={num}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--border)] accent-[var(--accent)]"
      />
      <span className="w-12 text-right font-mono text-[0.7rem] text-[var(--foreground-muted)]">
        {num.toFixed(2)}
      </span>
    </div>
  );
}
