"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Giscus from "@giscus/react";

/**
 * 评论组件。
 *
 * 当前阶段：Giscus 未配置（缺 repoId/categoryId，需仓库所有者操作），
 * 暂不渲染 Giscus，只显示占位，避免向 giscus.app 发请求报 403/未安装错误。
 *
 * 下一阶段（阶段 B）：替换为自建评论系统（Cloudflare D1 + 自定义接口，
 * 单用户 GitHub OAuth），随在线写作后台一起部署，届时本组件改写。
 *
 * 若要临时启用 Giscus：仓库所有者去 https://giscus.app 配置仓库
 * （启用 Discussions + 安装 Giscus App），拿到 repoId / categoryId 填入下方即可。
 */
const GISCUS_REPO_ID = ""; // 配置后填入
const GISCUS_CATEGORY_ID = ""; // 配置后填入

export default function Comments() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ID 未配置时显示占位，不渲染 Giscus，不发请求
  if (!GISCUS_REPO_ID || !GISCUS_CATEGORY_ID) {
    return (
      <section
        aria-label="评论"
        className="mt-16 border-t border-[var(--border)] pt-10"
      >
        <h2 className="text-base font-medium text-[var(--foreground)]">评论</h2>
        <p className="mt-3 text-sm text-[var(--foreground-soft)]">
          评论系统正在搭建中，将随站点后台一起上线。
        </p>
      </section>
    );
  }

  // 已配置时才渲染 Giscus
  if (!mounted) {
    return <section aria-hidden className="h-32" />;
  }

  return (
    <section
      aria-label="评论"
      className="mt-16 border-t border-[var(--border)] pt-10"
    >
      <h2 className="text-base font-medium text-[var(--foreground)]">评论</h2>
      <p className="mt-1 text-sm text-[var(--foreground-soft)]">
        登录 GitHub 后参与讨论
      </p>

      <div className="mt-6">
        <Giscus
          repo="yuyeyyy01/yuyeyyy.github.io"
          repoId={GISCUS_REPO_ID}
          category="Announcements"
          categoryId={GISCUS_CATEGORY_ID}
          mapping="pathname"
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme={theme === "dark" ? "github-dark" : "github-light"}
          lang="zh-CN"
          loading="lazy"
        />
      </div>
    </section>
  );
}

