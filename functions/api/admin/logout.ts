/**
 * 管理员登出 —— 清除 HttpOnly cookie。
 * POST /api/admin/logout
 */
import { type EnvContext, json, corsPreflight, COOKIE_NAME } from "../../_lib";

export const onRequestPost: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  return json(
    { ok: true },
    {
      status: 200,
      headers: {
        "set-cookie": `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
      },
    },
  );
};
