import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { getAllLabs } from "@/lib/lab";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  const labs = getAllLabs();
  const now = new Date();

  // 静态页面：首页、关于、博客列表、实验室列表
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/lab/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // 每个 lab demo 一个条目
  const labRoutes: MetadataRoute.Sitemap = labs.map((lab) => ({
    url: `${SITE_URL}/lab/${lab.slug}/`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // 每篇文章一个条目，lastModified 用文章 date
  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => {
    const parsed = Date.parse(post.date);
    const lastModified = Number.isNaN(parsed) ? now : new Date(parsed);
    return {
      url: `${SITE_URL}/blog/${post.slug}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...labRoutes, ...postRoutes];
}
