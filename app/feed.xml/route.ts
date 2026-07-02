import { Feed } from "feed";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-static";

const SITE_URL = "https://yuyeyyy01.github.io/yuyeyyy.github.io";

export async function GET() {
  const posts = getAllPosts();

  const feed = new Feed({
    id: SITE_URL,
    title: "Yuyeyyy — 图形与渲染",
    description: "Unity 渲染、Shader 与图形学学习笔记。",
    link: SITE_URL,
    language: "zh-CN",
    image: `${SITE_URL}/opengraph-image`,
    favicon: `${SITE_URL}/favicon.ico`,
    copyright: `© ${new Date().getFullYear()} Yuyeyyy`,
    updated: posts.length > 0 ? safeDate(posts[0].date) : new Date(),
    feedLinks: {
      rss: `${SITE_URL}/feed.xml`,
    },
    author: {
      name: "Yuyeyyy",
      link: SITE_URL,
    },
  });

  for (const post of posts) {
    const url = `${SITE_URL}/blog/${post.slug}/`;
    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.description,
      content: post.content,
      date: safeDate(post.date),
    });
  }

  const xml = feed.rss2();
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

// 把 post.date（可能是 "2024-01-15" 或空串）安全转成 Date
function safeDate(raw: string): Date {
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? new Date() : new Date(parsed);
}
