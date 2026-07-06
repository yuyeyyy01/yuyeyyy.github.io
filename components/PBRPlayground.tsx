"use client";

import { useEffect, useRef, useState } from "react";
import { createSphere } from "./pbr/sphere-mesh";
import { perspective, lookAt, rotateX, rotateY, multiply } from "./pbr/matrices";
import { VERT, FRAG } from "./pbr/shaders";
import { DEFAULT_PARAMS, PRESETS, hexToRgb, type PBRParams } from "./pbr/presets";

/**
 * PBRPlayground —— 手写 Cook-Torrance 实时调参 demo。
 * 左材质面板（6 滑块 + 4 预设）+ 右球体预览（pointer 拖拽旋转）。
 *
 * 与 custom-pbr-vs-unity-lit.mdx 呼应：文章每段公式 = demo 一个可拖滑块。
 * 纯 WebGL2，不引 three，零新增依赖。
 *
 * 性能关键：shader 一次性编译，滑块改值只调 gl.uniform1f/3f，不重编译。
 */

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
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

export default function PBRPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const uniRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const yawPitch = useRef<[number, number]>([0.3, 0.2]);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [params, setParams] = useState<PBRParams>(DEFAULT_PARAMS);
  const [autoRotate, setAutoRotate] = useState(false);

  // ---- 一次性初始化：编译 shader + 上传 mesh + raf ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const glCtx = canvas.getContext("webgl2", { antialias: true, alpha: true, powerPreference: "low-power" });
    if (!glCtx) return;
    const gl: WebGL2RenderingContext = glCtx;
    glRef.current = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);

    // mesh
    const mesh = createSphere(48, 32);
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    const nrmBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    const aNrm = gl.getAttribLocation(prog, "a_normal");
    gl.enableVertexAttribArray(aNrm);
    gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    // uniform locations
    const u = (name: string) => gl.getUniformLocation(prog, name);
    uniRef.current = {
      u_albedo: u("u_albedo"),
      u_roughness: u("u_roughness"),
      u_metallic: u("u_metallic"),
      u_F0: u("u_F0"),
      u_normalStrength: u("u_normalStrength"),
      u_ambient: u("u_ambient"),
      u_lightDir: u("u_lightDir"),
      u_lightColor: u("u_lightColor"),
      u_camPos: u("u_camPos"),
      u_proj: u("u_proj"),
      u_view: u("u_view"),
      u_model: u("u_model"),
    };

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

    const camPos: [number, number, number] = [0, 0, 3];
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let disposed = false;

    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!mql.matches && autoRotateRef.current) {
        yawPitch.current[0] += 0.005;
      }
      const aspect = (canvas!.width || 1) / (canvas!.height || 1);
      const proj = perspective(Math.PI / 4, aspect, 0.1, 100);
      const view = lookAt(camPos, [0, 0, 0], [0, 1, 0]);
      const [yaw, pitch] = yawPitch.current;
      const model = multiply(rotateX(pitch), rotateY(yaw));

      gl.uniformMatrix4fv(uniRef.current.u_proj!, false, proj);
      gl.uniformMatrix4fv(uniRef.current.u_view!, false, view);
      gl.uniformMatrix4fv(uniRef.current.u_model!, false, model);
      gl.uniform3f(uniRef.current.u_camPos!, camPos[0], camPos[1], camPos[2]);
      gl.uniform3f(uniRef.current.u_lightDir!, 0.6, 0.7, 0.5);
      gl.uniform3f(uniRef.current.u_lightColor!, 1, 1, 1);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    }
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(posBuf);
      gl.deleteBuffer(nrmBuf);
      gl.deleteBuffer(idxBuf);
    };
  }, []);

  // 用 ref 让 raf 读到最新 autoRotate，不重跑初始化 effect
  const autoRotateRef = useRef(autoRotate);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  // ---- 滑块改值：只更新 uniform，不重编译 ----
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;
    const u = uniRef.current;
    const [r, g, b] = hexToRgb(params.albedo);
    gl.uniform3f(u.u_albedo!, r, g, b);
    gl.uniform1f(u.u_roughness!, params.roughness);
    gl.uniform1f(u.u_metallic!, params.metallic);
    gl.uniform1f(u.u_F0!, params.F0);
    gl.uniform1f(u.u_normalStrength!, params.normalStrength);
    gl.uniform1f(u.u_ambient!, params.ambient);
  }, [params]);

  // ---- pointer 拖拽旋转 ----
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    yawPitch.current[0] -= dx * 0.01;
    yawPitch.current[1] -= dy * 0.01;
    yawPitch.current[1] = Math.max(-1.4, Math.min(1.4, yawPitch.current[1]));
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <div className="card grid gap-4 overflow-hidden p-0 sm:grid-cols-[18rem_1fr]">
      {/* 左：材质面板 */}
      <div className="border-b border-[var(--border)] p-4 sm:border-b-0 sm:border-r">
        <div className="section-rule mb-3">
          <span className="text-[var(--accent)]">§</span> material
        </div>

        {/* 预设材质 */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {Object.entries(PRESETS).map(([name, p]) => (
            <button
              key={name}
              type="button"
              onClick={() => setParams(p)}
              className="group flex flex-col items-center gap-1"
              title={name}
            >
              <span
                className="h-7 w-7 rounded-full border border-[var(--border)] transition-transform group-hover:scale-110 group-hover:border-[var(--accent)]"
                style={{ background: p.albedo }}
              />
              <span className="font-mono text-[0.6rem] text-[var(--foreground-muted)]">{name}</span>
            </button>
          ))}
        </div>

        {/* 滑块 */}
        <Slider label="roughness" value={params.roughness} min={0.02} max={1} step={0.01}
          onChange={(v) => setParams((p) => ({ ...p, roughness: v }))} />
        <Slider label="metallic" value={params.metallic} min={0} max={1} step={0.01}
          onChange={(v) => setParams((p) => ({ ...p, metallic: v }))} />
        <Slider label="F0" value={params.F0} min={0} max={0.08} step={0.001}
          onChange={(v) => setParams((p) => ({ ...p, F0: v }))} />
        <Slider label="normal" value={params.normalStrength} min={0} max={1} step={0.05}
          onChange={(v) => setParams((p) => ({ ...p, normalStrength: v }))} />
        <Slider label="ambient" value={params.ambient} min={0} max={0.5} step={0.01}
          onChange={(v) => setParams((p) => ({ ...p, ambient: v }))} />

        {/* albedo 颜色 */}
        <div className="flex items-center gap-3 py-1.5">
          <span className="w-16 font-mono text-[0.7rem] text-[var(--foreground-muted)]">albedo</span>
          <input
            type="color"
            value={params.albedo}
            onChange={(e) => setParams((p) => ({ ...p, albedo: e.target.value }))}
            className="h-6 w-10 cursor-pointer rounded border border-[var(--border)] bg-transparent"
          />
          <span className="font-mono text-[0.7rem] text-[var(--foreground-muted)]">{params.albedo}</span>
        </div>

        {/* 自动旋转 */}
        <label className="mt-2 flex cursor-pointer items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          <span className="font-mono text-[0.7rem] text-[var(--foreground-muted)]">auto-rotate</span>
        </label>
      </div>

      {/* 右：球体预览 */}
      <div className="relative h-80 w-full cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="block h-full w-full"
        />
        <span className="pointer-events-none absolute left-3 top-2 font-mono text-[0.65rem] text-[var(--foreground-muted)]">
          <span className="text-[var(--accent)]">§</span> preview · drag to rotate
        </span>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-16 font-mono text-[0.7rem] text-[var(--foreground-muted)]">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--border)] accent-[var(--accent)]"
      />
      <span className="w-12 text-right font-mono text-[0.7rem] text-[var(--foreground-muted)]">
        {value.toFixed(2)}
      </span>
    </div>
  );
}
