import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AboutHero from "@/components/about/AboutHero";
import SkillPipeline from "@/components/about/SkillPipeline";
import RenderRadar from "@/components/about/RenderRadar";
import AboutTimeline from "@/components/about/AboutTimeline";
import { CONTACT } from "@/lib/about-data";

export const metadata: Metadata = {
  title: "关于我 — Yuyeyyy",
  description:
    "Unity 图形 / Shader 爱好者，偏技术美术 / 渲染工程方向。技能 pass 串、六维渲染能力雷达与项目时间线。",
};

/**
 * section 标签行：framegraph pass 风格 —— § Name + 细线延伸。
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-rule">
      <span>{children}</span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main>
      {/* § About：签名区 */}
      <AboutHero />

      {/* § Passes：技能 pass 串 */}
      <section className="container-page py-20 md:py-28">
        <SectionLabel>§ Passes</SectionLabel>
        <header className="mt-5 max-w-2xl">
          <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
            技能 Pass
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
            按 framegraph pass 的方式排列当前熟悉的渲染方向。LUT 渐变条长度即熟练度，颜色越偏琥珀代表越接近顶配。
          </p>
        </header>
        <SkillPipeline />
      </section>

      {/* § Radar：渲染能力六维雷达 */}
      <section className="container-page py-20 md:py-28">
        <SectionLabel>§ Radar</SectionLabel>
        <header className="mt-5 max-w-2xl">
          <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
            渲染能力雷达
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
            六维自评：PBR / Shader / 管线 / 优化 / 数学 / 工具链。点击顶点或轴标签切换维度详情。
          </p>
        </header>
        <RenderRadar />
      </section>

      {/* § Timeline：项目时间线 */}
      <section className="container-page py-20 md:py-28">
        <SectionLabel>§ Timeline</SectionLabel>
        <header className="mt-5 max-w-2xl">
          <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
            项目时间线
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
            最近的渲染实验与文章。已成文的整卡可跳转，<span className="font-mono text-[var(--accent-warm)]">§ wip</span> 表示还在整理中。
          </p>
        </header>
        <AboutTimeline />
      </section>

      {/* § Output：联系方式 + LUT 收尾条 */}
      <section className="container-page py-20 md:py-28">
        <SectionLabel>§ Output</SectionLabel>
        <header className="mt-5 max-w-2xl">
          <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
            联系
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
            如果你也在做实时渲染相关的东西，欢迎来交流。
          </p>
        </header>

        {/* mono 联系行 */}
        <div className="mt-8 card p-5 md:p-6">
          <dl className="grid grid-cols-1 gap-3 font-mono text-sm md:grid-cols-[80px_1fr] md:gap-4">
            <dt className="text-[var(--foreground-muted)]">email</dt>
            <dd>
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-[var(--accent)] transition-opacity hover:opacity-80"
              >
                {CONTACT.email}
              </a>
            </dd>
            <dt className="text-[var(--foreground-muted)]">github</dt>
            <dd>
              <Link
                href={CONTACT.github}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] transition-opacity hover:opacity-80"
              >
                {CONTACT.github}
              </Link>
            </dd>
            <dt className="text-[var(--foreground-muted)]">site</dt>
            <dd>
              <Link
                href={CONTACT.site}
                className="text-[var(--accent)] transition-opacity hover:opacity-80"
              >
                {CONTACT.site}
              </Link>
            </dd>
          </dl>

          {/* 回首页 */}
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
          >
            回首页
            <ArrowRight size={16} className="-translate-y-px" />
          </Link>
        </div>

        {/* LUT 收尾条 */}
        <div className="mt-8">
          <div className="lut-bar w-full" aria-hidden />
          <p className="mt-3 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
            § EOT · end of about
          </p>
        </div>
      </section>
    </main>
  );
}
