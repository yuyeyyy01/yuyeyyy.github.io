import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllLabs, getLab } from "@/lib/lab";
import LabDemoView from "@/components/lab/LabDemoView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllLabs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const demo = getLab(slug);
  if (!demo) return {};
  return {
    title: `${demo.title} — 渲染实验室 — Yuyeyyy`,
    description: demo.description,
    openGraph: {
      title: demo.title,
      description: demo.description,
      type: "article",
    },
  };
}

export default async function LabDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const demo = getLab(slug);
  if (!demo) {
    notFound();
  }

  return (
    <main className="container-page mx-auto py-24">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
          <span className="text-[var(--accent)]">§</span> pass · {demo.difficulty}
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-serif)] text-3xl font-bold leading-tight tracking-[-0.02em] text-[var(--foreground)] md:text-4xl">
          {demo.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--foreground-soft)]">
          {demo.description}
        </p>
        <Link
          href="/lab/"
          className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs text-[var(--foreground-soft)] transition-colors hover:text-[var(--accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>返回实验室</span>
        </Link>
      </header>

      <LabDemoView demo={demo} />
    </main>
  );
}
