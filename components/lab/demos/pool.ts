import type { LabDemo } from "../types";

/**
 * 水池反射 —— 上半屏程序化场景（天空渐变 + 浮球 SDF），下半屏水面 fbm 波纹法线扰动 + Fresnel 反射。
 * 灵感来自 Shadertoy 水池/反射类 demo，自写。
 * 配色：青绿天空/水底 + 琥珀地平线/高光 + 深底。mesh: fullscreen。
 */
export const pool: LabDemo = {
  slug: "pool",
  title: "水池反射",
  description:
    "水面 fbm 波纹法线扰动 + Fresnel 反射上半屏程序化场景（天空渐变 + 浮球 SDF），平视角反射强、俯视见深青绿水底。",
  difficulty: "intermediate",
  mesh: "fullscreen",
  uniforms: [
    { name: "u_roughness", label: "粗糙度", kind: "float", min: 0, max: 1, step: 0.01, default: 0.15 },
    { name: "u_waveAmp", label: "波纹振幅", kind: "float", min: 0, max: 0.05, step: 0.001, default: 0.015 },
    { name: "u_reflectIntensity", label: "反射强度", kind: "float", min: 0, max: 2, step: 0.01, default: 1.0 },
  ],
  defaults: { u_roughness: 0.15, u_waveAmp: 0.015, u_reflectIntensity: 1.0 },
  presets: {
    镜面: { u_roughness: 0.02, u_waveAmp: 0.0, u_reflectIntensity: 1.5 },
    涟漪: { u_roughness: 0.3, u_waveAmp: 0.025, u_reflectIntensity: 1.0 },
    深水: { u_roughness: 0.08, u_waveAmp: 0.005, u_reflectIntensity: 0.6 },
  },
  notes: [
    "RAYMARCH_STEPS 步 raymarch 水面（fbm 波纹高度场），命中后差分求法线",
    "反射向量直接映射采样上半屏 sceneColor（天空 + 浮球），不再 raymarch 反射，性能好",
    "Fresnel (1-NdotV)^3 控制反射强度，俯视见深青绿水底，平视角反射强",
  ],
  fragment: `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float u_roughness;
uniform float u_waveAmp;
uniform float u_reflectIntensity;

out vec4 fragColor;

#define uv (gl_FragCoord.xy / iResolution.xy)

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// 水面高度场：fbm 双层叠加，缓慢流动
float waveHeight(vec2 p) {
  float h = fbm(p * 3.0 + vec2(iTime * 0.15, 0.0)) - 0.5;
  h += (fbm(p * 6.0 - vec2(0.0, iTime * 0.1)) - 0.5) * 0.5;
  return h * u_waveAmp;
}

vec3 waveNormal(vec2 p) {
  vec2 e = vec2(0.02, 0.0);
  float hL = waveHeight(p - e.xy);
  float hR = waveHeight(p + e.xy);
  float hD = waveHeight(p - e.yx);
  float hU = waveHeight(p + e.yx);
  return normalize(vec3(hL - hR, 2.0, hD - hU));
}

// 浮球着色：从 2D 屏幕偏移重建 3D 球法线， Lambert + Blinn 高光
vec3 ballShade(vec2 d, float r) {
  float dd = dot(d, d);
  vec3 bn = normalize(vec3(d.x, sqrt(max(r * r - dd, 0.0)), -d.y));
  vec3 light = normalize(vec3(0.4, 0.6, -0.5));
  float ndl = max(dot(bn, light), 0.0);
  vec3 base = mix(vec3(0.31, 0.82, 0.78), vec3(0.91, 0.69, 0.29), pow(ndl, 6.0) * 0.4);
  vec3 hh = normalize(light + vec3(0.0, 0.0, 1.0));
  base += vec3(0.91, 0.69, 0.29) * pow(max(dot(bn, hh), 0.0), 32.0) * 0.5;
  // 边缘暗化（球轮廓深底过渡）
  base *= mix(0.55, 1.0, smoothstep(0.0, r * r * 0.7, dd));
  return base;
}

// 上半屏程序化场景：天空渐变 + 3 个浮球（2D 投影 + 3D 着色，缓慢上下浮动）
vec3 sceneColor(vec2 s) {
  float aspect = iResolution.x / iResolution.y;
  // 天空：地平线琥珀，高处青绿，顶部深底
  float sh = clamp((s.y - 0.5) * 2.0, 0.0, 1.0);
  vec3 sky = mix(vec3(0.91, 0.69, 0.29), vec3(0.31, 0.82, 0.78), smoothstep(0.0, 0.6, sh));
  sky = mix(sky, vec3(0.02, 0.025, 0.03), smoothstep(0.85, 1.0, sh) * 0.4);
  vec3 col = sky;

  // 浮球 1
  vec2 c1 = vec2(0.30, 0.78 + sin(iTime * 0.35) * 0.04);
  float r1 = 0.11;
  vec2 d1 = (s - c1) * vec2(aspect, 1.0);
  col = mix(col, ballShade(d1, r1), smoothstep(r1 * r1 + 0.0008, r1 * r1 - 0.0008, dot(d1, d1)));

  // 浮球 2
  vec2 c2 = vec2(0.58 + sin(iTime * 0.22 + 1.3) * 0.05, 0.82 + cos(iTime * 0.28) * 0.03);
  float r2 = 0.08;
  vec2 d2 = (s - c2) * vec2(aspect, 1.0);
  col = mix(col, ballShade(d2, r2), smoothstep(r2 * r2 + 0.0008, r2 * r2 - 0.0008, dot(d2, d2)));

  // 浮球 3
  vec2 c3 = vec2(0.78 + sin(iTime * 0.18 + 2.7) * 0.04, 0.74 + sin(iTime * 0.31 + 1.0) * 0.04);
  float r3 = 0.09;
  vec2 d3 = (s - c3) * vec2(aspect, 1.0);
  col = mix(col, ballShade(d3, r3), smoothstep(r3 * r3 + 0.0008, r3 * r3 - 0.0008, dot(d3, d3)));

  return col;
}

void main() {
  float aspect = iResolution.x / iResolution.y;
  vec2 uv2 = uv * 2.0 - 1.0;
  uv2.x *= aspect;

  vec3 col;
  if (uv.y > 0.5) {
    // 上半屏：直接画程序化场景
    col = sceneColor(uv);
  } else {
    // 下半屏：水面 raymarch
    vec3 ro = vec3(0.0, 0.4, -2.5);
    vec3 rd = normalize(vec3(uv2, 1.5));

    float t = 0.0;
    bool hit = false;
    vec3 hitPos = vec3(0.0);
    if (rd.y < 0.0) {
      for (int i = 0; i < RAYMARCH_STEPS; i++) {
        vec3 p = ro + rd * t;
        float h = waveHeight(p.xz);
        if (p.y < h) { hit = true; hitPos = p; break; }
        t += 0.06;
        if (t > 20.0) break;
      }
    }

    if (hit) {
      vec3 n = waveNormal(hitPos.xz);
      vec3 v = -rd;
      vec3 r = reflect(rd, n);
      // 反射向量映射到上半屏 uv（相机看向 +z，r.xy / r.z 对应屏幕偏移）
      vec2 reflectUV = vec2(0.5) + r.xy / max(r.z, 0.1) / 1.5 * 0.5;
      reflectUV = clamp(reflectUV, vec2(0.0, 0.5), vec2(1.0, 1.0));
      // 粗糙度扰动：抖动反射采样位置
      if (u_roughness > 0.0) {
        reflectUV += (vec2(hash(hitPos.xz * 3.0), hash(hitPos.xz * 3.0 + 5.2)) - 0.5) * u_roughness * 0.08;
        reflectUV = clamp(reflectUV, vec2(0.0, 0.5), vec2(1.0, 1.0));
      }
      vec3 reflCol = sceneColor(reflectUV);
      // Fresnel：平视角反射强，俯视见水底
      float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      vec3 deep = vec3(0.02, 0.08, 0.10);
      col = mix(deep, reflCol, clamp(fres * u_reflectIntensity, 0.0, 1.0));
      // 水面琥珀太阳高光
      vec3 sun = normalize(vec3(0.3, 0.6, -0.4));
      col += vec3(0.91, 0.69, 0.29) * pow(max(dot(r, sun), 0.0), 40.0) * 0.15;
      // 远处水面雾化到地平线
      float fog = smoothstep(2.0, 12.0, t);
      vec3 horizon = vec3(0.91, 0.69, 0.29) * 0.4 + vec3(0.31, 0.82, 0.78) * 0.2;
      col = mix(col, horizon, fog * 0.6);
    } else {
      // 未命中水面（远处地平线带）
      col = mix(vec3(0.91, 0.69, 0.29), vec3(0.31, 0.82, 0.78), 0.4) * 0.6;
      col = mix(col, vec3(0.02, 0.025, 0.03), smoothstep(0.0, 1.0, -uv2.y) * 0.2);
    }
  }

  col = col / (col + 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`,
  miniFragment: `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
float waveH(vec2 p){float h=fbm(p*3.0+vec2(iTime*0.15,0.0))-0.5;h+=(fbm(p*6.0-vec2(0.0,iTime*0.1))-0.5)*0.5;return h*0.015;}
vec3 ballShade(vec2 d,float r){
  vec3 bn=normalize(vec3(d.x,sqrt(max(r*r-dot(d,d),0.0)),-d.y));
  vec3 l=normalize(vec3(0.4,0.6,-0.5));
  float ndl=max(dot(bn,l),0.0);
  vec3 c=mix(vec3(0.31,0.82,0.78),vec3(0.91,0.69,0.29),pow(ndl,6.0)*0.4);
  c+=vec3(0.91,0.69,0.29)*pow(max(dot(bn,normalize(l+vec3(0,0,1))),0.0),32.0)*0.5;
  c*=mix(0.55,1.0,smoothstep(0.0,r*r*0.7,dot(d,d)));
  return c;
}
vec3 scene(vec2 s){
  float a=iResolution.x/iResolution.y;
  float sh=clamp((s.y-0.5)*2.0,0.0,1.0);
  vec3 sky=mix(vec3(0.91,0.69,0.29),vec3(0.31,0.82,0.78),smoothstep(0.0,0.6,sh));
  vec3 col=sky;
  vec2 c1=vec2(0.30,0.78+sin(iTime*0.35)*0.04);float r1=0.11;
  vec2 d1=(s-c1)*vec2(a,1.0);
  col=mix(col,ballShade(d1,r1),smoothstep(r1*r1+0.0008,r1*r1-0.0008,dot(d1,d1)));
  vec2 c2=vec2(0.58+sin(iTime*0.22+1.3)*0.05,0.82+cos(iTime*0.28)*0.03);float r2=0.08;
  vec2 d2=(s-c2)*vec2(a,1.0);
  col=mix(col,ballShade(d2,r2),smoothstep(r2*r2+0.0008,r2*r2-0.0008,dot(d2,d2)));
  vec2 c3=vec2(0.78+sin(iTime*0.18+2.7)*0.04,0.74+sin(iTime*0.31+1.0)*0.04);float r3=0.09;
  vec2 d3=(s-c3)*vec2(a,1.0);
  col=mix(col,ballShade(d3,r3),smoothstep(r3*r3+0.0008,r3*r3-0.0008,dot(d3,d3)));
  return col;
}
void main(){
  float a=iResolution.x/iResolution.y;
  vec2 uv2=uv*2.0-1.0;uv2.x*=a;
  vec3 col;
  if(uv.y>0.5){col=scene(uv);}
  else{
    vec3 ro=vec3(0.0,0.4,-2.5);vec3 rd=normalize(vec3(uv2,1.5));
    float t=0.0;bool hit=false;vec3 hp=vec3(0.0);
    if(rd.y<0.0){for(int i=0;i<32;i++){vec3 p=ro+rd*t;float h=waveH(p.xz);if(p.y<h){hit=true;hp=p;break;}t+=0.06;if(t>20.0)break;}}
    if(hit){
      vec2 e=vec2(0.02,0.0);
      vec3 n=normalize(vec3(waveH(hp.xz-e.xy)-waveH(hp.xz+e.xy),2.0,waveH(hp.xz-e.yx)-waveH(hp.xz+e.yx)));
      vec3 r=reflect(rd,n);
      vec2 ruv=clamp(vec2(0.5)+r.xy/max(r.z,0.1)/1.5*0.5,vec2(0.0,0.5),vec2(1.0,1.0));
      ruv+=(vec2(hash(hp.xz*3.0),hash(hp.xz*3.0+5.2))-0.5)*0.15*0.08;
      ruv=clamp(ruv,vec2(0.0,0.5),vec2(1.0,1.0));
      vec3 rc=scene(ruv);
      float fres=pow(1.0-max(dot(n,-rd),0.0),3.0);
      col=mix(vec3(0.02,0.08,0.10),rc,fres);
      vec3 sun=normalize(vec3(0.3,0.6,-0.4));
      col+=vec3(0.91,0.69,0.29)*pow(max(dot(r,sun),0.0),40.0)*0.15;
    } else {col=mix(vec3(0.91,0.69,0.29),vec3(0.31,0.82,0.78),0.4)*0.6;}
  }
  col=col/(col+1.0);col=pow(col,vec3(1.0/2.2));
  fragColor=vec4(col,1.0);
}`,
};
