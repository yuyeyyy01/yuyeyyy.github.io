/**
 * PBR 预设材质：一键切换滑块值，展示金属高光形态差异。
 * 呼应 custom-pbr-vs-unity-lit.mdx「金属流 F0 = albedo」论点。
 */

export interface PBRParams {
  albedo: string; // hex
  roughness: number;
  metallic: number;
  F0: number;
  normalStrength: number;
  ambient: number;
}

export const DEFAULT_PARAMS: PBRParams = {
  albedo: "#c9d6d5",
  roughness: 0.5,
  metallic: 0.0,
  F0: 0.04,
  normalStrength: 0.0,
  ambient: 0.15,
};

export const PRESETS: Record<string, PBRParams> = {
  金: {
    albedo: "#ffd700",
    roughness: 0.22,
    metallic: 1.0,
    F0: 0.04,
    normalStrength: 0.0,
    ambient: 0.15,
  },
  铜: {
    albedo: "#f0835a",
    roughness: 0.30,
    metallic: 1.0,
    F0: 0.04,
    normalStrength: 0.0,
    ambient: 0.15,
  },
  塑料: {
    albedo: "#c43838",
    roughness: 0.55,
    metallic: 0.0,
    F0: 0.04,
    normalStrength: 0.0,
    ambient: 0.15,
  },
  铁: {
    albedo: "#8c8e91",
    roughness: 0.38,
    metallic: 1.0,
    F0: 0.04,
    normalStrength: 0.0,
    ambient: 0.15,
  },
};

/** hex → [r,g,b] 0..1 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}
