/**
 * 关于页集中数据 —— framegraph 风技能可视化 + 雷达 + 时间线。
 *
 * 视觉语言：§ pass 标签、青绿 + 琥珀配色、宋体标题、mono 数值、LUT 渐变条。
 * 所有文字必须是真实 DOM（SEO），故数据集中在此处供 server 组件直接渲染。
 */

export interface SkillPass {
  /** pass 标签名，例如 "Shadow" */
  pass: string;
  /** 中文名称，例如 "阴影" */
  name: string;
  /** 熟练度 0-5 */
  level: number;
  /** 相关技术标签 */
  tags: string[];
  /** 一句话描述该 pass 的方向 */
  note: string;
}

export interface RadarAxis {
  /** 维度名（中文） */
  name: string;
  /** 英文短标签 */
  key: string;
  /** 自评 0-5 */
  value: number;
  /** 展开后的详细说明 */
  detail: string;
}

export interface TimelineItem {
  /** 日期 YYYY-MM */
  date: string;
  /** 项目标题 */
  title: string;
  /** 分类标签 */
  tags: string[];
  /** 摘要 */
  summary: string;
  /** 若有对应文章，指向 /blog/<slug>/ */
  href?: string;
  /** 未成文的项目标记 */
  wip?: boolean;
}

export interface ContactInfo {
  email: string;
  github: string;
  site: string;
}

/** 技能 pass 串：7 项渲染方向，按 framegraph pass 排列 */
export const SKILL_PASSES: SkillPass[] = [
  {
    pass: "Shadow",
    name: "阴影",
    level: 4,
    tags: ["PCF", "PCSS", "URP Shadow", "Cascaded"],
    note: "软硬阴影、级联与百分比近似软阴影",
  },
  {
    pass: "GBuffer",
    name: "延迟渲染",
    level: 3,
    tags: ["MRT", "G-Buffer", "Lighting Pass", "Deferred"],
    note: "多目标渲染与延迟光照合成",
  },
  {
    pass: "Lighting",
    name: "PBR 光照",
    level: 4,
    tags: ["BRDF", "Cook-Torrance", "IBL", "URP Lit"],
    note: "直接光 + IBL，对比 Unity Lit 拆解差异",
  },
  {
    pass: "SSS",
    name: "皮肤次表面",
    level: 3,
    tags: ["Thickness Map", "Pre-integrated LUT", "Kernel", "Screen Space"],
    note: "厚度图驱动 + 预积分 LUT 的皮肤散射",
  },
  {
    pass: "Hair",
    name: "头发 Kajiya-Kay / Marschner",
    level: 4,
    tags: ["Kajiya-Kay", "Marschner", "Aniso", "Tangent"],
    note: "双 Kajiya 高光近似 Marschner 的实践",
  },
  {
    pass: "Volumetric",
    name: "体积光",
    level: 3,
    tags: ["Ray Marching", "Fog", "Light Shaft", "Skybox"],
    note: "大气散射、体积雾与光柱",
  },
  {
    pass: "Water",
    name: "水体 / 草地",
    level: 3,
    tags: ["Gerstner", "Depth", "Normal", "Vertex Anim"],
    note: "水面波形 + 草地交互与移动端优化",
  },
];

