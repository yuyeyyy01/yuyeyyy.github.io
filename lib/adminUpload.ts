import { BASE_PATH } from "./site";

/**
 * 上传图片到 R2（通过 /api/admin/upload），用于编辑器拖拽/粘贴图片。
 * 鉴权靠 HttpOnly cookie（credentials: include）。R2 未启用时后端返回 503。
 *
 * 返回 { url } 成功（url 已按 BASE_PATH 拼接，可直接用于 <img src> / markdown），
 * 或 { error } 失败。
 */
export async function uploadImage(
  file: File,
): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: "只能上传图片" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "图片超过 10MB" };
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(`${BASE_PATH}/api/admin/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const d = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (res.ok && d.ok && d.url) {
      // 后端返回相对路径 /uploads/<key>，前端按 BASE_PATH 拼接（根路径部署时为空）
      const url = d.url.startsWith("/") ? `${BASE_PATH}${d.url}` : d.url;
      return { url };
    }
    return { error: d.error ?? "上传失败" };
  } catch {
    return { error: "网络错误" };
  }
}

/** 把上传后的图片 URL 组装成 markdown 图片语法 */
export function imageMarkdown(url: string, alt: string = ""): string {
  return `![${alt}](${url})`;
}
