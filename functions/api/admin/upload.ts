/// <reference types="@cloudflare/workers-types" />

/**
 * 图片上传接口 —— 写作后台用，图片直传 R2。
 *
 * POST  /api/admin/upload   multipart/form-data，字段名 "file"
 *   → { ok: true, url: "/uploads/<key>" }
 *
 * 需要 R2 binding（R2_BUCKET，见 wrangler.toml）。
 * 未绑定 R2（或未开通）时返回 503，前端可据此提示开通。
 */
import { type CloudflareEnv, json, corsPreflight, isAdmin } from "../../_lib";

/** 本接口 env：在 CloudflareEnv 基础上加可选 R2 binding */
interface UploadEnv extends CloudflareEnv {
  R2_BUCKET?: R2Bucket;
}

/** 允许的图片扩展名白名单，非白名单一律存为 .bin */
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);

/** 最大文件大小：10MB */
const MAX_SIZE = 10 * 1024 * 1024;

/** 从文件名取扩展名；白名单外或无扩展名返回 "bin" */
function pickExt(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "bin";
  const ext = name.slice(dot + 1).toLowerCase();
  return IMAGE_EXT.has(ext) ? ext : "bin";
}

export const onRequestPost: PagesFunction<UploadEnv> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!(await isAdmin(ctx.env, ctx.request))) return json({ error: "未授权" }, 401);

  // 未绑定 R2 时拒绝上传，前端可据此提示开通
  if (!ctx.env.R2_BUCKET) {
    return json(
      { ok: false, error: "未启用 R2，无法上传图片", code: "NO_R2" },
      503,
    );
  }

  // 先看 Content-Length 粗判，避免读完整个大请求体才拒绝
  const contentLength = Number(ctx.request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SIZE + 1024) {
    return json({ error: "图片过大，最大 10MB" }, 413);
  }

  // 解析 multipart 表单
  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return json({ error: "请求体格式错误，应为 multipart/form-data" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "缺少 file 字段" }, 400);
  }

  // 仅接受 image/* MIME
  if (!file.type.startsWith("image/")) {
    return json({ error: "仅支持图片类型" }, 415);
  }

  // 精确大小限制（以实际文件大小为准）
  if (file.size > MAX_SIZE) {
    return json({ error: "图片过大，最大 10MB" }, 413);
  }

  // 生成 key：uploads/<YYYY-MM-DD>/<uuid>.<ext>
  const date = new Date().toISOString().slice(0, 10);
  const uuid = crypto.randomUUID();
  const ext = pickExt(file.name);
  const key = `uploads/${date}/${uuid}.${ext}`;

  await ctx.env.R2_BUCKET.put(key, file.stream());

  return json({ ok: true, url: `/uploads/${key}` });
};
