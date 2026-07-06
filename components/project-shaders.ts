/**
 * 首页「渲染实验」卡片的 mini shader 源码（GLSL ES 3.0）。
 * 每个 fragment 对应一个项目主题，动效都极克制（缓慢、不闪烁）。
 * uniform 约定：iTime, iResolution；宏 uv 已在 MiniShader prelude 提供。
 *
 * 配色统一用青绿 accent + 琥珀 accent-warm，与站点视觉系统一致，
 * 不引入额外色相避免廉价感。
 */

// Tequila 日落：地平线 + 缓慢下沉的太阳 + 大气散射渐变
export const SUNSET_FRAG = `
void main() {
  vec2 p = uv;
  // 太阳缓慢上下浮（不动 x，只轻微 y 呼吸），克制不闪
  float sunY = 0.55 + 0.02 * sin(iTime * 0.3);
  vec2 sunPos = vec2(0.5, sunY);
  float sun = smoothstep(0.05, 0.0, length(p - sunPos));
  // 大气渐变：暮蓝（顶）→ 紫 → 粉橘 → 琥珀（地平线）
  vec3 sky = mix(
    vec3(0.04, 0.06, 0.09),   // 暮蓝顶
    vec3(0.91, 0.69, 0.29),   // 琥珀地平线
    smoothstep(0.6, 0.2, p.y)
  );
  sky = mix(sky, vec3(0.78, 0.45, 0.55), smoothstep(0.55, 0.35, p.y) * 0.5);
  // 太阳本体：暖白核心 + 青绿外晕（accent 呼应）
  vec3 sunCol = mix(vec3(1.0, 0.95, 0.78), vec3(0.31, 0.82, 0.78), 1.0 - sun);
  sky += sunCol * sun * 0.9;
  // 地平线下渐黑
  sky *= smoothstep(0.0, 0.05, p.y + 0.0);
  fragColor = vec4(sky, 1.0);
}
`;

// Portal：椭圆环 + 缓慢旋转的漩涡纹 + 边缘 FX
export const PORTAL_FRAG = `
void main() {
  vec2 p = uv - 0.5;
  p.x *= 1.7; // 椭圆压扁
  float r = length(p);
  float ang = atan(p.y, p.x);
  // 漩涡：角度随半径旋转，缓慢时间扰动
  float swirl = ang + r * 6.0 - iTime * 0.4;
  float rings = 0.5 + 0.5 * sin(swirl * 4.0);
  // 环：只在 0.18..0.32 半径间显示
  float ring = smoothstep(0.32, 0.28, r) * smoothstep(0.18, 0.22, r);
  // 配色：深底 + 青绿漩涡纹 + 边缘琥珀
  vec3 base = vec3(0.04, 0.05, 0.06);
  vec3 swirlCol = mix(vec3(0.31, 0.82, 0.78), vec3(0.91, 0.69, 0.29), rings);
  vec3 col = mix(base, swirlCol, ring * (0.6 + 0.4 * rings));
  // 外圈细边
  col += vec3(0.31, 0.82, 0.78) * smoothstep(0.34, 0.33, r) * smoothstep(0.30, 0.31, r) * 1.5;
  fragColor = vec4(col, 1.0);
}
`;

// 水体 & 草地：水面波纹 + 缓慢起伏
export const WATER_FRAG = `
// 简化 value-noise：缓波纹
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
void main() {
  vec2 p = uv;
  // 缓慢移动的波纹场
  float n = noise(p * 6.0 + vec2(iTime * 0.15, 0.0));
  n += 0.5 * noise(p * 12.0 - vec2(0.0, iTime * 0.2));
  n = n / 1.5;
  // 水面配色：深青绿 → 浅青绿高光，与 accent 同色相
  vec3 deep = vec3(0.03, 0.08, 0.09);
  vec3 shallow = vec3(0.31, 0.82, 0.78);
  vec3 col = mix(deep, shallow, smoothstep(0.4, 0.7, n));
  // 顶部一道琥珀反光（像夕阳水面反射）
  col = mix(col, vec3(0.91, 0.69, 0.29), smoothstep(0.85, 1.0, p.y) * 0.4);
  fragColor = vec4(col, 1.0);
}
`;
