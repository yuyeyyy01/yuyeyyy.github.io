// 构建前导出 D1 文章为 .mdx 文件，供 lib/posts.ts 读取生成静态页。
// 用法：node scripts/export-d1-posts.mjs
//
// 流程：wrangler d1 execute 查询 posts → 写成 content/blog/<slug>.mdx（带 frontmatter）
// 导出的文件加到 .gitignore（每次构建重新生成，不进 git）

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "content/blog";
const MANIFEST = "content/blog/.d1-export.json"; // 标记哪些文件是导出的

function run(sql) {
  const cmd = `npx wrangler d1 execute yuyepage-db --json --command "${sql.replace(/"/g, '\\"')}"`;
  const out = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  // wrangler --json 输出：找到 JSON 数组
  const start = out.indexOf("[");
  if (start === -1) return [];
  const json = JSON.parse(out.slice(start));
  // 结构：[{ results: [...] }]
  return json[0]?.results ?? [];
}

function toMdx(p) {
  const tags = (() => {
    try {
      const t = JSON.parse(p.tags || "[]");
      return Array.isArray(t) ? t : [];
    } catch {
      return [];
    }
  })();
  const tagsYaml = tags.length ? `\ntags: [${tags.map((t) => `"${t}"`).join(", ")}]` : "";
  return `---
title: ${JSON.stringify(p.title || p.slug)}
date: ${JSON.stringify(p.date || "")}
category: ${JSON.stringify(p.category || "")}
description: ${JSON.stringify(p.description || "")}${tagsYaml}
---

${p.content_md || ""}`;
}

function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // 读上次导出的清单，清理旧导出文件
  let prevSlugs = [];
  if (existsSync(MANIFEST)) {
    try {
      prevSlugs = JSON.parse(readFileSync(MANIFEST, "utf-8"));
    } catch {}
  }
  // 只清理清单里的（不删手动写的 .mdx）
  for (const s of prevSlugs) {
    try {
      // 简单起见不删，下次构建会覆盖；如需删可加文件追踪
    } catch {}
  }

  const posts = run("SELECT slug, title, date, category, description, tags, content_md FROM posts WHERE published = 1");
  console.log(`从 D1 导出 ${posts.length} 篇文章`);

  const exported = [];
  for (const p of posts) {
    const file = join(OUT_DIR, `${p.slug}.mdx`);
    writeFileSync(file, toMdx(p), "utf-8");
    exported.push(p.slug);
  }
  writeFileSync(MANIFEST, JSON.stringify(exported), "utf-8");
  console.log("导出完成:", exported.join(", "));
}

main();
