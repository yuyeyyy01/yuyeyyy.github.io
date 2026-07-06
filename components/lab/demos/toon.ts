import type { LabDemo } from "../types";

/**
 * NPR 卡通 —— 复用 sphere mesh，ramp 量化着色 + 菲涅尔描边 + 硬阈值高光。
 * 配色：青绿基色 + 琥珀高光。mesh: sphere。
 */
export const toon: LabDemo = {
  slug: "toon",
  title: "卡通分级着色",
  description:
    "球体 ramp 量化着色（3 段分级）+ 菲涅尔描边 + 硬阈值高光，可调分段数与描边强度。",
  difficulty: "intermediate",
  mesh: "sphere",
  uniforms: [
    { name: "u_bands", label: "分段数", kind: "float", min: 1, max: 8, step: 1, default: 3 },
    { name: "u_outline", label: "描边强度", kind: "float", min: 0, max: 1, step: 0.01, default: 0.7 },
    { name: "u_specThreshold", label: "高光阈值", kind: "float", min: 0.5, max: 0.99, step: 0.01, default: 0.85 },
  ],
  defaults: { u_bands: 3, u_outline: 0.7, u_specThreshold: 0.85 },
  presets: {
    粗糙: { u_bands: 2, u_outline: 0.9, u_specThreshold: 0.8 },
    细腻: { u_bands: 6, u_outline: 0.3, u_specThreshold: 0.92 },
    默认: { u_bands: 3, u_outline: 0.7, u_specThreshold: 0.85 },
  },
  notes: [
    "NdotL 量化为分段 ramp，每段纯色",
    "菲涅尔 (1-NdotV)^2 描边边缘",
    "硬阈值 step 高光，琥珀色点缀",
  ],
  fragment: `#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_worldPos;

uniform float iTime;
uniform vec3 u_camPos;
uniform float u_bands;
uniform float u_outline;
uniform float u_specThreshold;

out vec4 fragColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_camPos - v_worldPos);
  // 缓慢光源旋转
  vec3 L = normalize(vec3(0.5 + sin(iTime * 0.2) * 0.2, 0.7, 0.4));
  vec3 H = normalize(L + V);

  float NdotL = dot(N, L);
  // ramp 量化
  float ramp = floor(NdotL * u_bands) / u_bands;
  ramp = clamp(ramp, 0.0, 1.0);

  vec3 base = vec3(0.31, 0.82, 0.78);
  vec3 shadow = vec3(0.04, 0.15, 0.18);
  vec3 col = mix(shadow, base, ramp);

  // 硬阈值高光
  float NdotH = max(dot(N, H), 0.0);
  float spec = step(u_specThreshold, NdotH);
  col += vec3(0.91, 0.69, 0.29) * spec * 0.8;

  // 菲涅尔描边
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  col = mix(col, vec3(0.02, 0.03, 0.04), fres * u_outline);

  fragColor = vec4(col, 1.0);
}
`,
  miniFragment: `void main(){
  vec2 p=uv-0.5;
  p.x*=1.4;
  float r=length(p);
  vec3 N=normalize(vec3(p, sqrt(max(0.0, 0.25 - r*r))));
  vec3 L=normalize(vec3(0.5,0.7,0.4));
  vec3 V=vec3(0,0,1);
  vec3 H=normalize(L+V);
  float ndl=dot(N,L);
  float ramp=floor(ndl*3.0)/3.0; ramp=clamp(ramp,0.0,1.0);
  vec3 col=mix(vec3(0.04,0.15,0.18),vec3(0.31,0.82,0.78),ramp);
  float ndh=max(dot(N,H),0.0);
  col+=vec3(0.91,0.69,0.29)*step(0.85,ndh)*0.8;
  float fres=pow(1.0-max(dot(N,V),0.0),2.0);
  col=mix(col,vec3(0.02),fres*0.7);
  col*=smoothstep(0.5,0.48,r);
  fragColor=vec4(col,1.0);
}`,
};
