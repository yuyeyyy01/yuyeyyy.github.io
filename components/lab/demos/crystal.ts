import type { LabDemo } from "../types";

/**
 * 棱镜/水晶折射 —— SDF 形状混合（球 ↔ 八面体棱锥）+ raymarch + tetrahedral 法线
 * + 三通道折射率偏移色散 + 菲涅尔 + 琥珀 rim。
 * 灵感来自 Shadertoy「Raymarching Primitives」by Inigo Quilez 的折射思路与
 * 「Beam」by 0x37 的色散边，全部自写无版权问题。
 * 配色：青绿内部 + 琥珀边缘 + 深底，色散只在折射边缘细微体现。
 * mesh: fullscreen（raymarch SDF）。
 */
export const crystal: LabDemo = {
  slug: "crystal",
  title: "水晶折射",
  description:
    "raymarch SDF 透明几何体（球 ↔ 棱锥混合），三通道折射率偏移产生色散边，菲涅尔 + 琥珀 rim。灵感来自 Shadertoy「Raymarching Primitives」by Inigo Quilez。",
  difficulty: "advanced",
  mesh: "fullscreen",
  uniforms: [
    { name: "u_refraction", label: "折射率", kind: "float", min: 1.0, max: 1.5, step: 0.01, default: 1.4 },
    { name: "u_dispersion", label: "色散", kind: "float", min: 0.0, max: 0.05, step: 0.001, default: 0.015 },
    { name: "u_shape", label: "形状", kind: "float", min: 0.0, max: 1.0, step: 0.01, default: 0.5 },
  ],
  defaults: { u_refraction: 1.4, u_dispersion: 0.015, u_shape: 0.5 },
  presets: {
    水晶球: { u_refraction: 1.45, u_dispersion: 0.012, u_shape: 0.0 },
    棱镜: { u_refraction: 1.5, u_dispersion: 0.03, u_shape: 1.0 },
    水滴: { u_refraction: 1.33, u_dispersion: 0.005, u_shape: 0.0 },
  },
  notes: [
    "SDF 形状混合：sdSphere ↔ sdOctahedron（八面体棱锥）按 u_shape mix，smin 融合主水晶 + 两颗卫星",
    "RAYMARCH_STEPS 步 raymarch，命中后 tetrahedral 4 次 SDF 求法线",
    "rgb 三通道用略不同的折射率（±u_dispersion）采样程序化背景，产生折射边缘色散",
    "菲涅尔 Schlick（介电质 F0=0.04）混合折射/反射，琥珀 rim 勾边",
    "内部按视线-法线夹角做青绿吸收，正射路径长吸收多",
  ],
  fragment: `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float u_refraction;
uniform float u_dispersion;
uniform float u_shape;

out vec4 fragColor;

#define uv (gl_FragCoord.xy / iResolution.xy)

#define COL_TEAL  vec3(0.31, 0.82, 0.78)
#define COL_AMBER vec3(0.91, 0.69, 0.29)
#define COL_DARK  vec3(0.02, 0.025, 0.03)

// ---- smooth-min（多项式融合）----
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
  return mix(a, b, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

// 八面体（双棱锥）SDF —— Inigo Quilez
float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c); }

// 形状混合：u_shape=0 球，1 棱锥
float shapeSDF(vec3 p, float r) {
  return mix(sdSphere(p, r), sdOctahedron(p, r), u_shape);
}

float sceneSDF(vec3 p) {
  // 主水晶：缓慢双轴旋转
  vec3 q = rotY(iTime * 0.2) * rotX(iTime * 0.15) * p;
  float d = shapeSDF(q, 1.1);
  // 卫星 1
  vec3 c1 = vec3(sin(iTime * 0.30) * 1.8, cos(iTime * 0.40) * 1.5, sin(iTime * 0.25) * 1.8);
  vec3 q1 = rotY(iTime * 0.5) * (p - c1);
  d = smin(d, shapeSDF(q1, 0.4), 0.30);
  // 卫星 2
  vec3 c2 = vec3(sin(iTime * 0.27 + 2.0) * 1.7, cos(iTime * 0.33 + 1.5) * 1.3, cos(iTime * 0.31) * 1.7);
  vec3 q2 = rotX(iTime * 0.4) * (p - c2);
  d = smin(d, shapeSDF(q2, 0.35), 0.30);
  return d;
}

// tetrahedral 法线：4 次 SDF（比 6 次差分省 33%）
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0008, 0.0);
  return normalize(
    sceneSDF(p + e.xyy) * vec3( 1.0,  1.0,  1.0)
    + sceneSDF(p + e.yxy) * vec3(-1.0, -1.0,  1.0)
    + sceneSDF(p + e.yyx) * vec3(-1.0,  1.0, -1.0)
    + sceneSDF(p - e.xxx) * vec3( 1.0, -1.0, -1.0)
  );
}

// ---- 程序化背景：天空渐变 + fbm 云 ----
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

vec3 background(vec3 dir) {
  float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  // 上方青绿天，下方深底
  vec3 sky = mix(COL_DARK, COL_TEAL * 0.7, smoothstep(0.15, 0.85, t));
  // 琥珀地平线带
  float horizon = smoothstep(0.36, 0.50, t) * (1.0 - smoothstep(0.50, 0.62, t));
  sky = mix(sky, COL_AMBER, horizon * 0.55);
  // fbm 云
  float cloud = fbm(dir * 3.0 + vec3(iTime * 0.02, 0.0, 0.0));
  sky = mix(sky, COL_DARK, smoothstep(0.55, 0.80, cloud) * 0.35);
  return sky;
}

// 安全折射：全反射时退化为反射
vec3 safeRefract(vec3 I, vec3 N, float eta) {
  vec3 r = refract(I, N, eta);
  if (dot(r, r) < 1e-4) r = reflect(I, N);
  return r;
}

void main() {
  vec2 p = uv;
  vec3 ro = vec3(0.0, 0.0, 5.0);
  vec3 rd = normalize(vec3((p - 0.5) * 1.6, -1.6));

  // ---- 主 raymarch：命中水晶外表面 ----
  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < RAYMARCH_STEPS; i++) {
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
    float NdotV = max(dot(n, v), 0.0);

    // ---- 三通道折射率偏移：色散 ----
    float etaR = 1.0 / max(u_refraction + u_dispersion, 1.001);
    float etaG = 1.0 / max(u_refraction, 1.001);
    float etaB = 1.0 / max(u_refraction - u_dispersion, 0.5);

    vec3 refR = safeRefract(rd, n, etaR);
    vec3 refG = safeRefract(rd, n, etaG);
    vec3 refB = safeRefract(rd, n, etaB);

    // 三通道分别采样背景的对应通道，色散体现在背景细节的通道偏移
    vec3 bgR = background(refR);
    vec3 bgG = background(refG);
    vec3 bgB = background(refB);
    vec3 refrCol = vec3(bgR.r, bgG.g, bgB.b);

    // 内部青绿吸收：正射路径长（穿过整球）吸收多，掠射路径短吸收少
    float pathLen = max(NdotV, 0.0) * 2.2;
    float absorb = clamp(pathLen * 0.10, 0.0, 0.22);
    refrCol = mix(refrCol, COL_TEAL * 0.35, absorb);

    // ---- 菲涅尔（Schlick，介电质 F0=0.04）----
    float fres = 0.04 + 0.96 * pow(1.0 - NdotV, 5.0);

    // 反射方向采样背景
    vec3 reflDir = reflect(rd, n);
    vec3 reflCol = background(reflDir);

    // 折射 + 反射混合
    col = mix(refrCol, reflCol, fres);

    // ---- 琥珀 rim（边缘光）----
    float rim = pow(1.0 - NdotV, 3.0);
    col += COL_AMBER * rim * 0.7;

    // 琥珀高光（小光源）
    vec3 l = normalize(vec3(0.6, 0.7, 0.4));
    vec3 h = normalize(l + v);
    float spec = pow(max(dot(n, h), 0.0), 80.0);
    col += COL_AMBER * spec * 0.5;
  } else {
    col = background(rd);
  }

  // tonemap + gamma
  col = col / (col + 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`,
  // 列表卡片预览：精简静态首帧，硬编码 32 步，不用宏
  miniFragment: `#version 300 es
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
out vec4 fragColor;
#define uv (gl_FragCoord.xy / iResolution.xy)
#define COL_TEAL vec3(0.31,0.82,0.78)
#define COL_AMBER vec3(0.91,0.69,0.29)
#define COL_DARK vec3(0.02,0.025,0.03)
float smin(float a,float b,float k){float h=clamp(0.5+0.5*(a-b)/k,0.0,1.0);return mix(a,b,h)-k*h*(1-h);}
float sdSphere(vec3 p,float r){return length(p)-r;}
float sdOct(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*0.57735027;}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0,s,0,1,0,-s,0,c);}
float shape(vec3 p,float r){return mix(sdSphere(p,r),sdOct(p,r),0.5);}
float scene(vec3 p){
  vec3 q=rotY(iTime*0.2)*p;
  float d=shape(q,1.1);
  vec3 c1=vec3(sin(iTime*0.3)*1.8,cos(iTime*0.4)*1.5,sin(iTime*0.25)*1.8);
  d=smin(d,shape(p-c1,0.4),0.3);
  return d;
}
vec3 nor(vec3 p){vec2 e=vec2(0.0008,0);
  return normalize(scene(p+e.xyy)*vec3(1,1,1)+scene(p+e.yxy)*vec3(-1,-1,1)+scene(p+e.yyx)*vec3(-1,1,-1)+scene(p-e.xxx)*vec3(1,-1,-1));}
float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.0,a=0.5;for(int i=0;i<2;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
vec3 bg(vec3 d){float t=clamp(d.y*0.5+0.5,0.0,1.0);
  vec3 s=mix(COL_DARK,COL_TEAL*0.7,smoothstep(0.15,0.85,t));
  float h=smoothstep(0.36,0.5,t)*(1.0-smoothstep(0.5,0.62,t));
  s=mix(s,COL_AMBER,h*0.55);
  float c=fbm(d*3.0+vec3(iTime*0.02,0,0));
  s=mix(s,COL_DARK,smoothstep(0.55,0.8,c)*0.35);
  return s;}
vec3 safeR(vec3 I,vec3 N,float e){vec3 r=refract(I,N,e);if(dot(r,r)<1e-4)r=reflect(I,N);return r;}
void main(){
  vec2 p=uv;
  vec3 ro=vec3(0,0,5);
  vec3 rd=normalize(vec3((p-0.5)*1.6,-1.6));
  float t=0.0;bool hit=false;
  for(int i=0;i<32;i++){vec3 pos=ro+rd*t;float d=scene(pos);if(d<0.001){hit=true;break;}t+=d;if(t>20.0)break;}
  vec3 col;
  if(hit){
    vec3 pos=ro+rd*t;vec3 n=nor(pos);vec3 v=-rd;float nv=max(dot(n,v),0.0);
    vec3 rR=safeR(rd,n,1.0/1.415);vec3 rG=safeR(rd,n,1.0/1.4);vec3 rB=safeR(rd,n,1.0/1.385);
    vec3 refr=vec3(bg(rR).r,bg(rG).g,bg(rB).b);
    float pl=max(nv,0.0)*2.2;
    refr=mix(refr,COL_TEAL*0.35,clamp(pl*0.1,0.0,0.22));
    float fres=0.04+0.96*pow(1.0-nv,5.0);
    vec3 refl=bg(reflect(rd,n));
    col=mix(refr,refl,fres);
    col+=COL_AMBER*pow(1.0-nv,3.0)*0.7;
    vec3 l=normalize(vec3(0.6,0.7,0.4));vec3 hh=normalize(l+v);
    col+=COL_AMBER*pow(max(dot(n,hh),0.0),80.0)*0.5;
  }else{col=bg(rd);}
  col=col/(col+1.0);col=pow(col,vec3(1.0/2.2));
  fragColor=vec4(col,1.0);
}
`,
};
