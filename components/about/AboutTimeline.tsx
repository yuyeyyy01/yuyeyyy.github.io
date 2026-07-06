import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TIMELINE_ITEMS } from "@/lib/about-data";

/**
 * 纵向时间线 —— 渲染项目流水。
 *
 * 左侧竖线 border-l-2 pl-6，每项目一个 article。
 * 顶部 § 节点圆点贴竖线。mono 日期 + 宋体标题 + tags + 摘要。
 * 有 href 的整块 Link（卡片风），wip 的加 § wip 小标签。
 * server component。
 */
export default function AboutTimeline() {
  return (
    <ol
      className="mt-10 border-l-2 border-[var(--border)] pl-6"
      style={{ listStyle: "none" }}
    >
      {TIMELINE_ITEMS.map((item, i) => {
        const inner = (
          <article className="group relative">
            {/* 节点圆点：贴左侧竖线 */}
            <span
              aria-hidden
              className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--accent)] bg-[var(--background)] transition-colors duration-300 group-hover:bg-[var(--accent)]"
            />

            {/* mono 日期 + wip 标签 */}
            <div className="flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              <time dateTime={item.date}>{item.date}</time>
              {item.wip && (
                <span className="rounded-[3px] border border-[var(--accent-warm)] px-1.5 py-0.5 text-[0.6rem] text-[var(--accent-warm)]">
                  § wip
                </span>
              )}
              <span className="ml-auto tabular-nums text-[var(--foreground-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            {/* 宋体标题 */}
            <h3 className="mt-2 font-[family-name:var(--font-serif)] text-base font-semibold leading-snug text-[var(--foreground)] md:text-lg">
              {item.title}
            </h3>

            {/* tags */}
            <ul
              className="mt-2 flex flex-wrap gap-1.5"
              style={{ listStyle: "none", padding: 0 }}
            >
              {item.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[0.68rem] text-[var(--foreground-soft)]"
                >
                  {t}
                </li>
              ))}
            </ul>

            {/* 摘要 */}
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-soft)]">
              {item.summary}
            </p>

            {/* 有 href 时显示阅读提示 */}
            {item.href && (
              <div className="mt-3 flex items-center gap-1 font-mono text-[0.7rem] text-[var(--foreground-muted)] transition-colors duration-300 group-hover:text-[var(--accent)]">
                <span>阅读</span>
                <ArrowRight
                  size={13}
                  aria-hidden
                  className="inline-flex transition-transform duration-300 ease-out group-hover:translate-x-1"
                />
              </div>
            )}
          </article>
        );

        return (
          <li key={i} className="mb-8 last:mb-0">
            {item.href ? (
              <Link
                href={item.href}
                className="card block p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--accent)] md:p-5"
                aria-label={item.title}
              >
                {inner}
              </Link>
            ) : (
              <div className="card p-4 opacity-90 md:p-5">{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
