/**
 * 渲染术语速查 —— GLOSSARY
 *
 * 面向实时渲染核心概念的精简卡片数据。每条卡片：术语名 + 数学符号 +
 * 一句话定义 + 2-3 句中文解释 + 可选 LaTeX 公式 + 可选关联文章 tag。
 *
 * 设计取舍：
 * - symbol 用 Unicode 数学符号 + 紧凑 ASCII，不强依赖 KaTeX 渲染（保持轻量）。
 * - formula 是 KaTeX 源码字符串，前端先用 mono 原样显示；后续要渲染再引 katex。
 * - relatedTag 与文章 tag 对齐（PBR / SSS / Hair），便于交叉引用。
 */

export interface GlossaryItem {
  /** 术语名（英文，作为卡片标题，mono 字体） */
  term: string;
  /** 数学符号，如 D(h)、F(v,h)。可选，部分概念无标准符号 */
  symbol?: string;
  /** 一句话定义（宋体，卡片可见态显示） */
  short: string;
  /** 2-3 句中文解释，点击展开后显示 */
  detail: string;
  /** KaTeX 源码字符串，可选。前端先用 mono 原样显示，避免引入 katex 依赖 */
  formula?: string;
  /** 关联文章 tag，如 PBR / SSS / Hair。可选 */
  relatedTag?: string;
}

