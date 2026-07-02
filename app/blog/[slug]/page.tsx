import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPost } from "@/lib/posts";

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

  return (
    <main className="container-page mx-auto max-w-2xl py-24">
      <article>
        <header className="mb-12">
          <p className="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">
            {post.category}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
            {post.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--foreground-muted)]">
            <time dateTime={post.date} className="font-mono">
              {formatDate(post.date)}
            </time>
            <Link
              href="/blog/"
              className="inline-flex items-center gap-1.5 text-[var(--foreground-soft)] transition-colors hover:text-[var(--accent)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回文章</span>
            </Link>
          </div>
        </header>

        <div className="prose">
          <MDXRemote source={post.content} />
        </div>
      </article>
    </main>
  );
}
