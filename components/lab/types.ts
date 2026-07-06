/**
 * Lab demo 类型定义。
 * /lab 路由下的渲染实验室：每个 demo 是一个独立 WebGL2 着色器 playground。
 */

export interface LabUniform {
  /** GLSL uniform 名，必须与 fragment 里声明的一致 */
  name: string;
  /** 显示名，缺省同 name */
  label?: string;
  /** float=滑块, color=vec3 颜色选择 */
  kind: "float" | "color";
  min?: number;
  max?: number;
  step?: number;
  default: number | [number, number, number];
}

export interface LabDemo {
  slug: string;
  title: string;
  description: string;
  difficulty: "basic" | "intermediate" | "advanced";
  /** 完整 GLSL ES 3.0 fragment（含 #version / precision / 所有 uniform 声明），给 LabPlayground 编译 */
  fragment: string;
  /** 精简 fragment（不含 #version，约定可用 iTime / iResolution / uv / fragColor），给 LabCard 的 MiniShader 预览 */
  miniFragment: string;
  mesh: "fullscreen" | "sphere";
  uniforms: LabUniform[];
  defaults: Record<string, number | [number, number, number]>;
  presets?: Record<string, Record<string, number | [number, number, number]>>;
  notes?: string[];
}
