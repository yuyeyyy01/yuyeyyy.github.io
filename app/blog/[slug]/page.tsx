import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeKatex from "rehype-katex";
// KaTeX 样式：静态导出下会打进全局 CSS
import "katex/dist/katex.min.css";
import {
  getAllPosts,
  getPost,
  getAdjacentPosts,
  extractHeadings,
} from "@/lib/posts";
import ReadingProgress from "@/components/ReadingProgress";
import TableOfContents from "@/components/TableOfContents";
import CodeBlockEnhancer from "@/components/CodeBlockEnhancer";
import Comments from "@/components/Comments";
import Scene from "@/components/Scene";
import ShaderDemo from "@/components/ShaderDemo";
import { PlaygroundPBR, PlaygroundSSS, PlaygroundHair } from "@/components/PlaygroundPresets";
import Figure from "@/components/Figure";
import Video from "@/components/Video";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const headings = extractHeadings(post.content);
  const { prev, next } = getAdjacentPosts(slug);

  return (
    <>
      <ReadingProgress />
      <main className="container-page mx-auto py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,42rem)_16rem]">
          {/* 左侧：文章正文 */}
          <article className="min-w-0 max-w-2xl">
            <header className="mb-12">
              {/* framegraph pass 标签风：§ category，与首页 § Latest 体系一致 */}
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                <span className="text-[var(--accent)]">§</span> {post.category}
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-serif)] text-3xl font-bold leading-tight tracking-[-0.02em] text-[var(--foreground)] md:text-4xl">
                {post.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-[var(--foreground-muted)]">
                <time dateTime={post.date}>
                  {formatDate(post.date)}
                </time>
                <Link
                  href="/blog/"
                  className="inline-flex items-center gap-1.5 text-[var(--foreground-soft)] transition-colors hover:text-[var(--accent)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>返回文章</span>
                </Link>
              </div>
            </header>

            <div className="prose">
              <MDXRemote
                source={post.content}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm, remarkMath],
                    rehypePlugins: [
                      rehypeSlug,
                      [
                        rehypePrettyCode,
                        {
                          theme: "github-dark-dimmed",
                          keepBackground: false,
                        },
                      ],
                      rehypeKatex,
                    ],
                  },
                }}
                components={{
                  Scene,
                  ShaderDemo,
                  PlaygroundPBR,
                  PlaygroundSSS,
                  PlaygroundHair,
                  Figure,
                  Video,
                }}
              />
            </div>

            <CodeBlockEnhancer />

            {/* 上下篇导航 */}
            {(prev || next) && (
              <nav
                aria-label="上下篇"
                className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {prev ? (
                  <AdjacentCard
                    kind="prev"
                    slug={prev.slug}
                    title={prev.title}
                    date={prev.date}
                  />
                ) : (
                  <div aria-hidden className="hidden sm:block" />
                )}
                {next ? (
                  <AdjacentCard
                    kind="next"
                    slug={next.slug}
                    title={next.title}
                    date={next.date}
                  />
                ) : null}
              </nav>
            )}

            {/* 评论 */}
            <Comments slug={slug} />
          </article>

          <aside className="hidden lg:block">
            <TableOfContents headings={headings} />
          </aside>
        </div>
      </main>
    </>
  );
}

function AdjacentCard({
  kind,
  slug,
  title,
  date,
}: {
  kind: "prev" | "next";
  slug: string;
  title: string;
  date: string;
}) {
  const isPrev = kind === "prev";
  return (
    <Link
      href={`/blog/${slug}/`}
      className="card group flex flex-col gap-2 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]"
    >
      <div className="flex items-center gap-1.5 font-mono text-[0.7rem] text-[var(--foreground-muted)]">
        {isPrev ? (
          <>
            <ArrowLeft className="h-3 w-3" />
            <span>较新一篇</span>
          </>
        ) : (
          <>
            <span>较旧一篇</span>
            <ArrowRight className="h-3 w-3" />
          </>
        )}
      </div>
      <p className="font-[family-name:var(--font-serif)] text-sm font-semibold leading-snug text-[var(--foreground)] transition-colors duration-300 group-hover:text-[var(--accent)]">
        {title}
      </p>
      <time
        dateTime={date}
        className="font-mono text-[0.7rem] text-[var(--foreground-muted)]"
      >
        {date}
      </time>
    </Link>
  );
}
