/**
 * 评论管理接口 —— 仅管理员（口令鉴权）。
 *
 * GET    /api/admin/comments?status=pending|approved   → 列评论
 * POST   /api/admin/comments/approve   { id }          → 通过
 * POST   /api/admin/comments/delete    { id }          → 删除
 */
import { type EnvContext, json, corsPreflight, isAdmin } from "../../_lib";

interface AdminBody {
  id?: number;
}

/** 列评论：pending / approved / all */
export const onRequestGet: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!isAdmin(ctx.env, ctx.request)) return json({ error: "未授权" }, 401);

  const url = new URL(ctx.request.url);
  const status = url.searchParams.get("status") ?? "pending";

  const db = ctx.env.yuyepage_db;
  let stmt;
  if (status === "all") {
    stmt = db.prepare(
      "SELECT id, post_slug, author, email, body, created_at, approved FROM comments ORDER BY created_at DESC LIMIT 200",
    );
  } else {
    const approved = status === "approved" ? 1 : 0;
    stmt = db
      .prepare(
        "SELECT id, post_slug, author, email, body, created_at, approved FROM comments WHERE approved = ? ORDER BY created_at DESC LIMIT 200",
      )
      .bind(approved);
  }
  const result = await stmt.all();
  return json({ comments: result.results ?? [] });
};

/** 通过 / 删除 */
export const onRequestPost: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!isAdmin(ctx.env, ctx.request)) return json({ error: "未授权" }, 401);

  const url = new URL(ctx.request.url);
  const action = url.searchParams.get("action"); // approve | delete
  const db = ctx.env.yuyepage_db;

  let data: AdminBody;
  try {
    data = (await ctx.request.json()) as AdminBody;
  } catch {
    return json({ error: "请求体格式错误" }, 400);
  }

  if (!data.id) return json({ error: "缺少 id" }, 400);

  if (action === "delete") {
    await db.prepare("DELETE FROM comments WHERE id = ?").bind(data.id).run();
    return json({ ok: true });
  }

  // 默认 approve
  await db
    .prepare("UPDATE comments SET approved = 1 WHERE id = ?")
    .bind(data.id)
    .run();
  return json({ ok: true });
};
