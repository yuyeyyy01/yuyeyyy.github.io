/**
 * 首页 Hero 全屏体积云 fragment shader（GLSL ES 3.0）。
 *
 * uniform 约定（由 HeroShader.tsx 的 FRAG_PRELUDE 提供）：
 *   iTime      —— 秒，缓慢漂流用
 *   iResolution—— 画布像素尺寸
 *   iMouse     —— vec2，鼠标归一化 0-1（左下原点），作光源方向
 *   uv         —— 宏，= gl_FragCoord.xy / iResolution.xy
 *   fragColor  —— out vec4
 *
 * 视觉：深空底 + 缓慢漂流的体积云，云体青绿散射，薄边缘琥珀透射。
 * 动效克制缓慢，不闪烁。
 */
export const HERO_FRAG = `
// ---- 3D hash ----
float hash31(vec3 p) {
  p = fract(p * vec3(0.3183099, 0.3678794, 0.2390678));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// ---- 3D value noise ----
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

// ---- 5 层 fbm ----
float fbm5(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p = p * 2.02 + vec3(1.7, 9.1, 3.3);
    a *= 0.5;
  }
  return v;
}

// ---- 云密度场 ----
float cloudDensity(vec3 p) {
  // 缓慢漂流：y/z 方向慢速平移，克制不闪
  p += vec3(0.0, iTime * 0.022, iTime * 0.016);
  float n = fbm5(p * 1.25);
  // 形状裁剪：让云在中段聚集，上下渐稀
  return smoothstep(0.42, 0.78, n);
}

// ---- 朝光源方向采样光学深度（散射衰减用）----
// 3 步够了（原 5 步视觉无差，省 40% fbm 调用）
float lightOpticalDepth(vec3 p, vec3 lightDir) {
  float depth = 0.0;
  vec3 lp = p;
  for (int j = 0; j < 3; j++) {
    lp += lightDir * 0.15;
    depth += cloudDensity(lp);
  }
  return depth;
}

void main() {
  // 深空底
  vec3 base = vec3(0.02, 0.025, 0.03);

  // 光源方向：鼠标归一化 0-1（左下原点）映射到方向
  // 鼠标 x 控制水平方向，y 控制光高度（默认偏上）
  vec3 lightDir = normalize(vec3(
    (iMouse.x - 0.5) * 1.6,
    max((iMouse.y - 0.5) * 1.2, 0.05),
    0.7
  ));

  // ray setup：相机在原点看 +z
  vec2 p = uv * 2.0 - 1.0;
  p.x *= iResolution.x / iResolution.y;
  vec3 ro = vec3(0.0, 0.0, -2.5);
  vec3 rd = normalize(vec3(p, 1.6));

  // raymarch 体积云
  float t = 0.05;
  float transmittance = 1.0;
  vec3 cloudCol = vec3(0.0);

  for (int i = 0; i < 64; i++) {
    vec3 pos = ro + rd * t;
    float d = cloudDensity(pos);
    if (d > 0.001) {
      // 朝光源的光学深度
      float lod = lightOpticalDepth(pos, lightDir);
      // 透射到该点的光量（Beer-Lambert）
      float lightTrans = exp(-lod * 0.9);
      // 散射贡献
      float scatter = lightTrans * d;
      // 颜色：薄边缘（光穿透多）偏琥珀——轮廓透射；云体偏青绿散射
      vec3 tint = mix(
        vec3(0.91, 0.69, 0.29),   // 琥珀（边缘前向透射）
        vec3(0.31, 0.82, 0.78),   // 青绿（云体散射）
        smoothstep(0.35, 0.7, d)
      );
      cloudCol += tint * scatter * transmittance * 0.55;
      transmittance *= exp(-d * 0.45);
    }
    t += 0.065;
    if (transmittance < 0.01) break;
  }

  // 合成：深空底 + 云
  vec3 col = base + cloudCol;
  // 顶部渐隐回深空（避免上边缘硬切）
  col = mix(col, base, smoothstep(0.75, 1.0, uv.y) * 0.5);
  // 底部稍暗，融入页面背景
  col = mix(col, base * 0.7, smoothstep(0.25, 0.0, uv.y) * 0.4);

  fragColor = vec4(col, 1.0);
}
`;