export const GLOSSARY: GlossaryItem[] = [
  {
    term: "BRDF",
    symbol: "f_r(ω_i, ω_o)",
    short: "双向反射分布函数，描述入射光如何反射到出射方向。",
    detail:
      "BRDF 定义单位立体角辐照到单位面积辐出的比例，是整个 PBR 的核心。物理正确的 BRDF 必须满足能量守恒、亥姆霍兹互易律和非负性，否则材质在不同光照下会失衡。",
    formula: "f_r(\\omega_i, \\omega_o) = \\frac{dL_o}{dE_i}",
    relatedTag: "PBR",
  },
  {
    term: "GGX (Trowbridge-Reitz)",
    symbol: "D(h)",
    short: "微表面法线分布函数，决定高光的核心形状。",
    detail:
      "GGX 是目前最主流的微表面法线分布函数。相比 Beckmann，它的尾部更长，能产生更锐利的高光核心与更柔和的外围过渡，更贴近真实金属与粗糙材质的观测表现。",
    formula:
      "D(\\mathbf{h}) = \\frac{\\alpha^2}{\\pi \\left((\\mathbf{n}\\cdot\\mathbf{h})^2 (\\alpha^2-1)+1\\right)^2}",
    relatedTag: "PBR",
  },
  {
    term: "Fresnel (Schlick)",
    symbol: "F(v, h)",
    short: "反射率随观察角度变化的廉价近似。",
    detail:
      "Schlick 近似用菲涅尔反射率 F0 与视线-半程向量夹角计算反射率。掠射角时反射趋近 1，这就是金属边缘高光（rim light）的来源。F0 由材质 IOR 决定。",
    formula: "F(\\mathbf{v},\\mathbf{h}) = F_0 + (1-F_0)(1-\\mathbf{v}\\cdot\\mathbf{h})^5",
    relatedTag: "PBR",
  },
  {
    term: "SSS (次表面散射)",
    symbol: "S(x_i, ω_i; x_o, ω_o)",
    short: "光穿透材质内部多次散射后从另一处射出。",
    detail:
      "次表面散射描述光进入半透明材质（皮肤、玉石、蜡）后，在内部多次散射再从邻近点射出的现象。它是皮肤真实感的关键，忽略 SSS 会让人物看起来像塑料假人。",
    relatedTag: "SSS",
  },
  {
    term: "IBL (环境光)",
    symbol: "L_env(ω)",
    short: "用环境贴图替代显式光源计算间接光照。",
    detail:
      "Image-Based Lighting 用预滤波环境贴图（PMREM）近似无穷远的环境光照，让 PBR 材质在任何场景下都能获得自然的反射与漫反射，无需手动放置补光。 Split-sum 把积分拆为预滤波卷积 + BRDF LUT 两步离线烘焙。",
    formula:
      "\\int_{\\Omega} L_{env}(\\omega)\\, f_r(\\omega_i,\\omega_o)\\, \\cos\\theta\\, d\\omega_i",
    relatedTag: "PBR",
  },
  {
    term: "Normal Mapping",
    symbol: "n_pixel",
    short: "用纹理扰动法线，在低模上伪造表面细节。",
    detail:
      "法线贴图存储切线空间下的扰动法线，着色时替换几何法线，能在低模上模拟高模的凹凸细节。比位移贴图廉价，但侧视角会“露馅”——凹凸不改变 silhouette。",
    relatedTag: "PBR",
  },
  {
    term: "Ambient Occlusion",
    symbol: "A_o(p)",
    short: "表面某点被周围几何遮蔽的程度。",
    detail:
      "AO 量化表面某点接收环境光的可达性，褶皱、接缝、角落处增强，让几何关系更清晰。SSAO 是实时近似（屏幕空间），烘焙 AO 用于静态场景，精度更高。",
    formula:
      "A_o(p) = \\frac{1}{\\pi} \\int_{\\Omega} V(p,\\omega)\\,(\\mathbf{n}\\cdot\\omega)\\, d\\omega",
    relatedTag: "PBR",
  },
  {
    term: "Tone Mapping (Reinhard)",
    symbol: "T(L)",
    short: "把 HDR 线性亮度映射到显示器可显示范围。",
    detail:
      "Reinhard 是最简单的全局色调映射，用 L/(1+L) 把 HDR 压缩到 [0,1]。ACES 更符合电影风格，但 Reinhard 计算便宜，是入门 HDR 管线的首选。",
    formula: "T(L) = \\frac{L}{1+L}",
    relatedTag: "PBR",
  },
  {
    term: "Physically Based Rendering",
    symbol: "—",
    short: "基于物理定律的渲染范式。",
    detail:
      "PBR 用真实物理量（辐照度、BRDF、能量守恒）驱动着色，让材质在不同光照下表现一致。核心三件套：法线分布 D、几何遮蔽 G、菲涅尔 F，三者相乘构成 Cook-Torrance 镜面项。",
    relatedTag: "PBR",
  },
  {
    term: "Microfacet",
    symbol: "D · G · F",
    short: "把粗糙表面建模为大量朝向随机的微小镜面。",
    detail:
      "微表面模型假设粗糙表面由无数微小镜面组成，统计这些微面的法线分布 D、几何遮蔽 G 与菲涅尔 F，乘起来就是 Cook-Torrance BRDF。粗糙度 α 控制微面朝向分散程度。",
    formula:
      "f_r = \\frac{D\\,G\\,F}{4\\,(\\mathbf{n}\\cdot\\mathbf{l})(\\mathbf{n}\\cdot\\mathbf{v})}",
    relatedTag: "PBR",
  },
  {
    term: "Energy Conservation",
    symbol: "∫ f_r cosθ dω ≤ 1",
    short: "反射光能量不能超过入射光能量。",
    detail:
      "能量守恒要求 BRDF 在半球积分后反射的总能量不超过入射能量。粗糙金属的镜面反射 + 漫反射比例由金属度参数控制——这是 PBR 与传统 Blinn-Phong 的核心区别。",
    relatedTag: "PBR",
  },
  {
    term: "Kajiya-Kay",
    symbol: "—",
    short: "经典头发高光模型，把发丝近似为切向圆柱。",
    detail:
      "Kajiya-Kay 把头发近似为切线方向的圆柱，用 Phong 式余弦项产生沿发丝方向的高光条。它不物理正确（缺乏偏移与穿透），但实现简单，至今仍是实时头发的基线。",
    relatedTag: "Hair",
  },
  {
    term: "Marschner",
    symbol: "—",
    short: "基于光纤测量的物理头发模型。",
    detail:
      "Marschner 用三次散射模型（R、TT、TRT）描述光在头发中的传播，能产生偏移的高光、穿透光与内部反射。它是头发渲染的黄金标准，Kajiya-Kay 是其廉价近似。",
    relatedTag: "Hair",
  },
  {
    term: "Henyey-Greenstein",
    symbol: "p(θ)",
    short: "描述参与介质中光的散射相位。",
    detail:
      "HG 相位函数用不对称因子 g 控制散射前后倾向：g>0 前向散射（雾、烟），g<0 后向散射（红血球）。它是体积渲染与 SSS 散射核的标准工具。",
    formula:
      "p(\\theta) = \\frac{1-g^2}{4\\pi\\,(1+g^2-2g\\cos\\theta)^{3/2}}",
    relatedTag: "SSS",
  },
  {
    term: "Raymarching",
    symbol: "p(t) = o + t·d",
    short: "沿射线逐步前进求交点。",
    detail:
      "Raymarching 沿视线方向按步长推进，每步采样场函数判断是否命中。它不依赖几何光栅化，是体积云、SDF 渲染、距离场软阴影的标准工具。Sphere tracing 是其加速变体。",
    relatedTag: "PBR",
  },
  {
    term: "SDF (Signed Distance Field)",
    symbol: "d(p)",
    short: "标量场，空间点到表面的有符号距离。",
    detail:
      "SDF 在空间中存储到最近表面的有符号距离（内部为负、外部为正），可用于平滑布尔运算、抗锯齿、字体渲染与 Raymarching 求交。CSG 组合只需 min/max/smooth-min。",
    formula: "|\\nabla d| = 1",
    relatedTag: "PBR",
  },
];
