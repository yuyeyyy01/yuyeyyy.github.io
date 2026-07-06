import type { LabDemo } from "../types";

/**
 * 体积云 —— raymarch 穿过 fbm 云密度场。
 * 灵感来自 Shadertoy「Raymarched Volumetric Clouds」by bigwings（https://www.shadertoy.com/view/wlsSRN），
 * 用其公开算法思路（fbm 密度场 + 沿射线累加散射 + transmittance 衰减）重写适配本项目。
 * 配色：青绿云本体 + 琥珀边缘透光（薄云前向透射） + 深青绿→琥珀地平线天空。
 * mesh: fullscreen。
 */
export const volumetricClouds: LabDemo = {
  slug: "volumetric-clouds",
  title: "体积云",
  description:
    "raymarch 穿过 fbm 云密度场，云本体青绿、薄云边缘前向透射偏琥珀，天空随太阳高度从深青绿渐变到琥珀地平线。灵感来自 Shadertoy「Raymarched Volumetric Clouds」by bigwings。",
  difficulty: "advanced",
  mesh: "fullscreen",
  uniforms: [
    { name: "u_cloudCoverage", label: "云量", kind: "float", min: 0, max: 1, step: 0.01, default: 0.55 },
    { name: "u_windSpeed", label: "风速", kind: "float", min: 0, max: 2, step: 0.01, default: 0.5 },
    { name: "u_sunHeight", label: "太阳高度", kind: "float", min: -0.2, max: 0.8, step: 0.01, default: 0.25 },
  ],
  defaults: { u_cloudCoverage: 0.55, u_windSpeed: 0.5, u_sunHeight: 0.25 },
  presets: {
    晴天: { u_cloudCoverage: 0.2, u_windSpeed: 0.6, u_sunHeight: 0.5 },
    阴天: { u_cloudCoverage: 0.9, u_windSpeed: 1.0, u_sunHeight: 0.15 },
    日落: { u_cloudCoverage: 0.55, u_windSpeed: 0.4, u_sunHeight: -0.1 },
  },
  notes: [
    "fbm 5 层 value noise 构造云团多尺度结构，风漂流偏移采样坐标",
    "沿射线累加云散射 + transmittance 指数衰减实现体积吸收",
    "薄云边缘前向透射（视线朝太阳时）偏琥珀，厚云本体青绿，模拟 beer's law 透光",
    "天空：深青绿顶 → 琥珀地平线，太阳越低地平线琥珀越强（日落因子）",
  ],
  fragment: `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float u_cloudCoverage;
uniform float u_windSpeed;
uniform float u_sunHeight;

out vec4 fragColor;

#define uv (gl_FragCoord.xy / iResolution.xy)

// ---- value noise 基础 hash ----
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

// 5 层 fbm value noise：构造云团多尺度结构（大尺度形状 + 小尺度细节）
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// 云密度场：云层集中在 y∈[2,4] 高空带，受风漂流
// u_cloudCoverage 越大阈值越低 → 云越多
float cloudDensity(vec3 p) {
  float heightMask = smoothstep(2.0, 2.6, p.y) * smoothstep(4.0, 3.2, p.y);
  vec3 wind = vec3(iTime * u_windSpeed * 0.25, iTime * u_windSpeed * 0.04, 0.0);
  float n = fbm(p * 0.7 + wind);
  float threshold = 1.0 - u_cloudCoverage * 1.1;
  float d = smoothstep(threshold, threshold + 0.18, n) * heightMask;
  return d;
}

void main() {
  vec2 p = uv * 2.0 - 1.0;
  p.x *= iResolution.x / iResolution.y;

  // 相机在地面，视线略仰视看云层
  vec3 ro = vec3(0.0, 0.0, 0.0);
  vec3 rd = normalize(vec3(p.x * 0.7, p.y * 0.8, -1.0));

  vec3 sunDir = normalize(vec3(0.5, u_sunHeight, -0.4));

  // ---- 天空：深青绿顶 → 琥珀地平线，太阳越低地平线琥珀越强 ----
  float upFactor = clamp(rd.y, 0.0, 1.0);
  float horizonFactor = clamp(1.0 - abs(rd.y) * 2.2, 0.0, 1.0);
  // 日落因子：太阳低时为 1（强琥珀），太阳高时为 0
  float sunsetFactor = 1.0 - smoothstep(-0.2, 0.6, u_sunHeight);

  vec3 deepSky = vec3(0.02, 0.025, 0.03);
  vec3 tealSky = vec3(0.31, 0.82, 0.78);
  vec3 amber = vec3(0.91, 0.69, 0.29);

  vec3 sky = mix(deepSky, tealSky, pow(upFactor, 0.5));
  sky = mix(sky, amber, horizonFactor * (0.3 + 0.7 * sunsetFactor));
  // 视线朝下时回到深底
  sky = mix(sky, deepSky, smoothstep(0.0, -0.3, rd.y));

  // ---- raymarch 体积云：沿射线累加散射 + transmittance 衰减 ----
  vec3 cloudCol = vec3(0.0);
  float trans = 1.0;
  float t = 0.2;
  float stepSize = 0.15;

  for (int i = 0; i < RAYMARCH_STEPS; i++) {
    vec3 pos = ro + rd * t;
    float d = cloudDensity(pos);
    if (d > 0.001) {
      // 云本体青绿（偏暗，受云顶照亮）
      vec3 body = vec3(0.31, 0.82, 0.78) * 0.35;
      // 薄云边缘前向透射偏琥珀：视线越朝太阳、云越薄 → 越偏琥珀
      float thin = clamp(1.0 - d * 2.2, 0.0, 1.0);
      float sunFacing = max(dot(rd, sunDir), 0.0);
      float forward = pow(sunFacing, 3.0);
      vec3 edgeGlow = vec3(0.91, 0.69, 0.29) * (0.25 + 0.75 * forward);
      vec3 c = mix(body, edgeGlow, thin);
      // 云顶被太阳照亮（太阳高时云顶亮，太阳低时整体偏暗）
      float topLit = clamp(dot(sunDir, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5, 0.0, 1.0);
      c *= 0.55 + 0.45 * topLit;

      cloudCol += c * d * trans * 0.18;
      trans *= exp(-d * 0.55);
    }
    t += stepSize;
    if (trans < 0.02) break;
  }

  // 合成：云散射 + 透射天空
  vec3 col = cloudCol + sky * trans;

  // tonemap + gamma
  col = col / (col + 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`,
  // 列表卡片用的精简预览（硬编码 32 步、固定参数，给 MiniShader 首帧渲染）
  miniFragment: `float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1.0,0.0,0.0)),f.x),mix(hash(i+vec3(0.0,1.0,0.0)),hash(i+vec3(1.0,1.0,0.0)),f.x),f.y),
             mix(mix(hash(i+vec3(0.0,0.0,1.0)),hash(i+vec3(1.0,0.0,1.0)),f.x),mix(hash(i+vec3(0.0,1.0,1.0)),hash(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
float cloudD(vec3 p){
  float hm=smoothstep(2.0,2.6,p.y)*smoothstep(4.0,3.2,p.y);
  vec3 w=vec3(iTime*0.15,iTime*0.025,0.0);
  float n=fbm(p*0.7+w);
  return smoothstep(0.4,0.58,n)*hm;
}
void main(){
  vec2 p=uv*2.0-1.0;p.x*=iResolution.x/iResolution.y;
  vec3 rd=normalize(vec3(p.x*0.7,p.y*0.8,-1.0));
  vec3 sunDir=normalize(vec3(0.5,0.25,-0.4));
  float up=clamp(rd.y,0.0,1.0),hz=clamp(1.0-abs(rd.y)*2.2,0.0,1.0);
  vec3 sky=mix(vec3(0.02,0.025,0.03),vec3(0.31,0.82,0.78),pow(up,0.5));
  sky=mix(sky,vec3(0.91,0.69,0.29),hz*0.45);
  sky=mix(sky,vec3(0.02,0.025,0.03),smoothstep(0.0,-0.3,rd.y));
  vec3 cc=vec3(0.0);float tr=1.0,t=0.2;
  for(int i=0;i<32;i++){
    vec3 pos=rd*t;float d=cloudD(pos);
    if(d>0.001){
      float th=clamp(1.0-d*2.2,0.0,1.0),sf=max(dot(rd,sunDir),0.0),fw=pow(sf,3.0);
      vec3 c=mix(vec3(0.31,0.82,0.78)*0.35,vec3(0.91,0.69,0.29)*(0.25+0.75*fw),th);
      c*=0.6;cc+=c*d*tr*0.18;tr*=exp(-d*0.55);
    }
    t+=0.15;if(tr<0.02)break;
  }
  vec3 col=cc+sky*tr;
  col=col/(col+1.0);col=pow(col,vec3(1.0/2.2));
  fragColor=vec4(col,1.0);
}`,
};
