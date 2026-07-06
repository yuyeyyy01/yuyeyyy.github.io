"use client";

import type { LabUniform } from "./types";

/**
 * LabControls —— /lab 详情页左侧统一控件面板。
 * 从 PBRPlayground 的 Slider + ShaderPlayground 的 color input 合成。
 * mono 字体 text-[0.7rem]，滑块 accent-[var(--accent)]。
 */

type UniformValue = number | [number, number, number];

export interface LabControlsProps {
  uniforms: LabUniform[];
  values: Record<string, UniformValue>;
  onChange: (name: string, v: UniformValue) => void;
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

export default function LabControls({ uniforms, values, onChange }: LabControlsProps) {
  return (
    <div className="border-b border-[var(--border)] p-4 sm:border-b-0 sm:border-r">
      <div className="section-rule mb-3">
        <span className="text-[var(--accent)]">§</span> params
      </div>
      {uniforms.map((c) => (
        <ControlRow key={c.name} control={c} value={values[c.name]} onChange={(v) => onChange(c.name, v)} />
      ))}
    </div>
  );
}

function ControlRow({
  control,
  value,
  onChange,
}: {
  control: LabUniform;
  value: UniformValue;
  onChange: (v: UniformValue) => void;
}) {
  const label = control.label ?? control.name;
  if (control.kind === "color") {
    const rgb = value as [number, number, number];
    const hex = rgbToHex(rgb);
    return (
      <div className="flex items-center gap-3 py-1.5">
        <span className="w-20 font-mono text-[0.7rem] text-[var(--foreground-muted)]">{label}</span>
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
      <span className="w-20 font-mono text-[0.7rem] text-[var(--foreground-muted)]">{label}</span>
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
