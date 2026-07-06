/**
 * webgl-demos：vanilla WebGL2 全屏 triangle 渲染器配套的 shader 集合。
 *
 * 设计纪律：
 * - fragment 从 shader-playground-presets.ts 原样复用，保证视觉一致。
 * - shader-demo 例外：改写为 ES3.0 风格（依赖 prelude 的 uv 宏 + fragColor）。
 * - uniform 约定：iTime / iResolution 由渲染器 prelude 声明；用户自定义 uniform 在 fragment 内声明，
 *   名字与 UniformDef.name 一致。
 *
 * 所有代码与注释使用简体中文。
 */

export interface UniformDef {
  name: string;
  label?: string;
  kind: "float" | "color";
  min?: number;
  max?: number;
  step?: number;
  default: number | [number, number, number];
}

export interface DemoDef {
  fragment: string;
  uniforms: UniformDef[];
  label: string;
}

// shader-demo：默认 UV 渐变。
// ES3.0 风格：uv 由 prelude 宏提供，fragColor 由 prelude 声明。
const SHADER_DEMO_FRAG = `
void main() {
  vec3 col = vec3(uv.x, uv.y, 0.5 + 0.5 * sin((uv.x + uv.y) * 3.14159));
  fragColor = vec4(col, 1.0);
}
`;

// PBR 球：roughness / metallic 滑块，呼应 custom-pbr-vs-unity-lit.mdx
// 用 2D 假球（normalize 法线），展示金属高光形态随 roughness/metallic 变化
const PBR_FRAG = `
uniform float uRoughness;
uniform float uMetallic;
void main() {
  vec2 p = uv - 0.5;
  p.x *= 1.5;
  float r2 = dot(p, p);
  if (r2 > 0.25) { fragColor = vec4(0.04, 0.05, 0.06, 1.0); return; }
  vec3 n = normalize(vec3(p, sqrt(0.25 - r2)));
  vec3 l = normalize(vec3(0.6, 0.7, 0.5));
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 h = normalize(l + v);
  float ndl = max(dot(n, l), 0.0);
  float ndh = max(dot(n, h), 0.0);
  float vdh = max(dot(v, h), 0.0);
  vec3 albedo = mix(vec3(0.31, 0.82, 0.78), vec3(0.04), uMetallic);
  vec3 F0 = mix(vec3(0.04), albedo, uMetallic);
  float a = uRoughness * uRoughness;
  float a2 = a * a;
  float d = (ndh * a2 - ndh) * ndh + 1.0;
  float D = a2 / max(3.14159 * d * d, 1e-7);
  float F = F0.r + (1.0 - F0.r) * pow(1.0 - vdh, 5.0);
  float spec = D * F * ndl;
  vec3 kd = vec3((1.0 - F) * (1.0 - uMetallic));
  vec3 col = albedo * kd * ndl + vec3(0.91, 0.69, 0.29) * spec;
  col += albedo * 0.08;
  fragColor = vec4(col, 1.0);
}
`;

const PBR_UNIFORMS: UniformDef[] = [
  { name: "uRoughness", label: "粗糙度", kind: "float", min: 0.02, max: 1, step: 0.01, default: 0.4 },
  { name: "uMetallic", label: "金属度", kind: "float", min: 0, max: 1, step: 0.01, default: 0 },
];

// SSS 厚度：thickness / tint 滑块，呼应 skin-sss-thickness-lut.mdx
// 中心厚边缘薄，背光透出次表面颜色
const SSS_FRAG = `
uniform float uThickness;
uniform vec3 uTint;
void main() {
  vec2 p = uv - 0.5;
  float r = length(p);
  float thickness = smoothstep(0.5, 0.0, r) * uThickness;
  vec3 l = normalize(vec3(-0.5, -0.3, 0.6));
  vec3 n = normalize(vec3(p, sqrt(max(0.0, 0.25 - dot(p,p)))));
  float backLight = max(dot(-n, l), 0.0);
  vec3 sss = uTint * thickness * backLight * 1.8;
  float front = max(dot(n, l), 0.0);
  vec3 surface = mix(vec3(0.91, 0.69, 0.29), vec3(0.31, 0.82, 0.78), front) * 0.4;
  vec3 col = surface + sss;
  fragColor = vec4(col, 1.0);
}
`;

const SSS_UNIFORMS: UniformDef[] = [
  { name: "uThickness", label: "厚度", kind: "float", min: 0, max: 1, step: 0.01, default: 0.6 },
  { name: "uTint", label: "透射色", kind: "color", default: [0.9, 0.3, 0.3] },
];

// Hair Kajiya-Kay：shift 滑块控制高光偏移，呼应 kajiya-kay-marschner-hair.mdx
const HAIR_FRAG = `
uniform float uShift;
void main() {
  vec2 p = uv;
  float ang = 0.5 + 0.3 * sin(p.x * 6.28318 + iTime * 0.2);
  vec3 t = normalize(vec3(cos(ang), sin(ang), 0.3));
  vec3 n = vec3(0.0, 0.0, 1.0);
  vec3 l = normalize(vec3(0.4, 0.3, 0.8));
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 h = normalize(l + v);
  float sinTH = dot(t, h);
  float spec = pow(sinTH * sinTH, uShift);
  float diff = max(dot(n, l), 0.0);
  vec3 base = vec3(0.04, 0.05, 0.06);
  vec3 col = base * diff * 0.6 + vec3(0.31, 0.82, 0.78) * spec;
  fragColor = vec4(col, 1.0);
}
`;

const HAIR_UNIFORMS: UniformDef[] = [
  { name: "uShift", label: "高光偏移", kind: "float", min: 1, max: 32, step: 0.5, default: 8 },
];

export const DEMOS: Record<string, DemoDef> = {
  "shader-demo": { fragment: SHADER_DEMO_FRAG, uniforms: [], label: "shader" },
  pbr: { fragment: PBR_FRAG, uniforms: PBR_UNIFORMS, label: "pbr" },
  sss: { fragment: SSS_FRAG, uniforms: SSS_UNIFORMS, label: "sss" },
  hair: { fragment: HAIR_FRAG, uniforms: HAIR_UNIFORMS, label: "hair" },
};