/** 雷达 6 维：PBR / Shader / 管线 / 优化 / 数学 / 工具链 */
export const RADAR_AXES: RadarAxis[] = [
  {
    name: "PBR",
    key: "PBR",
    value: 4,
    detail:
      "从零写一套 PBR，对比 Unity URP/Lit 的 BRDF 差异，拆近场与远场光照，处理 IBL 的辐照度与预滤波卷积。",
  },
  {
    name: "Shader",
    key: "Shader",
    value: 4,
    detail:
      "HLSL / ShaderGraph 双修，习惯手写 Pass，对 Unity Lit 源码有拆解笔记，覆盖头发、皮肤、水面等专项。",
  },
  {
    name: "管线",
    key: "Pipeline",
    value: 3,
    detail:
      "URP ScriptableRendererFeature 自定义 Pass，多相机 Portal、延迟与前向切换、Render Feature 编排经验。",
  },
  {
    name: "优化",
    key: "Optimization",
    value: 3,
    detail:
      "移动端带宽与指令预算意识，LOD / Overdraw / Shader 变体数控制，RenderDoc 与 Frame Debugger 抓帧定位瓶颈。",
  },
  {
    name: "数学",
    key: "Math",
    value: 4,
    detail:
      "线性代数与微积分基础扎实，能推导 Cook-Torrance 法线分布函数、预积分 LUT 的卷积与球谐投影。",
  },
  {
    name: "工具链",
    key: "Toolchain",
    value: 3,
    detail:
      "Unity 编辑器扩展、Git 与 C# 工具脚本，能用 Next.js / TypeScript 搭建博客与可视化辅助页面。",
  },
];

/** 项目时间线：前 3 项有对应文章，后 3 项 wip */
export const TIMELINE_ITEMS: TimelineItem[] = [
  {
    date: "2025-11",
    title: "自定义 PBR 与 Unity Lit 的差异拆解",
    tags: ["PBR", "BRDF", "URP"],
    summary:
      "记录从零写一套 PBR，并对比 Unity URP/Lit：为什么要改 BRDF、为什么要拆近场和远场光照。",
    href: "/blog/custom-pbr-vs-unity-lit/",
  },
  {
    date: "2025-11",
    title: "基于厚度图的皮肤 SSS：预积分 LUT 实战",
    tags: ["Skin", "SSS", "LUT"],
    summary:
      "从厚度图获取数据、生成 SSS kernel，再到 LUT 采样和屏幕空间模糊的完整流程示例。",
    href: "/blog/skin-sss-thickness-lut/",
  },
  {
    date: "2025-11",
    title: 'Kajiya-Kay & "类 Marschner" 头发高光',
    tags: ["Hair", "Kajiya-Kay", "Marschner"],
    summary:
      "为什么用两条 Kajiya 高光来近似 Marschner，多分支高光在头发体积感中的作用是什么。",
    href: "/blog/kajiya-kay-marschner-hair/",
  },
  {
    date: "2025-10",
    title: "Tequila Sunset 动态天空盒",
    tags: ["Skybox", "Atmosphere", "Volumetric Cloud"],
    summary:
      "仿《极乐迪斯科》的龙舌兰日落风格天空，带大气散射、日夜循环和体积云雾的尝试。",
    wip: true,
  },
  {
    date: "2025-09",
    title: "Inception 风格 Portal",
    tags: ["Portal", "RenderFeature", "Multi-Camera"],
    summary:
      "使用 URP ScriptableRendererFeature 实现的多相机 Portal，支持折射、边缘 FX 和多层嵌套。",
    wip: true,
  },
  {
    date: "2025-08",
    title: "水体 & 草地交互",
    tags: ["Water", "Grass", "Vertex Anim"],
    summary:
      "通过深度、法线与顶点动画实现风动草地和角色交互波纹，兼顾移动端性能优化。",
    wip: true,
  },
];

/** 联系方式：email 为占位，建议替换为真实邮箱 */
export const CONTACT: ContactInfo = {
  email: "yuyeyyy@yuyepage.pages.dev",
  github: "https://github.com/yuyeyyy",
  site: "https://yuyepage.pages.dev",
};

/** AboutHero 副标题：浓缩原 about 第一段 */
export const ABOUT_SUMMARY =
  "Unity 图形 / Shader 爱好者，偏技术美术 / 渲染工程方向。喜欢把看起来很玄学的效果拆成数学和代码，再一点点还原出来。这个站集中记录图形学基础、渲染管线笔记、URP 实战 Shader 与面试问答整理。";
