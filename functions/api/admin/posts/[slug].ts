/**
 * 单篇文章管理接口。
 *
 * GET    /api/admin/posts/:slug   → 取单篇（含 content_md 原文）
 * PUT    /api/admin/posts/:slug   → 保存修改
 * DELETE /api/admin/posts/:slug   → 删除
 */
import { type EnvContext, json, corsPreflight, isAdmin } from "../../../_lib";

interface PostRow {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  tags: string;
  content_md: string;
  published: number;
  updated_at: string;
}

interface PostUpdate {
  title?: string;
  date?: string;
  category?: string;
  description?: string;
  tags?: string[];
  content_md?: string;
  published?: number;
}

async function getSlug(ctx: EventContext<Request, string, EnvContext["env"]>): Promise<string | null> {
  // Pages Functions 动态路由：params.slug
  const slug = (ctx.params as Record<string, string | undefined>)?.slug;
  return slug ?? null;
}

export const onRequestGet: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!isAdmin(ctx.env, ctx.request)) return json({ error: "未授权" }, 401);

  const slug = await getSlug(ctx);
  if (!slug) return json({ error: "缺少 slug" }, 400);

  const post = await ctx.env.yuyepage_db
    .prepare("SELECT * FROM posts WHERE slug = ?")
    .bind(slug)
    .first<PostRow>();

  if (!post) return json({ error: "文章不存在" }, 404);

  return json({ post: { ...post, tags: JSON.parse(post.tags || "[]") } });
};

export const onRequestPut: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!isAdmin(ctx.env, ctx.request)) return json({ error: "未授权" }, 401);

  const slug = await getSlug(ctx);
  if (!slug) return json({ error: "缺少 slug" }, 400);

  let data: PostUpdate;
  try {
    data = (await ctx.request.json()) as PostUpdate;
  } catch {
    return json({ error: "请求体格式错误" }, 400);
  }

  const db = ctx.env.yuyepage_db;
  const exists = await db.prepare("SELECT slug FROM posts WHERE slug = ?").bind(slug).first();
  if (!exists) return json({ error: "文章不存在" }, 404);

  // 动态拼 update，只更新传入的字段
  const fields: string[] = [];
  const values: (string | number)[] = [];
  const push = (col: string, v: string | number | string[] | undefined, asStr = false) => {
    if (v === undefined) return;
    fields.push(`${col} = ?`);
    values.push(asStr && Array.isArray(v) ? JSON.stringify(v) : (v as string | number));
  };
  push("title", data.title);
  push("date", data.date);
  push("category", data.category);
  push("description", data.description);
  push("tags", data.tags, true);
  push("content_md", data.content_md);
  push("published", data.published);
  fields.push("updated_at = datetime('now')");

  if (fields.length === 1) {
    // 只有 updated_at，没实际字段
    return json({ ok: true, updated: 0 });
  }

  values.push(slug);
  await db
    .prepare(`UPDATE posts SET ${fields.join(", ")} WHERE slug = ?`)
    .bind(...values)
    .run();

  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!isAdmin(ctx.env, ctx.request)) return json({ error: "未授权" }, 401);

  const slug = await getSlug(ctx);
  if (!slug) return json({ error: "缺少 slug" }, 400);

  await ctx.env.yuyepage_db.prepare("DELETE FROM posts WHERE slug = ?").bind(slug).run();
  return json({ ok: true });
};
