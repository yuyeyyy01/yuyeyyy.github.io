import type { LabDemo } from "../types";
import { volumetricLight } from "./volumetric-light";
import { seascape } from "./seascape";
import { metaballFluid } from "./metaball-fluid";
import { ssr } from "./ssr";
import { toon } from "./toon";

/**
 * /lab 渲染实验室全部 demo 聚合。
 * 顺序即列表页展示顺序。
 */
export const LAB_DEMOS: LabDemo[] = [
  volumetricLight,
  seascape,
  metaballFluid,
  ssr,
  toon,
];
