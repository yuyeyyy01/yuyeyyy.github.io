"use client";

import ShaderPlayground from "./ShaderPlayground";
import { PBR_FRAG, PBR_UNIFORMS, SSS_FRAG, SSS_UNIFORMS, HAIR_FRAG, HAIR_UNIFORMS } from "./shader-playground-presets";

/**
 * 三个预配置 Playground，MDX 里直接 <PlaygroundPBR /> 即可，无需传 fragment。
 * 分别对应 PBR / SSS / Hair 三篇文章。
 */

export function PlaygroundPBR() {
  return <ShaderPlayground fragment={PBR_FRAG} uniforms={PBR_UNIFORMS} label="pbr" height={320} />;
}

export function PlaygroundSSS() {
  return <ShaderPlayground fragment={SSS_FRAG} uniforms={SSS_UNIFORMS} label="sss" height={320} />;
}

export function PlaygroundHair() {
  return <ShaderPlayground fragment={HAIR_FRAG} uniforms={HAIR_UNIFORMS} label="hair" height={320} />;
}
