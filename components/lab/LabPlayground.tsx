"use client";

import { useEffect, useRef, useState } from "react";
import { createSphere } from "../pbr/sphere-mesh";
import { perspective, lookAt, rotateX, rotateY, multiply } from "../pbr/matrices";
import type { LabUniform } from "./types";

/**
 * LabPlayground —— /lab 渲染实验室的通用 WebGL2 容器。
 * 从 PBRPlayground 提取：shader 一次性编译，uniform location 缓存，
 * params 变化只 gl.uniform 不重编译，reduced-motion 只画首帧，
 * sphere 模式 pointer 拖拽旋转。
 *
 * mesh==="sphere" 复用 pbr/sphere-mesh + matrices，vert 输出 v_worldPos/v_normal。
 * mesh==="fullscreen" 用全屏 triangle，fragment 自带 iTime/iResolution。
 */

export interface LabPlaygroundProps {
  fragment: string;
  mesh: "fullscreen" | "sphere";
  uniforms: LabUniform[];
  defaults: Record<string, number | [number, number, number]>;
  presets?: Record<string, Record<string, number | [number, number, number]>>;
  allowDrag?: boolean;
  autoRotate?: boolean;
  height?: number;
}

const SPHERE_VERT = `#version 300 es
in vec3 a_pos;
in vec3 a_normal;
uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
out vec3 v_worldPos;
out vec3 v_normal;
void main() {
  vec4 wp = u_model * vec4(a_pos, 1.0);
  v_worldPos = wp.xyz;
  v_normal = normalize(mat3(u_model) * a_normal);
  gl_Position = u_proj * u_view * wp;
}
`;

const FULLSCREEN_VERT = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

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

type UniformValue = number | [number, number, number];

