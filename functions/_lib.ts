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
  /** HMAC 签名密钥（.dev.vars / Cloudflare 环境变量），用于签发/校验 admin cookie */
  ADMIN_TOKEN: string;
  /** 站点 basePath，根路径部署留空 */
  NEXT_PUBLIC_BASE_PATH?: string;
  /** Cloudflare Pages Deploy Hook URL（PR4 自动重建用） */
  DEPLOY_HOOK_URL?: string;
  /** R2 binding（图片上传，wrangler.toml 配置；未配置时 upload 接口返回 503） */
  R2_BUCKET?: R2Bucket;
}

/** Pages Functions 标准上下文类型 */
export type EnvContext = EventContext<Request, string, CloudflareEnv>;

/** admin cookie 名称与有效期（login.ts / logout.ts 共用） */
export const COOKIE_NAME = "yuyepage_admin";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

/** 统一 JSON 响应，带 CORS（前台同源调用，但留宽松头方便调试） */
export function json(data: unknown, statusOrInit: number | ResponseInit = 200): Response {
  const init: ResponseInit =
    typeof statusOrInit === "number" ? { status: statusOrInit } : statusOrInit;
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      ...(init.headers ?? {}),
    },
  });
}

/** OPTIONS 预检响应 */
export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    },
  });
}

/** Web Crypto HMAC-SHA256，返回 base64url */
async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

/**
 * 解析并校验 admin cookie —— 无状态签名 cookie。
 * 返回用户名（校验通过）或 null。
 * cookie 格式：base64url(username).exp.base64url(HMAC)
 * HMAC = HMAC-SHA256(ADMIN_TOKEN, `${username}.${exp}`)
 */
export async function verifyAdminCookie(
  request: Request,
  adminToken: string,
): Promise<string | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const parts = match[1].split(".");
  if (parts.length !== 3) return null;
  const username = unb64url(parts[0]);
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const expectedSig = await hmac(adminToken, `${username}.${exp}`);
  if (expectedSig !== parts[2]) return null;
  return username;
}

/**
 * 校验是否管理员 —— 读 HttpOnly cookie，验签。
 * 返回是否已登录（不区分用户名，多账号均可）。
 */
export async function isAdmin(env: CloudflareEnv, request: Request): Promise<boolean> {
  if (!env.ADMIN_TOKEN) return false;
  const user = await verifyAdminCookie(request, env.ADMIN_TOKEN);
  return user !== null;
}

/** 签发 admin cookie 的值（login.ts 用） */
export async function signAdminCookie(
  username: string,
  adminToken: string,
): Promise<{ value: string; exp: number }> {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const sig = await hmac(adminToken, `${username}.${exp}`);
  return { value: `${b64url(username)}.${exp}.${sig}`, exp };
}

/**
 * 触发 Cloudflare Pages 重建部署（PR4 自动重建）。
 * env.DEPLOY_HOOK_URL 未配置时静默跳过、返回 false，
 * 方便本地开发或未配 hook 时写操作不报错。
 * 用 ctx.waitUntil 包裹以保证请求结束后 fetch 仍能完成。
 */
export async function triggerDeploy(
  env: CloudflareEnv,
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<boolean> {
  if (!env.DEPLOY_HOOK_URL) return false;
  const p = fetch(env.DEPLOY_HOOK_URL, { method: "POST" }).then(
    () => true,
    () => false,
  );
  // 有 waitUntil（Pages Functions 上下文）时挂到生命周期，避免请求结束就取消
  if (waitUntil) waitUntil(p);
  return p;
}
