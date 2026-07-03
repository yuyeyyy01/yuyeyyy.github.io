/**
 * 站点全局配置 —— 集中管理，方便迁移平台时只改一处。
 *
 * basePath 解耦：
 * - 优先读环境变量 NEXT_PUBLIC_BASE_PATH（Cloudflare 根路径部署时设为空串）
 * - 未设时回退到 GitHub Pages 子路径 /yuyeyyy.github.io（本地开发/过渡期）
 *
 * 迁移 Cloudflare 时只需在 Cloudflare Pages 环境变量里设：
 *   NEXT_PUBLIC_BASE_PATH = ""   （根路径）
 *   NEXT_PUBLIC_SITE_URL  = "https://你的域名"
 */

// basePath —— next.config.ts 也用这个值，保证一致
// 环境变量未设时回退到 GitHub Pages 子路径，保证本地/过渡期不受影响
export const BASE_PATH: string =
  process.env.NEXT_PUBLIC_BASE_PATH ?? "/yuyeyyy.github.io";

// 站点根 URL（含 basePath，用于拼接绝对 URL 给 SEO/RSS/OG）
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://yuyeyyy01.github.io/yuyeyyy.github.io";

// 站点信息
export const SITE = {
  title: "Yuyeyyy — 图形与渲染",
  description: "Unity 渲染、Shader 与图形学学习笔记。",
  author: "yuyeyyy",
  lang: "zh-CN",
};
