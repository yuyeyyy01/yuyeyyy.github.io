"use client";

import type { CSSProperties } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

export interface FigureProps {
  /** 图片地址。可以是 /images/xxx.png 这类 public 内的相对路径，也可以是远程 URL（需配置 remotePatterns，静态导出下推荐用本地图）。 */
  src: string;
  /** 无障碍替代文字，缺失时回退到 caption */
  alt?: string;
  /** 图说，渲染在图片下方居中，使用次级前景色 */
  caption?: string;
  /** 显式约束宽度的像素值；不传则由父容器宽度决定（推荐放在 prose 内让其自然撑满） */
  width?: number;
  /** 显式约束高度的像素值；与 width 一起可用于锁定宽高比 */
  height?: number;
  /** 可选的放大链接：点击图片在新窗口打开此 URL（常传原图）。不传则图片不可点击。 */
  href?: string;
  /** 透传给 next/image 的额外 className（作用于 img 本身） */
  className?: string;
  /** 透传给外层 figure 的 className */
  wrapperClassName?: string;
  /** 优先加载（首屏插图建议打开） */
  priority?: boolean;
}

/**
 * 文章插图组件 —— 苹果风。
 *
 * - 图片圆角 rounded-2xl，细边框，深浅主题自适应。
 * - 下方 caption 居中、text-sm、var(--foreground-muted)。
 * - 若提供 href，图片可点击在新窗口打开原图（加 hover 微缩放与边框加深）。
 * - 静态导出下 next/image 走 unoptimized，basePath 自动生效。
 *
 * MDX 用法（需在 app/blog/[slug]/page.tsx 的 MDXRemote components 里注册 Figure）：
 *
 *   <Figure src="/images/test.png" alt="测试图" caption="这是一张测试图" />
 *   <Figure src="/images/test.png" alt="测试图" caption="点击放大" href="/images/test.png" width={640} />
 */
export default function Figure({
  src,
  alt,
  caption,
  width,
  height,
  href,
  className,
  wrapperClassName,
  priority,
}: FigureProps) {
  const resolvedAlt = alt ?? caption ?? "";

  // next/image 在非 fill 模式下要求 width/height。
  // 用户未传时给一个占位尺寸（16:9），实际展示由 CSS w-full h-auto 接管，
  // 浏览器会按图片真实比例渲染，不会失真。
  const imgWidth = width ?? 1600;
  const imgHeight = height ?? 900;

  const imgStyle: CSSProperties =
    width && height ? { width, height, objectFit: "contain" } : {};

  const imageEl = (
    <Image
      src={src}
      alt={resolvedAlt}
      width={imgWidth}
      height={imgHeight}
      priority={priority}
      // 静态导出 + images.unoptimized 下，next/image 不做尺寸优化，
      // 用 className 的 w-full h-auto 控制展示尺寸，浏览器按真实比例渲染。
      style={imgStyle}
      className={cn(
        "block h-auto w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]",
        href &&
          "cursor-zoom-in transition-transform duration-300 ease-out hover:scale-[1.01] hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );

  const inner = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={resolvedAlt ? `在新窗口打开：${resolvedAlt}` : "在新窗口打开原图"}
    >
      {imageEl}
    </a>
  ) : (
    imageEl
  );

  return (
    <figure
      className={cn(
        "my-8 flex flex-col items-center",
        wrapperClassName,
      )}
    >
      <div
        className={cn(
          "w-full",
          width ? "mx-auto" : "w-full",
        )}
        style={width ? { maxWidth: width } : undefined}
      >
        {inner}
      </div>
      {caption ? (
        <figcaption className="mt-3 text-center text-sm leading-relaxed text-[var(--foreground-muted)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

// 兼容未显式导入类型时也能在 MDX 中直接使用
export type FigureImageProps = Omit<ImageProps, "src">;
