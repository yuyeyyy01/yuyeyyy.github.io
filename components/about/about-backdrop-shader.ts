/**
 * 关于页背景 shader ——复刻 Cargo `legacy/ripple` backdrop 的交互质感。
 *
 * 原站（leyangzhang.cargo.site）参数：
 *   direction: 352      → 底图漂移方向（度）
 *   target_speed: 6     → 漂移速度档位
 *   scale: 1.56         → 图案缩放
 *   mouse_sensitivity: 48 → 鼠标涟漪强度
 *
 * 原站是「一张位图 + 涟漪法线折射采样」。本站现在也有底图
 * （public/assets/about-bg.jpg），做法对齐原站：
 *   -采样前先做 cover-fit（按视口 aspect 裁切，图片不变形不留白）
 *   - 图案沿 352° 方向缓慢漂移（贴图 UV 平移，非旋转，模拟水面缓流）
 *   - 鼠标涟漪扰动采样 UV，等价水面折射
 *   - 深色主题在采样结果上叠一层暗角+ 轻微降饱和，浅色主题保持原图亮度
 *
 * 关于漂移为什么是"正弦往返"而不是线性无限漂移：
 * PATTERN_SCALE=1.56缩放后，纹理可视区留有约 0.179 的 UV 边距（纹理采样用
 * CLAMP_TO_EDGE）。若用 t*speed 线性漂移，18秒左右就会顶到边缘，之后边缘像素
 * 被拉伸出一道色斑，越跑越难看。改用长周期正弦振荡（振幅 0.14 < 边距 0.179，
 * 留0.03 余量给涟漪的瞬时扰动），周期 140 秒——一次完整来回要两分多钟，
 * 短时间内看和"匀速缓慢漂移"没有区别，但永远不会跑出安全区。
 *
 * 涟漪来源：JS 侧维护 8 个 ripple 槽位（位置 + 出生时间），
 * 每个槽位在 shader 内展开为一圈随时间外扩、按 exp 衰减的环形波，
 * 环形波梯度作为「法线」扰动采样 UV。
 */
