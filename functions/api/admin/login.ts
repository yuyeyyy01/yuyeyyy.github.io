/**
 * 管理员登录 —— 账号+密码（PBKDF2 哈希校验），签发 HttpOnly cookie。
 * POST /api/admin/login   { username, password }
 *
 * 哈希算法与 scripts/hash-password.mjs 一致：PBKDF2-SHA256, 100000 轮, 16 字节盐, 32 字节密钥。
 * cookie 签发逻辑在 _lib.signAdminCookie（无状态 HMAC 签名）。
 */
import {
  type EnvContext,
  json,
  corsPreflight,
  signAdminCookie,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "../../_lib";

/** PBKDF2-SHA256 校验密码 */
async function verifyPassword(
  password: string,
  saltB64: string,
  hashB64: string,
  iterations: number,
): Promise<boolean> {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  // 标准 base64（与 scripts/hash-password.mjs 的 Buffer.toString("base64") 一致，
  // 含 + / 和 = 填充；不要转 base64url，否则与存储的哈希永远不等）
  const computed = btoa(String.fromCharCode(...new Uint8Array(bits)));
  // 常量时间比较
  const a = computed,
    b = hashB64;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const onRequestPost: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();

  let data: { username?: string; password?: string };
  try {
    data = (await ctx.request.json()) as typeof data;
  } catch {
    return json({ error: "请求体格式错误" }, 400);
  }

  const username = (data.username ?? "").trim();
  const password = data.password ?? "";
  if (!username || !password) return json({ error: "用户名或密码不能为空" }, 400);

  const row = await ctx.env.yuyepage_db
    .prepare("SELECT password_hash, salt, iterations FROM admins WHERE username = ?")
    .bind(username)
    .first<{ password_hash: string; salt: string; iterations: number }>();

  // 用户不存在与密码错误返回同样错误，防止枚举用户名
  if (!row || !row.password_hash) {
    return json({ error: "用户名或密码错误" }, 401);
  }

  const ok = await verifyPassword(password, row.salt, row.password_hash, row.iterations);
  if (!ok) return json({ error: "用户名或密码错误" }, 401);

  const secret = ctx.env.ADMIN_TOKEN;
  if (!secret) return json({ error: "服务器未配置 ADMIN_TOKEN" }, 500);
  const { value } = await signAdminCookie(username, secret);

  return json(
    { ok: true, username },
    {
      status: 200,
      headers: {
        "set-cookie": `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`,
      },
    },
  );
};
