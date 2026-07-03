/**
 * 文章管理接口 —— 列表 + 新建（单篇的 CRUD 在 [slug].ts）。
 *
 * GET   /api/admin/posts            → 列文章（slug, title, date, category, published）
 * POST  /api/admin/posts            → 新建文章 { slug, title, date, category, description, tags, content_md }
 */
import { type EnvContext, json, corsPreflight, isAdmin, triggerDeploy } from "../../_lib";

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

interface PostInput {
  slug?: string;
  title?: string;
  date?: string;
  category?: string;
  description?: string;
  tags?: string[];
  content_md?: string;
  published?: number;
}

/** 列文章（不带正文，省流量） */
export const onRequestGet: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!(await isAdmin(ctx.env, ctx.request))) return json({ error: "未授权" }, 401);

  const result = await ctx.env.yuyepage_db
    .prepare(
      "SELECT slug, title, date, category, description, tags, published, updated_at FROM posts ORDER BY date DESC",
    )
    .all<Omit<PostRow, "content_md">>();

  return json({ posts: result.results ?? [] });
};

/** 新建文章 */
export const onRequestPost: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!(await isAdmin(ctx.env, ctx.request))) return json({ error: "未授权" }, 401);

  let data: PostInput;
  try {
    data = (await ctx.request.json()) as PostInput;
  } catch {
    return json({ error: "请求体格式错误" }, 400);
  }

  const slug = (data.slug ?? "").trim();
  if (!slug) return json({ error: "缺少 slug" }, 400);
  if (!/^[a-z0-9-]+$/.test(slug))
    return json({ error: "slug 只能含小写字母、数字、横线" }, 400);

  const db = ctx.env.yuyepage_db;
  // 检查是否已存在
  const exists = await db.prepare("SELECT slug FROM posts WHERE slug = ?").bind(slug).first();
  if (exists) return json({ error: "slug 已存在" }, 409);

  await db
    .prepare(
      `INSERT INTO posts (slug, title, date, category, description, tags, content_md, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      slug,
      data.title ?? "",
      data.date ?? new Date().toISOString().slice(0, 10),
      data.category ?? "",
      data.description ?? "",
      JSON.stringify(data.tags ?? []),
      data.content_md ?? "",
      data.published ?? 1,
    )
    .run();

  // 新建已发布文章时触发重建；草稿不触发，避免无谓构建
  if ((data.published ?? 1) === 1) {
    await triggerDeploy(ctx.env, (p) => ctx.waitUntil(p));
  }

  return json({ ok: true, slug, rebuild: (data.published ?? 1) === 1 }, 201);
};
