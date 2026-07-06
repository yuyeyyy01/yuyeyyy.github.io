import Hero from "@/components/Hero";
import HomeClient from "@/components/home/HomeClient";
import StatsPanel from "@/components/home/StatsPanel";
import TagCloud, { type TagCloudPost } from "@/components/home/TagCloud";
import { LAB_DEMOS } from "@/components/lab/demos";
import { getAllPosts, getAllTags } from "@/lib/posts";

/**
 * 首页（server component）。
 *
 * 在 build 期（SSG）读取 content/blog 下的文章，序列化成客户端安全的最小结构
 * 传给 HomeClient / TagCloud / StatsPanel。这样静态导出的 HTML 含真实数据，无 hydration
 * mismatch，也避免在 client bundle 里直接调用 node:fs。
 *
 * 顺序：§ Latest → § Featured Lab → § Glossary → § Stats → § Tags → § About。
 * § Stats + § Tags 作为 children 传入 HomeClient，由其在 § Glossary 与 § About 之间渲染。
 */
export default function Home() {
  const posts = getAllPosts();
  const tags = getAllTags();

  // § Tags 需要的文章结构：去掉大块 content，只留展示字段
  const tagCloudPosts: TagCloudPost[] = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    category: p.category,
    tags: p.tags,
  }));

  // § Stats 仪表盘数据：build 期算好，注入 StatsPanel（client）
  const postCount = posts.length;
  const labCount = LAB_DEMOS.length;
  // 中文按字粗略算，求所有文章 content 长度总和
  const totalChars = posts.reduce((sum, p) => sum + p.content.length, 0);
  // getAllPosts 已按 date 降序，首项即最新
  const lastUpdate = posts[0]?.date ?? "";
  const tagCount = tags.length;

  return (
    <main>
      <Hero />

      <HomeClient>
        <StatsPanel
          postCount={postCount}
          labCount={labCount}
          totalChars={totalChars}
          lastUpdate={lastUpdate}
          tagCount={tagCount}
        />
        <TagCloud posts={tagCloudPosts} tags={tags} />
      </HomeClient>
    </main>
  );
}
