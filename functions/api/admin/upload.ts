/// <reference types="@cloudflare/workers-types" />

/**
 * 图片上传接口 —— 写作后台用，图片通过 GitHub API 提交到仓库 public/images/。
 *
 * POST  /api/admin/upload   multipart/form-data，字段名 "file"
 *   → { ok: true, url: "/images/<YYYY-MM-DD>/<uuid>.<ext>", rebuild: boolean }
 *
 * 实现：Functions 跑在 Edge 没有文件系统，所以不能直接写 git 仓库；
 *   改用 GitHub REST API（PUT /repos/{owner}/{repo}/contents/{path}）把
 *   base64 编码的图片作为一次 commit 提交到默认分支。提交后触发 Deploy Hook
 *   重建，图片随下次构建上线（约 1-2 分钟）。
 *
 * 环境变量（.dev.vars / Cloudflare Dashboard）：
 *   - GITHUB_TOKEN：Personal Access Token，只需该仓库 contents:write 权限
 *   - GITHUB_REPO：仓库全名，如 "yuyeyyy01/yuyeyyy.github.io"（默认从内置值推断）
 *   - GITHUB_BRANCH：提交分支，默认 "main"
 *   - DEPLOY_HOOK_URL：重建 hook（triggerDeploy 用）
 *
 * 未配置 GITHUB_TOKEN 时返回 503，前端提示去配置。
 */
import { type CloudflareEnv, json, corsPreflight, isAdmin, triggerDeploy } from "../../_lib";

/** 允许的图片扩展名白名单，非白名单一律存为 .bin */
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);
const MAX_SIZE = 10 * 1024 * 1024;

function pickExt(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "bin";
  const ext = name.slice(dot + 1).toLowerCase();
  return IMAGE_EXT.has(ext) ? ext : "bin";
}

/** 把 ArrayBuffer 转 base64（GitHub Contents API 要 base64 内容） */
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export const onRequestPost: PagesFunction<CloudflareEnv> = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return corsPreflight();
  if (!(await isAdmin(ctx.env, ctx.request))) return json({ error: "未授权" }, 401);

  if (!ctx.env.GITHUB_TOKEN) {
    return json(
      { ok: false, error: "未配置 GITHUB_TOKEN，无法上传图片", code: "NO_GITHUB_TOKEN" },
      503,
    );
  }
  const repo = ctx.env.GITHUB_REPO || "yuyeyyy01/yuyeyyy.github.io";
  const branch = ctx.env.GITHUB_BRANCH || "main";

  const contentLength = Number(ctx.request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SIZE + 1024) {
    return json({ error: "图片过大，最大 10MB" }, 413);
  }

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
  if (!file.type.startsWith("image/")) {
    return json({ error: "仅支持图片类型" }, 415);
  }
  if (file.size > MAX_SIZE) {
    return json({ error: "图片过大，最大 10MB" }, 413);
  }

  // 生成路径：images/<YYYY-MM-DD>/<uuid>.<ext>（public/ 前缀在 GitHub path 上）
  const date = new Date().toISOString().slice(0, 10);
  const uuid = crypto.randomUUID();
  const ext = pickExt(file.name);
  const gitPath = `public/images/${date}/${uuid}.${ext}`;
  // 前端用的 URL：静态导出后 public/images/ 映射到 /images/
  const publicUrl = `/images/${date}/${uuid}.${ext}`;

  // 读取文件内容转 base64
  const buf = await file.arrayBuffer();
  const base64 = toBase64(buf);

  // GitHub Contents API：PUT 提交单文件
  const apiRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${gitPath}`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${ctx.env.GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "yuyepage-upload",
      },
      body: JSON.stringify({
        message: `chore(images): upload ${file.name || uuid}.${ext}`,
        content: base64,
        branch,
      }),
    },
  );

  if (!apiRes.ok) {
    let detail = `GitHub API ${apiRes.status}`;
    try {
      const e = (await apiRes.json()) as { message?: string };
      if (e.message) detail = `${detail}: ${e.message}`;
    } catch {}
    return json({ error: `上传到 GitHub 失败（${detail}）` }, 502);
  }

  // 提交成功后触发重建，让图片随下次构建上线
  const rebuild = await triggerDeploy(ctx.env, (p) => ctx.waitUntil(p));

  return json({ ok: true, url: publicUrl, rebuild: !!rebuild });
};
