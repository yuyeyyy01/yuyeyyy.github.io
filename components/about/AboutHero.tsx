import FrameIndicator from "@/components/FrameIndicator";
import { ABOUT_SUMMARY } from "@/lib/about-data";

/**
 * 关于页签名区。
 *
 * 视觉：右上角 FrameIndicator（LUT 条 + frame 计数）+ section-rule § About +
 * 宋体大标题"关于我" + mono 元信息行 + 宋体副标题。
 * 与首页 Hero 同语言（左对齐编辑式，非居中三件套）。
 * server component —— 不含交互状态。
 */
export default function AboutHero() {
  return (
    <section className="container-page relative py-20 md:py-28">
      {/* signature：右上角渲染状态指示器 */}
      <div className="absolute right-4 top-20 md:right-8 md:top-24">
        <FrameIndicator />
      </div>

      <div className="relative max-w-3xl">
        {/* § pass 标签行 */}
        <div className="section-rule">
          <span>§ About</span>
        </div>

        {/* 宋体大标题 */}
        <h1 className="mt-6 font-[family-name:var(--font-serif)] text-5xl font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--foreground)] md:text-6xl">
          关于我
        </h1>

        {/* mono 元信息行 */}
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
          Graphics / Rendering · PBR · SSS · Hair
        </p>

        {/* 宋体副标题：浓缩原 about 第一段 */}
        <p className="mt-8 max-w-2xl text-base leading-relaxed text-[var(--foreground-soft)] md:text-lg">
          {ABOUT_SUMMARY}
        </p>
      </div>
    </section>
  );
}
