"use client";

import { useState } from "react";
import { RADAR_AXES } from "@/lib/about-data";

/**
 * 渲染能力雷达 —— 手画 6 维 SVG。
 *
 * 几何：viewBox="-120 -120 240 240"，maxR=100。
 * 6 轴顶部起顺时针，angle = -90 + i*60 度。
 * 同心网格 5 圈六边形（每圈 r = k*maxR/5），轴线从中心到顶点。
 * 数据多边形 fill accent 0.18 opacity + stroke accent。
 * 顶点圆点 fill accent-warm。轴标签 text。
 * 点击轴标签 / 顶点：展开下方 detail（useState 始终渲染，仅切换可见性 / 高亮）。
 * 响应式 w-full max-w-[420px] h-auto，preserveAspectRatio xMidYMid meet。
 * detail 区始终在 DOM（SEO）。
 */
const MAX_R = 100;
const N = RADAR_AXES.length;

/** 把轴索引与半径比转成坐标 */
function axisPoint(i: number, rRatio: number) {
  const ang = (-90 + (i * 360) / N) * (Math.PI / 180);
  return {
    x: Math.cos(ang) * MAX_R * rRatio,
    y: Math.sin(ang) * MAX_R * rRatio,
  };
}

/** 生成同心网格六边形 path（k=1..5，r = k*maxR/5） */
function hexPath(rRatio: number) {
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const p = axisPoint(i, rRatio);
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

/** 数据多边形 path */
function dataPath() {
  const pts: string[] = [];
  RADAR_AXES.forEach((axis, i) => {
    const p = axisPoint(i, axis.value / 5);
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  });
  return `M${pts.join(" L")} Z`;
}

export default function RenderRadar() {
  const [active, setActive] = useState<number>(0);
  const current = RADAR_AXES[active] ?? RADAR_AXES[0];

  return (
    <div className="mt-10 flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
      {/* SVG 雷达图 */}
      <div className="w-full max-w-[420px]">
        <svg
          viewBox="-120 -120 240 240"
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
          role="img"
          aria-label="渲染能力六维雷达"
        >
          {/* 同心网格 5 圈六边形 */}
          {[1, 2, 3, 4, 5].map((k) => (
            <path
              key={k}
              d={hexPath(k / 5)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}

          {/* 轴线：中心到顶点 */}
          {RADAR_AXES.map((_, i) => {
            const p = axisPoint(i, 1);
            return (
              <line
                key={`axis-${i}`}
                x1={0}
                y1={0}
                x2={p.x}
                y2={p.y}
                stroke="var(--border)"
                strokeWidth={1}
              />
            );
          })}

          {/* 数据多边形 */}
          <path
            d={dataPath()}
            fill="var(--accent)"
            fillOpacity={0.18}
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />

          {/* 顶点圆点（可点击）+ 轴标签 */}
          {RADAR_AXES.map((axis, i) => {
            const p = axisPoint(i, axis.value / 5);
            const lp = axisPoint(i, 1.18); // 标签略外移
            const isActive = i === active;
            return (
              <g
                key={`pt-${i}`}
                onClick={() => setActive(i)}
                style={{ cursor: "pointer" }}
                tabIndex={0}
                role="button"
                aria-label={`${axis.name} 维度：${axis.value}/5`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(i);
                  }
                }}
              >
                {/* 透明热区圆点，便于点击 */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill="transparent"
                />
                {/* 实心顶点 */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 4.5 : 3}
                  fill="var(--accent-warm)"
                  stroke="var(--accent)"
                  strokeWidth={1}
                />
                {/* 轴标签 */}
                <text
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={11}
                  letterSpacing="0.04em"
                  fill={isActive ? "var(--accent)" : "var(--foreground-soft)"}
                >
                  {axis.key}
                </text>
              </g>
            );
          })}

          {/* 中心点 */}
          <circle cx={0} cy={0} r={1.5} fill="var(--foreground-muted)" />
        </svg>
      </div>

      {/* detail 区：始终在 DOM（SEO） */}
      <div className="w-full max-w-md md:flex-1">
        <div className="section-rule">
          <span>§ Axis · {current.key}</span>
        </div>
        <div className="mt-4 card p-5">
          <div className="flex items-baseline gap-3">
            <h3 className="font-[family-name:var(--font-serif)] text-lg font-semibold text-[var(--foreground)]">
              {current.name}
            </h3>
            <span className="font-mono text-sm tabular-nums text-[var(--foreground-muted)]">
              {current.value.toFixed(1)}/5.0
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-soft)]">
            {current.detail}
          </p>

          {/* 维度切换 chips */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {RADAR_AXES.map((axis, i) => (
              <button
                key={axis.key}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={`rounded-[4px] border px-2 py-0.5 font-mono text-[0.68rem] transition-colors duration-200 ${
                  i === active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground-soft)] hover:border-[var(--accent)]"
                }`}
              >
                {axis.key}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
