/// <reference types="@cloudflare/workers-types" />

/**
 * Pages Functions 共享工具 —— 评论 / 文章接口都用。
 *
 * Cloudflare Pages Functions 的 env 里带 D1 binding（见 wrangler.toml），
 * 类型通过 CloudflareEnv 声明。
 */

/** D1 binding 与环境变量类型 */
export interface CloudflareEnv {
  /** D1 数据库 binding（wrangler.toml 配置） */
  yuyepage_db: D1Database;
  /** 管理后台口令（.dev.vars / Cloudflare 环境变量） */
  ADMIN_TOKEN: string;
  /** 站点 basePath，根路径部署留空 */
  NEXT_PUBLIC_BASE_PATH?: string;
  /** Cloudflare Pages Deploy Hook URL（PR4 自动重建用） */
  DEPLOY_HOOK_URL?: string;
}

/** Pages Functions 标准上下文类型 */
export type EnvContext = EventContext<Request, string, CloudflareEnv>;

/** 统一 JSON 响应，带 CORS（前台同源调用，但留宽松头方便调试） */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, x-admin-token",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    },
  });
}

/** OPTIONS 预检响应 */
export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, x-admin-token",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    },
  });
}

/** 校验管理口令：从 x-admin-token header 读，与 env.ADMIN_TOKEN 比对 */
export function isAdmin(env: CloudflareEnv, request: Request): boolean {
  const token = request.headers.get("x-admin-token");
  if (!token || !env.ADMIN_TOKEN) return false;
  // 常量时间比对，避免计时侧信道
  return timingSafeEqual(token, env.ADMIN_TOKEN);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
