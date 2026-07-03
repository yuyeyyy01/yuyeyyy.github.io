/**
 * 图片读取接口 —— 从 R2 取上传的图片并返回给前端。
 *
 * GET /api/uploads/<YYYY-MM-DD>/<uuid>.<ext>  → 原图字节流（带正确 content-type / cache）
 *
 * 上传见 functions/api/admin/upload.ts（POST /api/admin/upload → 存 R2 → 返回 /uploads/<key>）。
 * 前端图片 URL 形如 `${BASE_PATH}/uploads/<key>`，Cloudflare Pages 路由到这里。
 *
 * R2 未配置（env.R2_BUCKET 不存在）时返回 503。
 * 图片公开可读（无鉴权）—— 因为正文里 <img src> 不带 cookie，
 * 上传时已鉴权，存储的 key 是随机 uuid 不可枚举。
 */
import { type EnvContext, json, corsPreflight } from "../../_lib";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export const onRequestGet: PagesFunction<EnvContext["env"]> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!ctx.env.R2_BUCKET) {
    return json({ error: "未启用 R2" }, 503);
  }

  // catch-all 参数 [...key]：ctx.params.key 是数组或字符串
  const raw = ctx.params.key;
  const key = Array.isArray(raw) ? raw.join("/") : (raw ?? "");
  if (!key || !/^[a-z0-9-]+\/[a-z0-9-]+\.[a-z0-9]+$/i.test(key)) {
    return json({ error: "无效的 key" }, 400);
  }

  const obj = await ctx.env.R2_BUCKET.get(`uploads/${key}`);
  if (!obj) return json({ error: "图片不存在" }, 404);

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "application/octet-stream";
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("access-control-allow-origin", "*");
  return new Response(obj.body, { headers });
};

export const onRequestOptions: PagesFunction<EnvContext["env"]> = () =>
  corsPreflight();