export default function LabPlayground({
  fragment,
  mesh,
  uniforms,
  defaults,
  presets,
  allowDrag,
  autoRotate = false,
  height = 70,
}: LabPlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const uniRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const yawPitch = useRef<[number, number]>([0.3, 0.2]);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [values, setValues] = useState<Record<string, UniformValue>>(() => ({ ...defaults }));
  const valuesRef = useRef<Record<string, UniformValue>>(values);
  const autoRotateRef = useRef(autoRotate);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const dragEnabled = allowDrag ?? (mesh === "sphere");

  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { valuesRef.current = values; }, [values]);

  // ---- 一次性初始化：编译 shader + 上传 mesh + raf ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const glCtx = canvas.getContext("webgl2", { antialias: true, alpha: true, powerPreference: "low-power" });
    if (!glCtx) return;
    const gl: WebGL2RenderingContext = glCtx;
    glRef.current = gl;

    const isSphere = mesh === "sphere";
    const vs = compile(gl, gl.VERTEX_SHADER, isSphere ? SPHERE_VERT : FULLSCREEN_VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
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
    if (isSphere) gl.enable(gl.DEPTH_TEST);

    let posBuf: WebGLBuffer | null = null;
    let nrmBuf: WebGLBuffer | null = null;
    let idxBuf: WebGLBuffer | null = null;
    let sphereIdxCount = 0;

    if (isSphere) {
      const sm = createSphere(48, 32);
      posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sm.positions, gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

      nrmBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
      gl.bufferData(gl.ARRAY_BUFFER, sm.normals, gl.STATIC_DRAW);
      const aNrm = gl.getAttribLocation(prog, "a_normal");
      gl.enableVertexAttribArray(aNrm);
      gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 0, 0);

      idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sm.indices, gl.STATIC_DRAW);
      sphereIdxCount = sm.indices.length;
    } else {
      posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    }

    // uniform locations
    const u = (name: string) => gl.getUniformLocation(prog, name);
    const locs: Record<string, WebGLUniformLocation | null> = {
      iTime: u("iTime"),
      iResolution: u("iResolution"),
    };
    for (const c of uniforms) locs[c.name] = u(c.name);
    if (isSphere) {
      locs.u_proj = u("u_proj");
      locs.u_view = u("u_view");
      locs.u_model = u("u_model");
      locs.u_camPos = u("u_camPos");
    }
    uniRef.current = locs;

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
    const reduced = mql.matches;
    let raf = 0;
    let disposed = false;
    const t0 = performance.now();

    function setUniforms(t: number) {
      if (uniRef.current.iTime) gl.uniform1f(uniRef.current.iTime, t);
      if (uniRef.current.iResolution) gl.uniform2f(uniRef.current.iResolution, canvas!.width, canvas!.height);
      for (const c of uniforms) {
        const loc = uniRef.current[c.name];
        if (!loc) continue;
        const v = valuesRef.current[c.name];
        if (c.kind === "float") gl.uniform1f(loc, v as number);
        else gl.uniform3f(loc, (v as [number, number, number])[0], (v as [number, number, number])[1], (v as [number, number, number])[2]);
      }
    }

    function draw(t: number) {
      if (isSphere) {
        const aspect = (canvas!.width || 1) / (canvas!.height || 1);
        const proj = perspective(Math.PI / 4, aspect, 0.1, 100);
        const view = lookAt(camPos, [0, 0, 0], [0, 1, 0]);
        const [yaw, pitch] = yawPitch.current;
        const model = multiply(rotateX(pitch), rotateY(yaw));
        if (uniRef.current.u_proj) gl.uniformMatrix4fv(uniRef.current.u_proj!, false, proj);
        if (uniRef.current.u_view) gl.uniformMatrix4fv(uniRef.current.u_view!, false, view);
        if (uniRef.current.u_model) gl.uniformMatrix4fv(uniRef.current.u_model!, false, model);
        if (uniRef.current.u_camPos) gl.uniform3f(uniRef.current.u_camPos!, camPos[0], camPos[1], camPos[2]);
      }
      setUniforms(t);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | (isSphere ? gl.DEPTH_BUFFER_BIT : 0));
      if (isSphere) {
        gl.drawElements(gl.TRIANGLES, sphereIdxCount, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }

    function frame() {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (!mql.matches && autoRotateRef.current && isSphere) {
        yawPitch.current[0] += 0.005;
      }
      const t = (performance.now() - t0) / 1000;
      draw(t);
    }

    // 先画一帧
    draw(0);
    if (!reduced) frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (posBuf) gl.deleteBuffer(posBuf);
      if (nrmBuf) gl.deleteBuffer(nrmBuf);
      if (idxBuf) gl.deleteBuffer(idxBuf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragment, mesh]);

  // ---- 滑块改值：state + ref 同步，不重编译 ----
  const onChange = (name: string, v: UniformValue) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    valuesRef.current = { ...valuesRef.current, [name]: v };
    setActivePreset(null);
  };

  const applyPreset = (name: string) => {
    const p = presets?.[name];
    if (!p) return;
    const next = { ...values, ...p };
    setValues(next);
    valuesRef.current = next;
    setActivePreset(name);
  };

  // ---- pointer 拖拽旋转（sphere 模式）----
  const onPointerDown = (e: React.PointerEvent) => {
    if (!dragEnabled) return;
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
    <div
      className="relative w-full overflow-hidden"
      style={{ height: `min(70vh, ${height}rem)` }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={"block h-full w-full " + (dragEnabled ? "cursor-grab active:cursor-grabbing" : "")}
      />
      <span className="pointer-events-none absolute left-3 top-2 font-mono text-[0.65rem] text-[var(--foreground-muted)]">
        <span className="text-[var(--accent)]">§</span> preview{dragEnabled ? " · drag to rotate" : ""}
      </span>
      {/* 预设圆点按钮 */}
      {presets && (
        <div className="absolute right-3 top-2 flex gap-1.5">
          {Object.entries(presets).map(([name]) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              title={name}
              className={"h-3 w-3 rounded-full border transition-transform " + (activePreset === name ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)] bg-transparent hover:scale-125 hover:border-[var(--accent)]")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
