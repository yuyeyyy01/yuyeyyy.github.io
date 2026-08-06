import { CAREER_ITEMS } from "@/lib/about-data";

/**
 * 工作经历板块 —— 双列时间轴（左侧时间轴 / 右侧履历卡）。
 *
 * 与 AboutTimeline 区分：
 * - AboutTimeline 是「项目流水」，短条目、可跳转文章
 * - CareerTimeline 是「职业阶段」，长条目、带 highlights 列表与技术栈
 *
 * 视觉沿用站内语言：mono 时间、宋体公司名、青绿 accent 节点、
 * 在职项用实心节点 + 呼吸环，历史项用空心节点。
 * server component —— 无交互状态，全部真实 DOM 便于 SEO。
 */
export default function CareerTimeline() {
  return (
    <ol className="mt-10" style={{ listStyle: "none", padding: 0 }}>
      {CAREER_ITEMS.map((item, i) => (
        <li key={`${item.company}-${i}`} className="group relative">
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-[132px_1fr]">
            {/* 左列：时间 + 地点（桌面端独立列，移动端叠在卡片上方） */}
            <div className="pb-3 md:pb-0 md:pt-5 md:text-right">
              <time className="block font-mono text-[0.72rem] uppercase tracking-[0.08em] text-[var(--foreground-soft)]">
                {item.period}
              </time>
              <span className="mt-1 block font-mono text-[0.66rem] uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                {item.location}
              </span>
            </div>

            {/* 右列：竖线 + 节点 + 卡片 */}
            <div
              className={`relative pl-6 ${
                i === CAREER_ITEMS.length - 1 ? "" : "pb-8"
              }`}
              style={{
                // 最后一项不画竖线，避免尾部悬空
                borderLeftWidth: i === CAREER_ITEMS.length - 1 ? 0 : 2,
                borderLeftStyle: "solid",
                borderLeftColor: "var(--border)",
              }}
            >
              {/* 最后一项单独补一段短竖线，让节点仍挂在轴上 */}
              {i === CAREER_ITEMS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-7 w-0.5 bg-[var(--border)]"
                />
              )}

              {/* 节点：在职实心 + 呼吸环，历史空心 */}
              <span
                aria-hidden
                className={`absolute -left-[7px] top-5 h-3 w-3 rounded-full border-2 border-[var(--accent)] transition-colors duration-300 ${
                  item.current
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--background)] group-hover:bg-[var(--accent)]"
                }`}
              />
              {item.current && (
                <span
                  aria-hidden
                  className="career-node-pulse absolute -left-[13px] top-[14px] h-6 w-6 rounded-full border border-[var(--accent)]"
                />
              )}

              <article className="card p-4 transition-colors duration-300 group-hover:border-[var(--border-strong)] md:p-5">
                {/* 岗位 + 在职标记 */}
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-[family-name:var(--font-serif)] text-base font-semibold leading-snug text-[var(--foreground)] md:text-lg">
                    {item.role}
                  </h3>
                  {item.current && (
                    <span className="rounded-[3px] border border-[var(--accent)] px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-[var(--accent)]">
                      § active
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[0.66rem] tabular-nums text-[var(--foreground-muted)]">
                    {String(CAREER_ITEMS.length - i).padStart(2, "0")}
                  </span>
                </div>

                {/* 公司 */}
                <p className="mt-1 font-mono text-[0.78rem] text-[var(--accent)]">
                  {item.company}
                </p>

                {/* 阶段定位 */}
                <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-soft)]">
                  {item.summary}
                </p>

                {/* 产出条目：§ 前缀 + 细线分隔 */}
                <ul
                  className="mt-4 space-y-2.5 border-t border-[var(--border)] pt-4"
                  style={{ listStyle: "none", padding: "1rem 0 0" }}
                >
                  {item.highlights.map((h, hi) => (
                    <li key={hi} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[0.42rem] h-1 w-1 shrink-0 rounded-full bg-[var(--accent-warm)]"
                      />
                      <span className="text-sm leading-relaxed text-[var(--foreground-soft)]">
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* 技术栈 */}
                <ul
                  className="mt-4 flex flex-wrap gap-1.5"
                  style={{ listStyle: "none", padding: 0 }}
                >
                  {item.stack.map((s) => (
                    <li
                      key={s}
                      className="rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[0.68rem] text-[var(--foreground-soft)]"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
