import { SKILL_PASSES } from "@/lib/about-data";

/**
 * 技能 pass 串 —— framegraph pass 列表风。
 *
 * 每项一行：mobile 单列，md+ 两列布局（左 § 标签 + 序号，右名称 + tags + LUT 条）。
 * 左侧竖线串联（border-l + 节点圆点），数据多边形/顶点圆点呼应渲染调试。
 * LUT 条复用 .lut-bar 工具类，宽度按 level/5*100%。
 * 纯 CSS hover（border accent + 微右移），无 JS。server component。
 */
export default function SkillPipeline() {
  return (
    <ol
      className="mt-10 border-l border-[var(--border)] pl-6"
      style={{ listStyle: "none" }}
    >
      {SKILL_PASSES.map((skill, i) => {
        const pct = (skill.level / 5) * 100;
        return (
          <li
            key={skill.pass}
            className="group relative mb-7 last:mb-0 transition-transform duration-300 ease-out hover:translate-x-0.5"
          >
            {/* 节点圆点：贴左侧竖线 */}
            <span
              aria-hidden
              className="absolute -left-[31px] top-1.5 h-2 w-2 rounded-full border border-[var(--accent)] bg-[var(--background)] transition-colors duration-300 group-hover:bg-[var(--accent)]"
            />

            <article className="card p-4 transition-colors duration-300 group-hover:border-[var(--accent)] md:p-5">
              {/* mobile：单列；md：左 § 标签 + 序号 / 右 名称 + tags + LUT */}
              <div className="flex flex-col gap-3 md:grid md:grid-cols-[180px_1fr] md:items-start md:gap-6">
                {/* 左：§ pass 标签 + 序号 */}
                <div className="flex items-baseline gap-2 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                  <span className="text-[var(--accent)]">§</span>
                  <span>{skill.pass}</span>
                  <span className="ml-auto tabular-nums text-[var(--foreground-muted)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* 右：名称 + tags + LUT 条 */}
                <div>
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-[family-name:var(--font-serif)] text-base font-semibold text-[var(--foreground)] md:text-lg">
                      {skill.name}
                    </h3>
                    {/* mono 数值 */}
                    <span className="font-mono text-xs tabular-nums text-[var(--foreground-muted)]">
                      {skill.level.toFixed(1)}/5.0
                    </span>
                  </div>

                  {/* tags */}
                  <ul
                    className="mt-2 flex flex-wrap gap-1.5"
                    style={{ listStyle: "none", padding: 0 }}
                  >
                    {skill.tags.map((t) => (
                      <li
                        key={t}
                        className="rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[0.68rem] text-[var(--foreground-soft)]"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>

                  {/* LUT 渐变条：轨道（border）+ 渐变填充（level/5 宽度）
                      低 level 仅冷青绿端，高 level 才到琥珀 —— 颜色暖度即熟练度 */}
                  <div className="mt-3">
                    <div
                      className="h-1 w-full overflow-hidden rounded-[2px] bg-[var(--border)]"
                      role="meter"
                      aria-valuenow={skill.level}
                      aria-valuemin={0}
                      aria-valuemax={5}
                      aria-label={`${skill.name} 熟练度`}
                    >
                      <div
                        className="lut-bar"
                        style={{ width: `${pct}%`, height: "100%" }}
                      />
                    </div>
                  </div>

                  {/* 一句话说明（mono，属性面板 comment 风） */}
                  <p className="mt-3 font-mono text-[0.7rem] leading-relaxed text-[var(--foreground-muted)]">
                    # {skill.note}
                  </p>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
