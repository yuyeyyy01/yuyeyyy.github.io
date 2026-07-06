import type { LabDemo } from "../types";

/**
 * SDF 流体融合 —— smooth-min 多球融合 + 解析法线 + 简化 Cook-Torrance。
 * 配色：青绿金属流体 + 琥珀 rim。mesh: fullscreen（raymarch SDF）。
 */
export const metaballFluid: LabDemo = {
  slug: "metaball-fluid",
  title: "SDF 流体融合",
  description:
    "smooth-min 多球 SDF 融合成流体形态，解析法线 + 简化 Cook-Torrance 高光，琥珀边缘光勾边。",
  difficulty: "advanced",
  mesh: "fullscreen",
  uniforms: [
    { name: "u_count", label: "球数", kind: "float", min: 2, max: 8, step: 1, default: 5 },
    { name: "u_blend", label: "融合度", kind: "float", min: 0.1, max: 2.0, step: 0.01, default: 0.6 },
    { name: "u_metallic", label: "金属度", kind: "float", min: 0, max: 1, step: 0.01, default: 0.7 },
  ],
  defaults: { u_count: 5, u_blend: 0.6, u_metallic: 0.7 },
  presets: {
    流体: { u_count: 5, u_blend: 0.9, u_metallic: 0.4 },
    水银: { u_count: 6, u_blend: 0.4, u_metallic: 1.0 },
    散珠: { u_count: 4, u_blend: 0.15, u_metallic: 0.2 },
  },
  notes: [
    "smooth-min (polynomial) 让多球 SDF 平滑融合",
    "96 步 raymarch，命中后 6 次差分法线",
    "D_GGX + Smith 联合 V + Schlick F，rim 用 Fresnel 琥珀勾边",
  ],
  fragment: `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float u_count;
uniform float u_blend;
uniform float u_metallic;

out vec4 fragColor;

#define uv (gl_FragCoord.xy / iResolution.xy)

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
  return mix(a, b, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

float sceneSDF(vec3 p) {
  float d = 1e9;
  int n = int(u_count);
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;
    float fi = float(i);
    vec3 c = vec3(
      sin(iTime * 0.35 + fi * 1.7) * 1.3,
      cos(iTime * 0.42 + fi * 2.3) * 1.0,
      sin(iTime * 0.28 + fi * 1.1) * 1.3
    );
    d = smin(d, sdSphere(p - c, 0.5), u_blend);
  }
  return d;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0008, 0.0);
  return normalize(vec3(
    sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
    sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
    sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
  ));
}

void main() {
  vec2 p = uv;
  vec3 ro = vec3(0.0, 0.0, 4.5);
  vec3 rd = normalize(vec3((p - 0.5) * 1.8, -2.0));

  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    vec3 pos = ro + rd * t;
    float d = sceneSDF(pos);
    if (d < 0.001) { hit = true; break; }
    t += d;
    if (t > 20.0) break;
  }

  vec3 col;
  if (hit) {
    vec3 pos = ro + rd * t;
    vec3 n = calcNormal(pos);
    vec3 v = -rd;
    vec3 l = normalize(vec3(0.6, 0.7, 0.4));
    vec3 h = normalize(l + v);
    float NdotL = max(dot(n, l), 0.0);
    float NdotV = max(dot(n, v), 0.001);
    float NdotH = max(dot(n, h), 0.0);
    float VdotH = max(dot(v, h), 0.0);

    float a = 0.25;
    float a2 = a * a;
    float denom = NdotH * a2 - NdotH + 1.0;
    float D = a2 / (3.14159 * denom * denom + 1e-7);
    float Vv = 0.5 / (NdotL * (NdotV * (1.0 - a) + a) + NdotV * (NdotL * (1.0 - a) + a) + 1e-5);
    vec3 F0 = mix(vec3(0.04), vec3(0.31, 0.82, 0.78), u_metallic);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
    vec3 spec = D * Vv * F * NdotL * 3.14159;
    vec3 albedo = vec3(0.31, 0.82, 0.78);
    vec3 kd = (1.0 - F) * (1.0 - u_metallic);
    vec3 diff = kd * albedo / 3.14159 * NdotL;

    float fres = pow(1.0 - NdotV, 3.0);
    vec3 rim = vec3(0.91, 0.69, 0.29) * fres * 0.5;

    col = spec + diff + rim;
    col = col / (col + 1.0);
    col = pow(col, vec3(1.0 / 2.2));
  } else {
    col = vec3(0.04, 0.05, 0.06);
  }
  fragColor = vec4(col, 1.0);
}
`,
  miniFragment: `float smin(float a,float b,float k){float h=clamp(0.5+0.5*(a-b)/k,0.0,1.0);return mix(a,b,h)-k*h*(1-h);}
float sdSphere(vec3 p,float r){return length(p)-r;}
float scene(vec3 p){
  float d=1e9;
  for(int i=0;i<5;i++){
    float fi=float(i);
    vec3 c=vec3(sin(iTime*0.35+fi*1.7)*1.3,cos(iTime*0.42+fi*2.3)*1.0,sin(iTime*0.28+fi*1.1)*1.3);
    d=smin(d,sdSphere(p-c,0.5),0.6);
  }
  return d;
}
vec3 nor(vec3 p){vec2 e=vec2(0.001,0);return normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),scene(p+e.yxy)-scene(p-e.yxy),scene(p+e.yyx)-scene(p-e.yyx)));}
void main(){
  vec2 p=uv;
  vec3 ro=vec3(0,0,4.5);
  vec3 rd=normalize(vec3((p-0.5)*1.8,-2.0));
  float t=0.0; bool hit=false;
  for(int i=0;i<64;i++){vec3 pos=ro+rd*t;float d=scene(pos);if(d<0.001){hit=true;break;}t+=d;if(t>20.0)break;}
  vec3 col=vec3(0.04,0.05,0.06);
  if(hit){
    vec3 pos=ro+rd*t;
    vec3 n=nor(pos);
    vec3 v=-rd;
    vec3 l=normalize(vec3(0.6,0.7,0.4));
    float ndl=max(dot(n,l),0.0);
    float ndv=max(dot(n,v),0.0);
    col=vec3(0.31,0.82,0.78)*ndl+vec3(0.91,0.69,0.29)*pow(1.0-ndv,3.0)*0.5;
    col=col/(col+1.0); col=pow(col,vec3(1.0/2.2));
  }
  fragColor=vec4(col,1.0);
}`,
};
