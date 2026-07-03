/**
 * 站点全局配置 —— 集中管理，方便迁移平台时只改一处。
 *
 * 已正式迁移到 Cloudflare Pages 根路径（yuyepage.pages.dev）。
 * basePath 默认为根路径（空串），不再依赖环境变量。
 * GitHub Pages 子路径时代已结束（workflow 已删）。
 *
 * 如需临时回到子路径，设环境变量 NEXT_PUBLIC_BASE_PATH=/xxx 即可覆盖。
 */

// basePath —— next.config.ts 也用这个值，保证一致
// 默认根路径（空串）；环境变量可覆盖（如需子路径时）
export const BASE_PATH: string =
  process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// 站点根 URL（用于拼接绝对 URL 给 SEO/RSS/OG）
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://yuyepage.pages.dev";

// 站点信息
export const SITE = {
  title: "Yuyeyyy — 图形与渲染",
  description: "Unity 渲染、Shader 与图形学学习笔记。",
  author: "yuyeyyy",
  lang: "zh-CN",
};
