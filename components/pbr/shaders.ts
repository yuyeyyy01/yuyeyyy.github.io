/**
 * PBR Cook-Torrance 着色器（GLSL ES 3.0）。
 * 与 custom-pbr-vs-unity-lit.mdx 文章呼应：
 * - D_GGX 紧凑写法（URP 同款）
 * - V_SmithJoint（Smith 联合近似，返回 V = G/(4·N·L·N·V)）
 * - F_Schlick（用 VdotH 不是 NdotV）
 * - α 平方链：perceptualRoughness → α = p² → α² = p⁴
 * - 金属流 F0 = mix(F0_dielectric, albedo, metallic)
 * - 能量守恒 kd = (1-F)(1-metallic)
 * - Reinhard tonemap + gamma
 */

export const VERT = `#version 300 es
in vec3 a_pos;
in vec3 a_normal;
uniform mat4 u_proj;
uniform mat4 u_view;
uniform mat4 u_model;
out vec3 v_worldPos;
out vec3 v_normal;
void main() {
  vec4 wp = u_model * vec4(a_pos, 1.0);
  v_worldPos = wp.xyz;
  // 旋转矩阵正交，normalMat = mat3(model)，无需 inverse-transpose
  v_normal = normalize(mat3(u_model) * a_normal);
  gl_Position = u_proj * u_view * wp;
}
`;

export const FRAG = `#version 300 es
precision highp float;
in vec3 v_worldPos;
in vec3 v_normal;
out vec4 fragColor;

uniform vec3 u_albedo;
uniform float u_roughness;   // perceptualRoughness
uniform float u_metallic;
uniform float u_F0;          // 介电质 F0
uniform float u_normalStrength;
uniform float u_ambient;
uniform vec3 u_lightDir;     // 指向光源
uniform vec3 u_lightColor;
uniform vec3 u_camPos;

const float PI = 3.14159265359;

// D 项：GGX / Trowbridge-Reitz（URP 紧凑写法）
float D_GGX(float NdotH, float a2) {
  float d = (NdotH * a2 - NdotH) * NdotH + 1.0;
  return a2 / (PI * d * d + 1e-7);
}

// V 项：Smith 联合近似（返回 V = G/(4·N·L·N·V)）
float V_SmithJoint(float NdotL, float NdotV, float a) {
  float lV = NdotL * (NdotV * (1.0 - a) + a);
  float lL = NdotV * (NdotL * (1.0 - a) + a);
  return 0.5 / (lV + lL + 1e-5);
}

// F 项：Fresnel-Schlick（用 VdotH）
vec3 F_Schlick(float VdotH, vec3 F0) {
  float f = pow(1.0 - VdotH, 5.0);
  return F0 + (1.0 - F0) * f;
}

void main() {
  vec3 N = normalize(v_normal);
  // 程序化细节法线扰动（模拟 normal map，无贴图）
  if (u_normalStrength > 0.0) {
    vec3 d = vec3(fract(sin(v_worldPos.x * 12.9898) * 43758.5453),
                  fract(sin(v_worldPos.y * 78.233)  * 43758.5453),
                  fract(sin(v_worldPos.z * 19.123)  * 43758.5453)) - 0.5;
    N = normalize(N + d * u_normalStrength * 0.3);
  }
  vec3 V = normalize(u_camPos - v_worldPos);
  vec3 L = normalize(u_lightDir);
  vec3 H = normalize(L + V);

  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.001);
  float NdotH = max(dot(N, H), 0.0);
  float VdotH = max(dot(V, H), 0.0);

  // α 平方链：p → α = p² → α² = p⁴
  float p  = u_roughness;
  float a  = p * p;
  float a2 = a * a;

  vec3 F0 = mix(vec3(u_F0), u_albedo, u_metallic);  // 金属流

  float D = D_GGX(NdotH, a2);
  float Vv = V_SmithJoint(NdotL, NdotV, a);
  vec3  F = F_Schlick(VdotH, F0);

  vec3 spec = D * Vv * F * u_lightColor * NdotL * 3.14159; // 乘 PI 抵消 V 里的 1/(4NLNV) 近似偏差
  vec3 kd = (1.0 - F) * (1.0 - u_metallic);                // 能量守恒 + 金属清零漫反射
  vec3 diff = kd * u_albedo / PI * u_lightColor * NdotL;
  vec3 ambi = u_ambient * (u_albedo * (1.0 - u_metallic) + F0);

  vec3 col = spec + diff + ambi;
  col = col / (col + 1.0);       // Reinhard tonemap
  col = pow(col, vec3(1.0 / 2.2)); // gamma
  fragColor = vec4(col, 1.0);
}
`;
