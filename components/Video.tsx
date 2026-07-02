import type { ReactElement } from "react";
import { BASE_PATH } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Video —— 统一的视频 / GIF 嵌入组件（苹果风）。
 *
 * 三种用法：
 *
 * 1) 外链视频平台（传视频 ID，生成 iframe，自动 16:9）：
 *    <Video bilibili="BV1EfJ56ZEyM" caption="B 站示例" />
 *    <Video youtube="dQw4w9WgXcQ" caption="YouTube 示例" />
 *
 * 2) 本地视频（<video controls>，自动 16:9，可加 poster）：
 *    <Video src="/assets/demo.mp4" poster="/assets/demo-poster.jpg" caption="本地视频" />
 *
 * 3) 本地 GIF（<img>，保留原始宽高比，不强制 16:9）：
 *    <Video src="/assets/anim.gif" alt="动图说明" caption="图注" />
 *
 * src / poster 若以 "/" 开头会自动拼接 basePath（静态导出子路径必需），
 * http/https 绝对 URL 原样使用。
 *
 * 优先级：bililib > youtube > src。
 */

export interface VideoProps {
  /** B 站视频 BV 号（带不带 BV 前缀都行，会自动补齐为完整 bvid），例如 "BV1EfJ56ZEyM" */
  bilibili?: string;
  /** YouTube 视频 ID，例如 "dQw4w9WgXcQ" */
  youtube?: string;
  /** 本地视频 / GIF 路径；以 "/" 开头自动拼接 basePath，http/https 原样使用 */
  src?: string;
  /** 本地视频封面（poster），拼接规则同 src */
  poster?: string;
  /** GIF 的 alt 文本 */
  alt?: string;
  /** 图注（figcaption），同 Figure 风格，居中小字 */
  caption?: string;
  /** 透传到外层 <figure> 的 className */
  className?: string;
}

/** 将以 "/" 开头的本地路径拼接 basePath；http(s) 绝对 URL 原样返回 */
function withBasePath(src: string): string {
  if (/^(https?:)?\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${BASE_PATH}${src}`;
  return src;
}

export default function Video({
  bilibili,
  youtube,
  src,
  poster,
  alt = "",
  caption,
  className,
}: VideoProps) {
  // ---- GIF 分支：保留自然比例，单独走一条渲染路径 ----
  if (src && /\.gif$/i.test(src)) {
    return (
      <figure className={cn("my-8", className)}>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
          <img
            src={withBasePath(src)}
            alt={alt}
            loading="lazy"
            className="block h-auto w-full"
          />
        </div>
        {caption ? (
          <figcaption className="mt-3 text-center text-xs text-[var(--foreground-muted)]">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  // ---- iframe / <video> 分支：统一 16:9 容器 ----
  let media: ReactElement;

  if (bilibili) {
    // 规范化为带 BV 前缀的完整 bvid（B 站 player 需要 12 位完整号）
    const bv = bilibili.startsWith("BV") ? bilibili : `BV${bilibili}`;
    // B 站官方嵌入式外链播放器：仅传 bvid 即可，player 内部解析 cid。
    // danmaku=0 关弹幕、autoplay=0 不自动播放、high_quality=1 默认高画质。
    // referrerPolicy=no-referrer 避免某些场景下 Referer 校验导致空白。
    // 用 allow="fullscreen;..." 表达权限，不再叠加旧属性 allowFullScreen（否则浏览器告警冗余）。
    media = (
      <iframe
        src={`https://player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1&danmaku=0&autoplay=0&as_wide=1`}
        title={caption ?? "Bilibili 视频"}
        loading="lazy"
        scrolling="no"
        referrerPolicy="no-referrer"
        allow="fullscreen; encrypted-media; picture-in-picture; autoplay"
        className="h-full w-full"
      />
    );
  } else if (youtube) {
    media = (
      <iframe
        src={`https://www.youtube.com/embed/${youtube}`}
        title={caption ?? "YouTube 视频"}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        className="h-full w-full"
      />
    );
  } else if (src) {
    media = (
      <video
        src={withBasePath(src)}
        poster={poster ? withBasePath(poster) : undefined}
        controls
        preload="metadata"
        playsInline
        className="h-full w-full"
      />
    );
  } else {
    return null;
  }

  return (
    <figure className={cn("my-8", className)}>
      <div className="aspect-video overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
        {media}
      </div>
      {caption ? (
        <figcaption className="mt-3 text-center text-xs text-[var(--foreground-muted)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
