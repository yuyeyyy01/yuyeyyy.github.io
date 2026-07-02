/**
 * 站点全局配置 —— 集中管理，方便迁移平台时只改一处。
 * 当前部署在 GitHub Pages 子路径，未来迁 Cloudflare 根路径时改这里即可。
 */

// 站点根 URL（含 basePath，用于拼接绝对 URL 给 SEO/RSS/OG）
export const SITE_URL = "https://yuyeyyy01.github.io/yuyeyyy.github.io";

// basePath —— next.config.ts 也用这个值，保证一致
export const BASE_PATH = "/yuyeyyy.github.io";

// 站点信息
export const SITE = {
  title: "Yuyeyyy — 图形与渲染",
  description: "Unity 渲染、Shader 与图形学学习笔记。",
  author: "yuyeyyy",
  lang: "zh-CN",
};
