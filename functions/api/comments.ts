/**
 * 评论公共接口 —— 前台读者用。
 *
 * GET  /api/comments?slug=xxx  → 返回该文章已审核通过的评论
 * POST /api/comments           → 提交评论（默认待审核）
 *
 * 限流：每 IP 每天最多 10 条，存 comment_rate 表。
 */
import { type EnvContext, json, corsPreflight } from "../_lib";

interface CommentRow {
  id: number;
  post_slug: string;
  author: string;
  body: string;
  created_at: string;
}

interface SubmitBody {
  slug?: string;
  author?: string;
  email?: string;
  body?: string;
}

/** 每天 IP 提交上限 */
const DAILY_LIMIT = 10;
/** 单条评论字数上限 */
const MAX_BODY = 2000;
/** 昵称字数上限 */
const MAX_AUTHOR = 40;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 简易 HTML 转义，防 XSS：评论 body 存原文，展示时由前端转义；这里只做基本清理 */
function sanitize(s: string): string {
  return s.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));
}

export const onRequestGet: PagesFunction<EnvContext["env"]> = async (
  ctx,
) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();

  const url = new URL(ctx.request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return json({ error: "missing slug" }, 400);

  const db = ctx.env.yuyepage_db;
  const result = await db
    .prepare(
      "SELECT id, post_slug, author, body, created_at FROM comments WHERE post_slug = ? AND approved = 1 ORDER BY created_at ASC",
    )
    .bind(slug)
    .all<CommentRow>();

  return json({ comments: result.results ?? [] });
};

export const onRequestPost: PagesFunction<EnvContext["env"]> = async (
  ctx,
) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();

  const db = ctx.env.yuyepage_db;
  const ip =
    (ctx.request.headers.get("cf-connecting-ip") as string) ??
    (ctx.request.headers.get("x-forwarded-for") as string) ??
    "unknown";

  // 限流：每 IP 每天 DAILY_LIMIT 条
  const rate = await db
    .prepare("SELECT count FROM comment_rate WHERE ip = ? AND day = ?")
    .bind(ip, today())
    .first<{ count: number }>();

  if (rate && rate.count >= DAILY_LIMIT) {
    return json({ error: "今日评论数已达上限，请明天再试" }, 429);
  }

  // 解析 body
  let data: SubmitBody;
  try {
    data = (await ctx.request.json()) as SubmitBody;
  } catch {
    return json({ error: "请求体格式错误" }, 400);
  }

  const slug = (data.slug ?? "").trim();
  const author = (data.author ?? "").trim().slice(0, MAX_AUTHOR) || "匿名";
  const email = (data.email ?? "").trim().slice(0, 100);
  const body = (data.body ?? "").trim();

  if (!slug) return json({ error: "缺少文章 slug" }, 400);
  if (!body) return json({ error: "评论内容不能为空" }, 400);
  if (body.length > MAX_BODY) return json({ error: "评论过长" }, 400);

  // 写评论（默认 approved=0 待审核）
  await db
    .prepare(
      "INSERT INTO comments (post_slug, author, email, body) VALUES (?, ?, ?, ?)",
    )
    .bind(slug, author, email, sanitize(body))
    .run();

  // 更新限流计数
  if (rate) {
    await db
      .prepare("UPDATE comment_rate SET count = count + 1 WHERE ip = ? AND day = ?")
      .bind(ip, today())
      .run();
  } else {
    await db
      .prepare("INSERT INTO comment_rate (ip, day, count) VALUES (?, ?, 1)")
      .bind(ip, today())
      .run();
  }

  return json({ ok: true, message: "评论已提交，审核后显示" }, 201);
};
