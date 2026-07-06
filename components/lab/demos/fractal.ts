import type { LabDemo } from "../types";

/**
 * Mandelbulb 3D 分形 —— fullscreen raymarch Daniel White/Rudiger 算法的 3D Mandelbulb。
 * 灵感来自 Shadertoy 上众多 Mandelbulb 演示（公开数学公式，无版权）。
 * 用球坐标旋转 + r^power 迭代 z = z^p + c 做 escape-time，距离估算 0.5*log(r)*r/|dz|。
 * 配色：凹处深青绿、凸起琥珀（按轨道陷阱 trap 上色），琥珀 rim 光。
 * mesh: fullscreen。
 */
export const fractal: LabDemo = {
  slug: "fractal",
  title: "Mandelbulb 分形",
  description:
    "raymarch Mandelbulb 3D 分形（power 8 经典）：球坐标 z=z^p+c 迭代 + 距离估算 + 四面体法线，凹处青绿、凸起琥珀。",
  difficulty: "advanced",
  mesh: "fullscreen",
  uniforms: [
    { name: "u_power", label: "分形 power", kind: "float", min: 2.0, max: 10.0, step: 0.05, default: 8.0 },
    { name: "u_colorShift", label: "配色偏移", kind: "float", min: 0.0, max: 1.0, step: 0.01, default: 0.0 },
    { name: "u_rotate", label: "旋转速度", kind: "float", min: 0.0, max: 1.0, step: 0.01, default: 0.4 },
  ],
  defaults: { u_power: 8.0, u_colorShift: 0.0, u_rotate: 0.4 },
  presets: {
    经典: { u_power: 8.0, u_colorShift: 0.0, u_rotate: 0.4 },
    有机: { u_power: 3.0, u_colorShift: 0.25, u_rotate: 0.3 },
    星云: { u_power: 10.0, u_colorShift: 0.7, u_rotate: 0.5 },
  },
  notes: [
    "Mandelbulb distance estimator：球坐标 (theta,phi,r) 迭代 z = r^p·(sinθcosφ, sinφsinθ, cosθ) + c，距离 0.5·log(r)·r/dr",
    "四面体差分法线（4 次 SDF 采样）比中心差分（6 次）省 1/3 开销",
    "轨道陷阱 trap=min|z| 上色：trap 小=凹陷深处青绿，trap 大=凸起琥珀",
    "桌面 64 步 / 移动端 32 步（RAYMARCH_STEPS 宏自动降级），分形内部迭代 8 次",
  ],
  fragment: `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float u_power;
uniform float u_colorShift;
uniform float u_rotate;

out vec4 fragColor;

#define uv (gl_FragCoord.xy / iResolution.xy)

// Mandelbulb 内部迭代次数（分形精度，与 raymarch 步数独立）
#define FRACT_ITER 8

// Mandelbulb distance estimator（公开公式）
// 返回到分形表面的距离估算，trap 输出轨道陷阱（用于上色）
float mandelbulbDE(vec3 pos, float power, out float trap) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  trap = 1e10;
  for (int i = 0; i < FRACT_ITER; i++) {
    r = length(z);
    trap = min(trap, r);
    if (r > 2.0) break;
    float invR = 1.0 / max(r, 1e-6);
    // 球坐标
    float theta = acos(clamp(z.z * invR, -1.0, 1.0));
    float phi = atan(z.y, z.x);
    // 导数累积：dr = p * r^(p-1) * dr + 1
    dr = pow(max(r, 1e-6), power - 1.0) * power * dr + 1.0;
    // z = z^power（球坐标幂）
    float zr = pow(max(r, 1e-6), power);
    theta *= power;
    phi *= power;
    z = zr * vec3(sin(theta) * cos(phi),
                 sin(phi) * sin(theta),
                 cos(theta));
    // z = z^power + c（c = pos）
    z += pos;
  }
  return 0.5 * log(max(r, 1e-6)) * r / dr;
}

// 四面体差分法线（4 次 SDE 采样）
vec3 calcNormal(vec3 p, float power) {
  float e = 0.0015;
  vec2 k = vec2(1.0, -1.0);
  float t;
  return normalize(
    k.xyy * mandelbulbDE(p + k.xyy * e, power, t)
  + k.yyx * mandelbulbDE(p + k.yyx * e, power, t)
  + k.yxy * mandelbulbDE(p + k.yxy * e, power, t)
  + k.xxx * mandelbulbDE(p + k.xxx * e, power, t)
  );
}

mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, s,  0.0, 1.0, 0.0,  -s, 0.0, c);
}

void main() {
  vec2 p = uv * 2.0 - 1.0;
  p.x *= iResolution.x / iResolution.y;

  // 缓慢绕 Y 轴旋转的相机
  float ang = iTime * u_rotate * 0.3;
  vec3 ro = rotY(ang) * vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(rotY(ang) * vec3(p, -2.0));

  // raymarch 分形
  float t = 0.0;
  bool hit = false;
  float trap = 1e10;
  float minDist = 1e10;
  for (int i = 0; i < RAYMARCH_STEPS; i++) {
    vec3 pos = ro + rd * t;
    float tr;
    float d = mandelbulbDE(pos, u_power, tr);
    minDist = min(minDist, d);
    trap = min(trap, tr);
    if (d < 0.0008 * t) { hit = true; break; }
    t += d * 0.85;
    if (t > 6.0) break;
  }

  vec3 teal = vec3(0.31, 0.82, 0.78);
  vec3 amber = vec3(0.91, 0.69, 0.29);
  vec3 deep = vec3(0.02, 0.025, 0.03);

  vec3 col;
  if (hit) {
    vec3 pos = ro + rd * t;
    vec3 n = calcNormal(pos, u_power);
    vec3 v = -rd;
    vec3 l = normalize(vec3(0.6, 0.7, -0.5));

    // 轨道陷阱上色：trap 小=凹陷深处青绿，trap 大=凸起琥珀
    float t01 = clamp(trap / 1.4, 0.0, 1.0);
    vec3 base = mix(teal, amber, t01);
    // u_colorShift 整体偏移：0 青绿主，1 琥珀主
    base = mix(base, amber, u_colorShift);

    float ndl = max(dot(n, l), 0.0);
    vec3 diff = base * (0.25 + 0.75 * ndl);

    // 琥珀 rim
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    diff += amber * rim * 0.5;

    // 凹陷深处压暗到深底色
    col = mix(deep, diff, smoothstep(0.0, 0.35, ndl + 0.15));
  } else {
    // 未命中：远处 glow
    float g = exp(-minDist * 6.0);
    col = mix(deep, teal * 0.45, g * 0.35);
    col += amber * 0.06 * g;
  }

  // tonemap + gamma
  col = col / (col + 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`,
  // 列表卡片精简预览：硬编码 32 步、8 次分形迭代
  miniFragment: `float de(vec3 pos, float power, out float trap){
  vec3 z=pos; float dr=1.0, r=0.0; trap=1e10;
  for(int i=0;i<8;i++){
    r=length(z); trap=min(trap,r); if(r>2.0) break;
    float invR=1.0/max(r,1e-6);
    float theta=acos(clamp(z.z*invR,-1.0,1.0)); float phi=atan(z.y,z.x);
    dr=pow(max(r,1e-6),power-1.0)*power*dr+1.0;
    float zr=pow(max(r,1e-6),power); theta*=power; phi*=power;
    z=zr*vec3(sin(theta)*cos(phi),sin(phi)*sin(theta),cos(theta))+pos;
  }
  return 0.5*log(max(r,1e-6))*r/dr;
}
vec3 nrm(vec3 p, float power){
  float e=0.0015; vec2 k=vec2(1.0,-1.0); float t;
  return normalize(k.xyy*de(p+k.xyy*e,power,t)+k.yyx*de(p+k.yyx*e,power,t)+k.yxy*de(p+k.yxy*e,power,t)+k.xxx*de(p+k.xxx*e,power,t));
}
void main(){
  vec2 p=uv*2.0-1.0; p.x*=iResolution.x/iResolution.y;
  float ang=iTime*0.12; float c=cos(ang),s=sin(ang);
  vec3 ro=mat3(c,0.0,s,0.0,1.0,0.0,-s,0.0,c)*vec3(0.0,0.0,3.0);
  vec3 rd=normalize(mat3(c,0.0,s,0.0,1.0,0.0,-s,0.0,c)*vec3(p,-2.0));
  float t=0.0; bool hit=false; float trap=1e10, minD=1e10;
  for(int i=0;i<32;i++){
    vec3 pos=ro+rd*t; float tr; float d=de(pos,8.0,tr);
    minD=min(minD,d); trap=min(trap,tr);
    if(d<0.0008*t){hit=true;break;} t+=d*0.85; if(t>6.0)break;
  }
  vec3 teal=vec3(0.31,0.82,0.78), amber=vec3(0.91,0.69,0.29), deep=vec3(0.02,0.025,0.03);
  vec3 col;
  if(hit){
    vec3 pos=ro+rd*t; vec3 n=nrm(pos,8.0); vec3 v=-rd;
    vec3 l=normalize(vec3(0.6,0.7,-0.5));
    float t01=clamp(trap/1.4,0.0,1.0);
    vec3 base=mix(teal,amber,t01);
    float ndl=max(dot(n,l),0.0);
    vec3 diff=base*(0.25+0.75*ndl);
    diff+=amber*pow(1.0-max(dot(n,v),0.0),3.0)*0.5;
    col=mix(deep,diff,smoothstep(0.0,0.35,ndl+0.15));
  } else {
    float g=exp(-minD*6.0);
    col=mix(deep,teal*0.45,g*0.35); col+=amber*0.06*g;
  }
  col=col/(col+1.0); col=pow(col,vec3(1.0/2.2));
  fragColor=vec4(col,1.0);
}
`,
};
