import { LAB_DEMOS } from "@/components/lab/demos";
import type { LabDemo } from "@/components/lab/types";

/**
 * /lab 渲染实验室数据访问层（纯 TS，不读文件系统）。
 * 从 components/lab/demos/index 聚合，给 app/lab 路由用。
 */

export function getAllLabs(): LabDemo[] {
  return LAB_DEMOS;
}

export function getLab(slug: string): LabDemo | undefined {
  return LAB_DEMOS.find((d) => d.slug === slug);
}
