import type { NextConfig } from "next";

// 部署在 GitHub Pages 子路径 https://yuyeyyy01.github.io/yuyeyyy.github.io/
const basePath = "/yuyeyyy.github.io";

const nextConfig: NextConfig = {
  // 静态导出到 out/，GitHub Pages 托管
  output: "export",
  // 子路径部署
  basePath,
  // 静态导出不需要 trailingSlash 也能工作，但 Pages 更稳
  trailingSlash: true,
  // 静态导出不能用 next/image 的优化
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