export const ABOUT_BACKDROP_FRAG = `
// ---- 常量：与原站 backdropSettings 对齐 ----
const float DIRECTION      = 352.0;   // 漂移方向（度）
const float DRIFT_AMPLITUDE = 0.14;   //漂移振幅（纹理 UV 单位），留在 CLAMP 安全边距内
const float DRIFT_OMEGA    = 0.0449;  // 2π/140s —— 一次往返周期 140 秒
const float PATTERN_SCALE = 1.56; // scale —— 贴图在画面里的整体缩放
// mouse_sensitivity 48 —— 经数值标定后的实际系数。
// warp 已在 rippleField 内钳到 |g| <= 1，标定后典型位移落在纹理 UV 的 0.02~0.05，
// 足以产生可见的水面折射，且不会把图案撕成噪声。
const float MOUSE_SENS  = 0.045;

const int RIPPLE_COUNT = 8;
uniform vec3 uRipples[RIPPLE_COUNT]; // xy = 归一化位置(aspect 校正后), z = 出生时刻(秒)
uniform float uTheme;                // 1.0 = 深色, 0.0 = 浅色
uniform float uPointerFade;          // 指针在页面内 0→1 平滑淡入
uniform sampler2D uTex;              // 底图
uniform vec2 uTexSize;               // 底图原始像素尺寸（做cover-fit）
// 涟漪整体空间尺度：2.0 = 波前外扩速度、环宽都压缩到原来的一半，
// 视觉上就是"点击后涟漪影响范围缩小一半"。只改这一个数即可整体缩放，
// 不用逐个重新标定 front/env 系数。
const float RIPPLE_SCALE = 2.0;

// ---- 噪声基建（仅用于 dither 消色带，不再用于生成图案）----
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

/**
 * 涟漪场：返回 (height, warpX, warpY)。
 *
 * 每个槽位是一圈以 age 为半径外扩的环形波，振幅随 age 指数衰减。
 *
 * 关于 warp 的量级：波形的解析梯度里含链式法则因子 26.0（相位缩放），
 * 直接用会让梯度量级到 ~27，而屏幕坐标范围只有 ±0.5 ——
 * UV 会被甩飞成一团噪声。所以这里不输出真实梯度，
 * 而是输出「径向方向 × 波幅」：方向来自梯度符号，幅度来自 wave 本身（|wave| <= 1）。
 * 视觉上等价（折射方向一致），量级被钳在 O(1)，可控。
 */
vec3 rippleField(vec2 p, float t) {
  float h = 0.0;
  vec2 g = vec2(0.0);

  for (int i = 0; i < RIPPLE_COUNT; i++) {
    vec3 r = uRipples[i];
    float age = t - r.z;
    // 未使用槽位 (z <= 0) 或已衰减完的跳过
    if (r.z <= 0.0 || age < 0.0 || age > 2.6) continue;

    vec2 d = p - r.xy;
    float dist = length(d) + 1e-4;
    // RIPPLE_SCALE 放大"用于相位/半径判断的距离" = 等效缩小涟漪的空间尺度：
    // 同样的 age，波前 (age*0.42) 走过的距离在缩放后显得更短，
    // 即涟漪要传播到原来两倍的物理距离才能达到同样视觉半径 —— 影响范围减半。
    // 注意：方向归一化 (d/dist) 必须用未缩放的 dist，否则方向向量长度会跑偏。
    float scaledDist = dist * RIPPLE_SCALE;

    // 波前半径随时间外扩
    float front = age * 0.42;
    // 距波前的偏移 —— 决定当前点处于波的哪一相位
    float x = (scaledDist - front) * 26.0;
    // 高斯包络：只在波前附近有振幅
    float env = exp(-x * x * 0.06);
    // 时间衰减
    float decay = exp(-age * 1.9);
    // 环形波：sin 相位
    float wave = sin(x * 1.1) * env * decay;

    h += wave;

    // 折射方向：径向 × cos 相位符号（等于梯度方向），幅度用包络与衰减控制
    float slope = cos(x * 1.1) * env * decay;
    g += (d / dist) * slope;
  }

  // 多涟漪叠加后仍可能超出 1，做一次软钳位保证 warp 有界
  float gl = length(g);
  if (gl > 1.0) g /= gl;

  return vec3(h, g);
}

/**
 * cover-fit：把矩形贴图按「填满视口、不变形、居中裁切」的方式映射到 [0,1] UV。
 * 等价于 CSS background-size: cover。
 */
vec2 coverUV(vec2 screenUV, float screenAspect, vec2 texSize) {
  float texAspect = texSize.x / max(texSize.y, 1.0);
  vec2 scale;
  if (screenAspect > texAspect) {
    // 屏幕更宽：裁切贴图上下
    scale = vec2(1.0, texAspect / screenAspect);
  } else {
    // 屏幕更高（或更窄）：裁切贴图左右
    scale = vec2(screenAspect / texAspect, 1.0);
  }
  return (screenUV - 0.5) * scale + 0.5;
}

void main() {
  vec2 res = iResolution.xy;
  float aspect = res.x / max(res.y, 1.0);
  // aspect 校正坐标：给涟漪用，保证涟漪是圆形而非椭圆
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  float t = iTime;

  // ---- 底图漂移：沿 DIRECTION 方向正弦往返（140秒一次来回，见文件头注释）----
  float rad = radians(DIRECTION);
  vec2 driftDir = vec2(cos(rad), sin(rad));
  vec2 drift = driftDir * (sin(t * DRIFT_OMEGA) * DRIFT_AMPLITUDE);

  // ---- 涟漪：扰动采样 UV ----
  vec3 rip = rippleField(p, t);
  vec2 warp = rip.yz * MOUSE_SENS * uPointerFade;

  // ---- cover-fit 采样坐标 + PATTERN_SCALE 整体缩放 + 漂移 + 涟漪折射 ----
  vec2 texUV = coverUV(uv, aspect, uTexSize);
  // 以画面中心为锚点缩放，PATTERN_SCALE > 1 时贴图被放大（对齐原站 scale:1.56 的取景更紧）
  texUV = (texUV - 0.5) / PATTERN_SCALE + 0.5;
  texUV += drift + warp;

  vec3 texColor = texture(uTex, texUV).rgb;

  // 涟漪高度叠一点亮度 —— 波峰更亮，像被光扫过水面。
  // rip.x 是多个涟漪的裸叠加，最坏可到 ~7，先软压缩到 [-1,1] 再用。
  float ripH = rip.x / (1.0 + abs(rip.x));
  texColor += vec3(ripH) * 0.05 * uPointerFade;

  // ---- 深浅主题差异化处理 ----
  // 深色主题：整体压暗 + 轻微降饱和，让原图暖色不至于喧宾夺主
  float luma = dot(texColor, vec3(0.299, 0.587, 0.114));
  vec3 desat = mix(texColor, vec3(luma), 0.22);
  vec3 darkTreated = desat * 0.42;

  // 浅色主题：贴图基本保持原色，只轻微压一点对比避免过曝刺眼
  vec3 lightTreated = mix(vec3(luma) * 0.15 + texColor * 0.85, texColor, 0.7);

  vec3 col = mix(lightTreated, darkTreated, uTheme);

  // ---- 涟漪边缘的高光描边：让交互更可读 ----
  float rimStrength = abs(ripH);
  vec3 rimColor = mix(vec3(0.055, 0.549, 0.510), vec3(0.310, 0.824, 0.776), uTheme);
  col += rimColor * rimStrength * 0.10 * uPointerFade;

  // ---- 暗角：把注意力收回内容区 ----
  float vig = 1.0 - 0.28 * dot(p, p);
  col *= mix(mix(1.0, vig, 0.35), vig, uTheme);

  // 轻微 dither 消色带
  float dith = (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
  col += dith;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
