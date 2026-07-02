"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Giscus from "@giscus/react";

/**
 * Giscus 评论组件 —— 苹果风克制样式。
 *
 * ⚠️ 使用前必读：
 * repoId 和 categoryId 需要仓库所有者去 https://giscus.app 配置仓库后获取，
 * 填入下方对应字段，否则评论不会显示。
 *
 * 配置步骤：
 * 1. 在 GitHub 仓库 Settings → General → Features 勾选 Discussions
 * 2. 打开 https://giscus.app ，输入仓库 yuyeyyy01/yuyeyyy.github.io
 * 3. 选择 Discussion 分类（默认 Announcements），页面会生成 repoId 与 categoryId
 * 4. 将生成的值填入下方 repoId / categoryId 字段
 */
export default function Comments() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免水合不匹配，客户端挂载后再渲染 Giscus
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // 占位，避免水合时主题未确定导致闪烁
    return <section aria-hidden className="h-32" />;
  }

  return (
    <section
      aria-label="评论"
      className="mt-16 border-t border-[var(--border)] pt-10"
    >
      <h2 className="text-base font-medium text-[var(--foreground)]">
        评论
      </h2>
      <p className="mt-1 text-sm text-[var(--foreground-soft)]">
        登录 GitHub 后参与讨论
      </p>

      <div className="mt-6">
        <Giscus
          repo="yuyeyyy01/yuyeyyy.github.io"
          repoId="" // TODO: 用户在 https://giscus.app 填 repo 后获取
          category="Announcements"
          categoryId="" // TODO: 同上
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
