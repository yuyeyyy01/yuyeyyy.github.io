"use client";

import { useState } from "react";
import type { LabDemo } from "./types";
import LabPlayground from "./LabPlayground";
import LabControls from "./LabControls";

type UniformValue = number | [number, number, number];

/**
 * LabDemoView —— /lab/[slug] 详情页的客户端部分。
 * 管理 uniform state，把左 LabControls / 右 LabPlayground 拼起来，
 * 下方 details 折叠 fragment 源码。
 */
export default function LabDemoView({ demo }: { demo: LabDemo }) {
  const [values, setValues] = useState<Record<string, UniformValue>>(() => ({ ...demo.defaults }));

  const onChange = (name: string, v: UniformValue) => {
    setValues((prev) => ({ ...prev, [name]: v }));
  };

  return (
    <>
      <div className="card mt-10 grid overflow-hidden p-0 sm:grid-cols-[20rem_1fr]">
        <LabControls uniforms={demo.uniforms} values={values} onChange={onChange} />
        <LabPlayground
          fragment={demo.fragment}
          mesh={demo.mesh}
          uniforms={demo.uniforms}
          defaults={demo.defaults}
          presets={demo.presets}
        />
      </div>

      {demo.notes && demo.notes.length > 0 && (
        <ul className="mt-6 space-y-1.5 text-sm leading-relaxed text-[var(--foreground-soft)]">
          {demo.notes.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      <details className="card mt-8 overflow-hidden">
        <summary className="cursor-pointer select-none px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)] transition-colors hover:text-[var(--accent)]">
          <span className="text-[var(--accent)]">§</span> fragment source
        </summary>
        <pre className="overflow-x-auto border-t border-[var(--border)] bg-[var(--background-soft)] px-4 py-4 font-mono text-[0.7rem] leading-relaxed text-[var(--foreground-soft)]">
{demo.fragment}
        </pre>
      </details>
    </>
  );
}
