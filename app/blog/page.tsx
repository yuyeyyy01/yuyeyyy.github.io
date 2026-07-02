import type { Metadata } from "next";
import { getAllPosts } from "@/lib/posts";
import ArticleCard from "@/components/ArticleCard";

export const metadata: Metadata = {
  title: "文章",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="container-page py-24 md:py-32">
      <header className="mb-12">
        <p className="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">
          Writing
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
          文章
        </h1>
        <p className="mt-4 text-[var(--foreground-soft)]">
          图形学 / Shader 学习笔记与踩坑记录
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-[var(--foreground-muted)]">还没有文章。</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <ArticleCard
              key={post.slug}
              slug={post.slug}
              title={post.title}
              date={post.date}
              category={post.category}
              excerpt={post.description}
            />
          ))}
        </div>
      )}
    </main>
  );
}
