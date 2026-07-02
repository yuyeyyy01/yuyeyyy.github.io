import type { Metadata } from "next";
import { getAllPosts, getAllTags } from "@/lib/posts";
import BlogList, { type BlogListItem } from "@/components/BlogList";

export const metadata: Metadata = {
  title: "文章",
  description: "图形学、Shader 与渲染管线的学习笔记与踩坑记录。",
};

export default function BlogPage() {
  const posts = getAllPosts();
  const tags = getAllTags();

  // 序列化成客户端安全的最小结构（去掉大块的 content 字段）
  const items: BlogListItem[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    category: p.category,
    description: p.description,
    tags: p.tags,
  }));

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
        <BlogList posts={items} tags={tags} />
      )}
    </main>
  );
}
