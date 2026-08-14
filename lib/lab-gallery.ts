/**
 * /lab 页面数据 —— 作品集展示（视频）+ 渲染练习（图片）。
 *
 * 替代原先的 lib/lab.ts（WebGL2 shader playground 数据层）。
 * 两个数组分别喂给 § Portfolio / § Exercises 两个分区，
 * 卡片双击（触屏单击）跳转到 href 指向的博客文章。
 *
 * 所有文字必须是真实 DOM（SEO），故数据集中在此处供 server 组件直接渲染。
 */

export interface GalleryItem {
  /** 唯一标识，用作 React key */
  slug: string;
  /** 卡片标题 */
  title: string;
  /** 分类标签，如 "Unity URP / 2.5D" */
  category: string;
  /** 一句话摘要 */
  summary: string;
  /** video = 视频作品（封面 + ▶ 标记），image = 静态渲染练习 */
  kind: "video" | "image";
  /** 封面图路径（public 下的绝对路径，以 / 开头） */
  cover: string;
  /** kind=video 时的来源：bilibili 用 bvid，local 用 public 下 mp4 路径 */
  videoType?: "bilibili" | "local";
  /** bilibili → bvid（如 BV1Jtja6wEAq）；local → /assets/xxx.mp4 */
  videoSrc?: string;
  /** 双击跳转目标。留空表示笔记还在整理中，卡片不可跳转 */
  href?: string;
  /** 技术标签 */
  tags: string[];
}

/** § Portfolio 作品集展示：视频为主，2 列 16:9 大卡 */
export const PORTFOLIO_ITEMS: GalleryItem[] = [
  {
    slug: "disco-2d5d-prerender-lighting",
    title: "2.5D 室内光照系统预渲染",
    category: "Unity URP / 2.5D",
    summary:
      "仿《极乐迪斯科》室内光照：AI 出法线与深度图做离线预渲染，RenderFeature 重建世界坐标并回写 Z-Buffer，让 2D 面片接收实时光照并与 3D 动态物体正确遮挡。",
    kind: "video",
    cover: "/assets/portfolio/disco-2d5d-cover.jpg",
    videoType: "bilibili",
    videoSrc: "BV1Jtja6wEAq",
    href: "/blog/disco-2d5d-prerender-lighting/",
    tags: ["URP", "RenderFeature", "Lighting", "AI 预渲染"],
  },
  {
    slug: "urp-postprocess-toon-render",
    title: "URP 后处理卡通风格化渲染",
    category: "URP / 后处理 / 风格化",
    summary:
      "屏幕空间后处理卡通化：色阶化 + 深度/法线混合描边 + 排线/网点填充，用 4-pass 时序稳定（Temporal History）解决描边闪烁。",
    kind: "video",
    cover: "/assets/portfolio/stylized-scene-cover.jpg",
    videoType: "bilibili",
    videoSrc: "BV17FNVzbEsb",
    href: "/blog/urp-postprocess-toon-render/",
    tags: ["URP", "后处理", "卡通渲染", "描边", "TAA"],
  },
];

/** § Exercises 渲染练习：静态图为主，3 列 4:3 小卡 */
export const EXERCISE_ITEMS: GalleryItem[] = [
  {
    slug: "custom-pbr-vs-unity-lit",
    title: "自定义 PBR 与 Unity Lit 的差异拆解",
    category: "Shader / PBR",
    summary:
      "从零写一套 PBR，对比 Unity URP/Lit 的 BRDF 项、能量守恒与几何可见性函数差异。",
    kind: "image",
    cover: "/assets/exercises/pbr-cover.jpg",
    href: "/blog/custom-pbr-vs-unity-lit/",
    tags: ["PBR", "BRDF", "GGX"],
  },
  {
    slug: "skin-sss-thickness-lut",
    title: "基于厚度图的皮肤 SSS：预积分 LUT 实战",
    category: "Skin / SSS",
    summary: "厚度图获取、SSS kernel 生成、LUT 采样到屏幕空间模糊的完整流程。",
    kind: "image",
    cover: "/assets/exercises/sss-cover.jpg",
    href: "/blog/skin-sss-thickness-lut/",
    tags: ["SSS", "LUT", "Skin"],
  },
  {
    slug: "kajiya-kay-marschner-hair",
    title: "Kajiya-Kay 与「类 Marschner」头发高光",
    category: "Hair",
    summary:
      "用两条 Kajiya 高光近似 Marschner，多分支高光在头发体积感中的作用。",
    kind: "image",
    cover: "/assets/exercises/hair-cover.jpg",
    href: "/blog/kajiya-kay-marschner-hair/",
    tags: ["Hair", "Kajiya-Kay", "Marschner"],
  },
];

/** 两个分区的总条目数，供首页 § Stats 统计用 */
export const GALLERY_COUNT = PORTFOLIO_ITEMS.length + EXERCISE_ITEMS.length;
