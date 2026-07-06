import type { LabDemo } from "../types";

/**
 * 屏幕空间反射 —— 程序化 SDF 场景 + 地面反射射线步进 + Fresnel 混合。
 * 配色：青绿球体 + 琥珀高光，深色地面反射。mesh: fullscreen。
 */
export const ssr: LabDemo = {
  slug: "ssr",
  title: "屏幕空间反射",
  description:
    "程序化 SDF 场景（地面 + 多球），地面像素反射射线步进采样场景，Fresnel 混合 + 粗糙度控制反射强度。",
  difficulty: "advanced",
  mesh: "fullscreen",
  uniforms: [
    { name: "u_roughness", label: "粗糙度", kind: "float", min: 0, max: 1, step: 0.01, default: 0.2 },
    { name: "u_reflectIntensity", label: "反射强度", kind: "float", min: 0, max: 2, step: 0.01, default: 1.0 },
  ],
  defaults: { u_roughness: 0.2, u_reflectIntensity: 1.0 },
  presets: {
    镜面: { u_roughness: 0.05, u_reflectIntensity: 1.4 },
    粗糙: { u_roughness: 0.7, u_reflectIntensity: 0.9 },
    水面: { u_roughness: 0.15, u_reflectIntensity: 1.2 },
  },
  notes: [
    "主射线 80 步 raymarch 命中场景",
    "地面像素反射射线再 64 步步进采样场景色",
    "Fresnel + 粗糙度衰减混合反射与地面色",
  ],
  fragment: `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float u_roughness;
uniform float u_reflectIntensity;

out vec4 fragColor;

#define uv (gl_FragCoord.xy / iResolution.xy)

float sdSphere(vec3 p, vec3 c, float r) { return length(p - c) - r; }
float sdPlane(vec3 p, float y) { return p.y - y; }

float sceneSDF(vec3 p) {
  float d = sdPlane(p, -1.0);
  d = min(d, sdSphere(p, vec3(sin(iTime * 0.3) * 1.5, 0.3, 0.0), 0.5));
  d = min(d, sdSphere(p, vec3(-1.4, -0.1, -1.0), 0.45));
  d = min(d, sdSphere(p, vec3(1.6, -0.2, -1.8), 0.6));
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

vec3 shadeSphere(vec3 p, vec3 n, vec3 v) {
  vec3 l = normalize(vec3(0.5, 0.8, 0.3));
  vec3 h = normalize(l + v);
  float ndl = max(dot(n, l), 0.0);
  float ndh = max(dot(n, h), 0.0);
  vec3 albedo = vec3(0.31, 0.82, 0.78);
  vec3 spec = vec3(0.91, 0.69, 0.29) * pow(ndh, 32.0) * 0.6;
  return albedo * (ndl * 0.7 + 0.2) + spec;
}

void main() {
  vec2 p = uv;
  vec3 ro = vec3(0.0, 1.4, 4.5);
  vec3 rd = normalize(vec3((p - 0.5) * 1.7, -1.8));

  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 80; i++) {
    vec3 pos = ro + rd * t;
    float d = sceneSDF(pos);
    if (d < 0.001) { hit = true; break; }
    t += d;
    if (t > 30.0) break;
  }

  vec3 col = vec3(0.02, 0.025, 0.03);
  if (hit) {
    vec3 pos = ro + rd * t;
    vec3 n = calcNormal(pos);
    vec3 v = -rd;
    bool isGround = pos.y < -0.99;

    if (isGround) {
      vec3 r = reflect(rd, n);
      float rt = 0.02;
      bool rhit = false;
      vec3 rp = pos;
      for (int i = 0; i < 64; i++) {
        rp = pos + r * rt;
        float d = sceneSDF(rp);
        if (d < 0.001) { rhit = true; break; }
        rt += d;
        if (rt > 20.0) break;
      }
      vec3 rcol = vec3(0.02, 0.025, 0.03);
      if (rhit) {
        vec3 rn = calcNormal(rp);
        vec3 rv = -r;
        rcol = shadeSphere(rp, rn, rv);
      }
      float fres = pow(1.0 - max(dot(n, v), 0.0), 5.0);
      float refl = fres * u_reflectIntensity * (1.0 - u_roughness * 0.7);
      vec3 ground = vec3(0.06);
      col = mix(ground, rcol, clamp(refl, 0.0, 1.0));
      col += vec3(0.31, 0.82, 0.78) * 0.02;
    } else {
      col = shadeSphere(pos, n, v);
    }
    col = col / (col + 1.0);
    col = pow(col, vec3(1.0 / 2.2));
  }
  fragColor = vec4(col, 1.0);
}
`,
  miniFragment: `float sdSphere(vec3 p,vec3 c,float r){return length(p-c)-r;}
float sdPlane(vec3 p,float y){return p.y-y;}
float scene(vec3 p){
  float d=sdPlane(p,-1.0);
  d=min(d,sdSphere(p,vec3(sin(iTime*0.3)*1.5,0.3,0.0),0.5));
  d=min(d,sdSphere(p,vec3(-1.4,-0.1,-1.0),0.45));
  d=min(d,sdSphere(p,vec3(1.6,-0.2,-1.8),0.6));
  return d;
}
vec3 nor(vec3 p){vec2 e=vec2(0.001,0);return normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),scene(p+e.yxy)-scene(p-e.yxy),scene(p+e.yyx)-scene(p-e.yyx)));}
void main(){
  vec2 p=uv;
  vec3 ro=vec3(0,1.4,4.5);
  vec3 rd=normalize(vec3((p-0.5)*1.7,-1.8));
  float t=0.0; bool hit=false;
  for(int i=0;i<64;i++){vec3 pos=ro+rd*t;float d=scene(pos);if(d<0.001){hit=true;break;}t+=d;if(t>30.0)break;}
  vec3 col=vec3(0.02,0.025,0.03);
  if(hit){
    vec3 pos=ro+rd*t;
    vec3 n=nor(pos);
    vec3 v=-rd;
    if(pos.y<-0.99){
      vec3 r=reflect(rd,n);
      float rt=0.02; bool rhit=false; vec3 rp=pos;
      for(int i=0;i<48;i++){rp=pos+r*rt;float d=scene(rp);if(d<0.001){rhit=true;break;}rt+=d;if(rt>20.0)break;}
      vec3 rcol=vec3(0.02);
      if(rhit){vec3 rn=nor(rp);vec3 rv=-r;rcol=vec3(0.31,0.82,0.78)*(max(dot(rn,normalize(vec3(0.5,0.8,0.3))),0.0)*0.7+0.2);}
      float fres=pow(1.0-max(dot(n,v),0.0),5.0);
      col=mix(vec3(0.06),rcol,fres*0.8);
    } else {
      vec3 l=normalize(vec3(0.5,0.8,0.3));
      col=vec3(0.31,0.82,0.78)*(max(dot(n,l),0.0)*0.7+0.2)+vec3(0.91,0.69,0.29)*pow(max(dot(n,normalize(l+v)),0.0),32.0)*0.6;
    }
    col=col/(col+1.0); col=pow(col,vec3(1.0/2.2));
  }
  fragColor=vec4(col,1.0);
}`,
};
