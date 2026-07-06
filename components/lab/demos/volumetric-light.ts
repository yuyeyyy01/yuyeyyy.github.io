import type { LabDemo } from "../types";

/**
 * 体积光 —— raymarch 穿过 fbm 雾密度场，沿射线累加 HG 相位函数散射。
 * 配色：青绿雾底 + 琥珀光束。mesh: fullscreen。
 */
export const volumetricLight: LabDemo = {
  slug: "volumetric-light",
  title: "体积光",
  description:
    "raymarch 穿过 fbm 雾密度场，沿射线累加 Henyey-Greenstein 相位函数散射，青绿雾里透出琥珀光束。",
  difficulty: "advanced",
  mesh: "fullscreen",
  uniforms: [
    { name: "u_density", label: "雾密度", kind: "float", min: 0, max: 3, step: 0.01, default: 1.0 },
    { name: "u_lightIntensity", label: "光强", kind: "float", min: 0, max: 5, step: 0.01, default: 2.0 },
    { name: "u_lightColor", label: "光色", kind: "color", default: [0.91, 0.69, 0.29] },
  ],
  defaults: { u_density: 1.0, u_lightIntensity: 2.0, u_lightColor: [0.91, 0.69, 0.29] },
  presets: {
    薄雾: { u_density: 0.4, u_lightIntensity: 2.5, u_lightColor: [0.91, 0.69, 0.29] },
    浓雾: { u_density: 2.4, u_lightIntensity: 1.6, u_lightColor: [0.91, 0.69, 0.29] },
    青光: { u_density: 1.2, u_lightIntensity: 2.2, u_lightColor: [0.31, 0.82, 0.78] },
  },
  notes: [
    "64 步 raymarch，每步采样 fbm 雾密度并累加散射",
    "双 HG 相位（g=0.6 前向 + g=-0.4 后向）模拟各向异性散射",
    "transmittance 衰减实现体积吸收",
  ],
  fragment: `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float u_density;
uniform float u_lightIntensity;
uniform vec3 u_lightColor;

out vec4 fragColor;

#define uv (gl_FragCoord.xy / iResolution.xy)

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

float hg(float g, float cost) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * cost, 1.5));
}

void main() {
  vec2 p = uv;
  vec3 ro = vec3(0.0, 0.0, 5.0);
  vec3 rd = normalize(vec3((p - 0.5) * 1.6, -1.5));

  vec3 lightDir = normalize(vec3(0.5, 0.8, -0.4));
  vec3 lightCol = u_lightColor * u_lightIntensity;

  float t = 0.0;
  vec3 col = vec3(0.0);
  float trans = 1.0;
  for (int i = 0; i < 64; i++) {
    vec3 pos = ro + rd * t;
    float n = fbm(pos * 1.5 + vec3(0.0, 0.0, iTime * 0.05));
    float dens = max(n - 0.45, 0.0) * u_density * 2.0;
    if (dens > 0.01) {
      float cost = dot(rd, lightDir);
      float phase = hg(0.6, cost) + hg(-0.4, cost) * 0.5;
      vec3 scatter = lightCol * phase * dens;
      col += scatter * trans;
      trans *= exp(-dens * 0.12);
    }
    t += 0.12;
    if (trans < 0.01) break;
  }

  // 青绿雾底色
  vec3 fogTint = vec3(0.31, 0.82, 0.78) * 0.12;
  col += fogTint * (1.0 - trans);

  col = col / (col + 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}
`,
  miniFragment: `float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
void main(){
  vec2 p=uv;
  vec3 ro=vec3(0,0,5);
  vec3 rd=normalize(vec3((p-0.5)*1.6,-1.5));
  vec3 lightDir=normalize(vec3(0.5,0.8,-0.4));
  vec3 col=vec3(0); float trans=1.0;
  for(int i=0;i<32;i++){
    vec3 pos=ro+rd*float(i)*0.15;
    float n=fbm(pos*1.5+vec3(0,0,iTime*0.05));
    float dens=max(n-0.45,0.0)*1.5;
    if(dens>0.01){
      float cost=dot(rd,lightDir);
      float g=0.6;
      float phase=(1.0-g*g)/(4.0*3.14159*pow(1.0+g*g-2.0*g*cost,1.5));
      col+=vec3(0.91,0.69,0.29)*phase*dens*trans;
      trans*=exp(-dens*0.12);
    }
  }
  col+=vec3(0.31,0.82,0.78)*0.12*(1.0-trans);
  col=col/(col+1.0); col=pow(col,vec3(1.0/2.2));
  fragColor=vec4(col,1.0);
}`,
};
