import FrameIndicator from "@/components/FrameIndicator";
import AboutBackdrop from "@/components/about/AboutBackdrop";
import { ABOUT_SUMMARY } from "@/lib/about-data";

/**
 * 关于页签名区 —— 唯一挂载交互背景的区域（banner）。
 *
 * 布局对齐首页 Hero（components/Hero.tsx）的分层方式：
 * - 外层 section：relative + overflow-hidden + isolate，无 container-page（背景要全宽）
 * - AboutBackdrop：absolute inset-0 z-0，只在这个 banner 内渲染涟漪+底图
 * - 遮罩层：absolute inset-0 z-10，向下渐变到页面背景色，让内容区衔接处不突兀
 * - 内容层：container-page 包裹，z-20，与首页一致的左对齐编辑式排版
 *
 * 之前版本用 fixed 全屏层铺满整页背景，已改为只在此 banner 内显示——
 * 其余 section（Career / Passes / Radar / Timeline / Output）恢复普通不透明卡片，
 * 不再需要半透明玻璃 + text-shadow 保护那套全页可读性方案。
 */
export default function AboutHero() {
  return (
    <section className="about-hero relative isolate min-h-[520px] overflow-hidden md:min-h-[620px]">
      {/* 背景层：鼠标涟漪 + 底图漂移，只在这个 banner 区域内 */}
      <AboutBackdrop />

      {/* 遮罩层：向下渐变回页面背景色，衔接后续内容区 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to top, var(--background) 0%, transparent 38%)," +
            "linear-gradient(to bottom, var(--background) 0%, transparent 30%)",
        }}
      />

      {/* signature：右上角渲染状态指示器 */}
      <div className="absolute right-4 top-6 z-20 md:right-8 md:top-8">
        <FrameIndicator />
      </div>

      <div className="container-page relative z-20 py-20 md:py-28">
        <div className="relative max-w-3xl">
          {/* § pass 标签行 */}
          <div className="section-rule">
            <span>§ About</span>
          </div>

          {/* 宋体大标题：difference 混合反色，对齐原站 .invert-text 的做法。
              只用在这一处大字标题上——正文段落已不再需要 text-shadow 保护，
              背景现在收窄在这个 banner 内，不会铺到正文下面。 */}
          <h1
            className="hero-invert-text mt-6 font-[family-name:var(--font-serif)] text-5xl font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-6xl"
            style={{ mixBlendMode: "difference" }}
          >
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
      </div>
    </section>
  );
}
