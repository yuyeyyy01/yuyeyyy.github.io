import type { LabDemo } from "../types";
import { volumetricClouds } from "./volumetric-clouds";
import { seascape } from "./seascape";
import { crystal } from "./crystal";
import { pool } from "./pool";
import { fractal } from "./fractal";

/**
 * /lab 渲染实验室全部 demo 聚合。
 * 顺序即列表页展示顺序。
 */
export const LAB_DEMOS: LabDemo[] = [
  volumetricClouds,
  seascape,
  crystal,
  pool,
  fractal,
];
