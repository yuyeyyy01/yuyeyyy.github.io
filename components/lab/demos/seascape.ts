import type { LabDemo } from "../types";

/**
 * Seascape —— 海面 raymarch。
 * 灵感来自 Shadertoy 经典 demo「Seascape」by TDM（https://www.shadertoy.com/view/MdXczH），
 * 用其公开算法思路（octave 海面高度场 + raymarch + 法线 + Fresnel 天空反射）重写适配本项目。
 * 配色：深青绿海面 + 琥珀落日反光，与站点 framegraph 视觉一致。
 * mesh: fullscreen（raymarch 海面）。
 */
export const seascape: LabDemo = {
  slug: "seascape",
  title: "Seascape 海面",
  description:
    "raymarch 程序化海面：octave 高度场构造波浪 + Fresnel 天空反射 + 琥珀落日反光。灵感来自 Shadertoy「Seascape」by TDM。",
  difficulty: "advanced",
  mesh: "fullscreen",
  uniforms: [
    { name: "u_waveHeight", label: "浪高", kind: "float", min: 0.1, max: 2.0, step: 0.01, default: 0.6 },
    { name: "u_waveSpeed", label: "浪速", kind: "float", min: 0, max: 2, step: 0.01, default: 0.8 },
    { name: "u_sunHeight", label: "太阳高度", kind: "float", min: -0.2, max: 0.8, step: 0.01, default: 0.25 },
  ],
  defaults: { u_waveHeight: 0.6, u_waveSpeed: 0.8, u_sunHeight: 0.25 },
  presets: {
    平静: { u_waveHeight: 0.25, u_waveSpeed: 0.5, u_sunHeight: 0.4 },
    汹涌: { u_waveHeight: 1.4, u_waveSpeed: 1.6, u_sunHeight: 0.15 },
    落日: { u_waveHeight: 0.7, u_waveSpeed: 0.7, u_sunHeight: 0.05 },
  },
  notes: [
    "octave 海面高度场：4 层三角波叠加，每层频率翻倍振幅减半",
    "raymarch 海面：从相机沿视线步进，命中水面后差分求法线",
    "Fresnel 反射天空 + 琥珀落日高光（太阳越低反光越长）",
  ],
  fragment: `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float u_waveHeight;
uniform float u_waveSpeed;
uniform float u_sunHeight;

out vec4 fragColor;

#define uv (gl_FragCoord.xy / iResolution.xy)

// ---- octave 海面高度场（三角波叠加，Seascape 同款思路）----
// 每层频率翻倍、振幅减半，方向旋转，叠加成水面起伏
float seaHeight(vec2 p) {
  float freq = 0.16;
  float amp = 1.0;
  float t = iTime * u_waveSpeed;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    // 三角波：|fract(x)-0.| 的变体， Seascape 用 sin 的叠加正弦近似
    vec2 q = p * freq + vec2(t * 0.5, 0.0);
    float w = sin(q.x * 2.0 + sin(q.y * 3.0 + t)) * 0.5
            + sin(q.y * 2.7 - t * 0.7) * 0.3;
    h += w * amp;
    p = rot * p;
    freq *= 2.0;
    amp *= 0.5;
  }
  return h * u_waveHeight;
}

// 海面法线（差分）
vec3 seaNormal(vec2 p) {
  vec2 e = vec2(0.01, 0.0);
  float hL = seaHeight(p - e.xy);
  float hR = seaHeight(p + e.xy);
  float hD = seaHeight(p - e.yx);
  float hU = seaHeight(p + e.yx);
  return normalize(vec3(hL - hR, 2.0, hD - hU));
}

void main() {
  vec2 uv2 = uv * 2.0 - 1.0;
  uv2.x *= iResolution.x / iResolution.y;

  // 相机在水面以上，向前看
  vec3 ro = vec3(0.0, 1.2, -2.5);
  vec3 rd = normalize(vec3(uv2, -1.5));

  // raymarch 海面：水面 y = seaHeight(xz)
  float t = 0.0;
  bool hit = false;
  vec3 hitPos = vec3(0.0);
  for (int i = 0; i < RAYMARCH_STEPS; i++) {
    vec3 p = ro + rd * t;
    float h = seaHeight(p.xz);
    if (p.y < h) { hit = true; hitPos = p; break; }
    t += 0.06;
    if (t > 20.0) break;
  }

  vec3 col;
  if (hit) {
    vec3 n = seaNormal(hitPos.xz);
    vec3 v = -rd;
    vec3 l = normalize(vec3(0.4, u_sunHeight, -0.5));

    // 天空色：高处青绿，地平线琥珀（落日）
    vec3 sky = mix(
      vec3(0.31, 0.82, 0.78),   // 青绿天
      vec3(0.91, 0.69, 0.29),   // 琥珀地平线
      smoothstep(0.5, 0.0, l.y)
    );
    // 深水色
    vec3 deep = vec3(0.02, 0.08, 0.10);
    vec3 shallow = vec3(0.05, 0.18, 0.20);

    // Fresnel：越平视角反射越强
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    // 漫反射水色（背光面深、向光面浅）
    float ndl = max(dot(n, l), 0.0);
    vec3 water = mix(deep, shallow, ndl);

    // 太阳高光：视线反射方向接近太阳
    vec3 r = reflect(-v, n);
    float sun = pow(max(dot(r, l), 0.0), 60.0);

    col = mix(water, sky, fres);
    col += vec3(0.91, 0.69, 0.29) * sun * 1.5;  // 琥珀落日反光

    // 距离雾：远处淡化到天空
    float fog = smoothstep(5.0, 18.0, t);
    col = mix(col, sky * 0.8, fog);
  } else {
    // 未命中：天空
    col = mix(
      vec3(0.31, 0.82, 0.78),
      vec3(0.91, 0.69, 0.29),
      smoothstep(0.5, 0.0, uv2.y * 0.5 + 0.3)
    );
    col = mix(col, vec3(0.02, 0.025, 0.03), smoothstep(0.6, 1.0, uv2.y));
  }

  // gamma + tonemap
  col = col / (col + 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`,
  // 列表卡片用的精简预览（静态首帧也能看海面）
  miniFragment: `#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;
#define uv (gl_FragCoord.xy / iResolution.xy)
float seaHeight(vec2 p){
  float freq=0.16,amp=1.0,t=iTime*0.8;mat2 rot=mat2(0.8,0.6,-0.6,0.8);float h=0.0;
  for(int i=0;i<4;i++){vec2 q=p*freq+vec2(t*0.5,0.0);float w=sin(q.x*2.0+sin(q.y*3.0+t))*0.5+sin(q.y*2.7-t*0.7)*0.3;h+=w*amp;p=rot*p;freq*=2.0;amp*=0.5;}return h*0.6;
}
void main(){
  vec2 uv2=uv*2.0-1.0;uv2.x*=iResolution.x/iResolution.y;
  vec3 ro=vec3(0.0,1.2,-2.5);vec3 rd=normalize(vec3(uv2,-1.5));
  float t=0.0;bool hit=false;vec3 hp=vec3(0.0);
  for(int i=0;i<32;i++){vec3 p=ro+rd*t;float h=seaHeight(p.xz);if(p.y<h){hit=true;hp=p;break;}t+=0.06;if(t>20.0)break;}
  vec3 col;
  if(hit){
    vec3 n=normalize(vec3(seaHeight(hp.xz-vec2(0.01,0.0))-seaHeight(hp.xz+vec2(0.01,0.0)),2.0,seaHeight(hp.xz-vec2(0.0,0.01))-seaHeight(hp.xz+vec2(0.0,0.01))));
    vec3 sky=mix(vec3(0.31,0.82,0.78),vec3(0.91,0.69,0.29),0.3);
    vec3 water=vec3(0.05,0.18,0.20);float fres=pow(1.0-max(dot(n,-rd),0.0),3.0);
    col=mix(water,sky,fres);col+=vec3(0.91,0.69,0.29)*pow(max(dot(reflect(-rd,n),normalize(vec3(0.4,0.25,-0.5))),0.0),60.0)*1.5;
  }else{col=mix(vec3(0.31,0.82,0.78),vec3(0.02,0.025,0.03),smoothstep(0.6,1.0,uv2.y));}
  col=col/(col+1.0);col=pow(col,vec3(1.0/2.2));fragColor=vec4(col,1.0);
}
`,
};
