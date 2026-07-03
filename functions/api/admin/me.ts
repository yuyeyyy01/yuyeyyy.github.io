/**
 * 当前登录态查询 —— 前端用此判断是否已登录（cookie 自动带）。
 * GET /api/admin/me → { username } | { error: "未授权" }
 *
 * 用于：/admin 页面加载时探测、文章页"就地审核"判断是否展示待审核区。
 */
import { type EnvContext, json, corsPreflight, isAdmin, verifyAdminCookie } from "../../_lib";

export const onRequestGet: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!(await isAdmin(ctx.env, ctx.request))) return json({ error: "未授权" }, 401);
  const username = await verifyAdminCookie(ctx.request, ctx.env.ADMIN_TOKEN);
  return json({ username });
};
