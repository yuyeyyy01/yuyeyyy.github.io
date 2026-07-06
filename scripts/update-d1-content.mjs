// 把 git HEAD 里 3 篇文章的 content_md 更新到 D1（只更新 content_md，保留 D1 其他字段）。
// 用法：D1_REMOTE=1 node scripts/update-d1-content.mjs
//
// 背景：C1 把文章里的 <ShaderDemo/> 改成 <PlaygroundPBR/> 等并提交进 git，但部署时
// export-d1-posts.mjs 从 D1 导出覆盖本地 MDX，而 D1 里还是旧版（<ShaderDemo/>），
// 导致线上 SSR 渲染的是旧 demo。此脚本把 git 版 content_md 写回 D1，让两边一致。
//
// 只更新 content_md（demo 标签在这一字段），不碰 title/date/category/description/published，
// 避免覆盖你在后台编辑器对其他字段的修改。

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import matter from "gray-matter";

const DIR = "content/blog";
const TMP_SQL = "/tmp/yuyepage-update-content.sql";
const SLUGS = [
  "custom-pbr-vs-unity-lit",
  "skin-sss-thickness-lut",
  "kajiya-kay-marschner-hair",
];

/** SQL 字符串单引号转义 */
function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function main() {
  let sql = "";
  for (const slug of SLUGS) {
    const relPath = `${DIR}/${slug}.mdx`;
    // 从 git HEAD 读取（避免被工作区被 export-d1 覆盖的旧版污染）
    let raw;
    try {
      raw = execSync(`git show HEAD:${relPath}`, { encoding: "utf-8" });
    } catch {
      console.warn(`跳过：git HEAD 里没有 ${relPath}`);
      continue;
    }
    const { content } = matter(raw);
    // 只更新 content_md，保留其他字段
    sql += `UPDATE posts SET content_md = ${sqlStr(content)} WHERE slug = ${sqlStr(slug)};\n`;
    // 打印改动证据：demo 标签
    const tags = content.match(/<(PlaygroundPBR|PlaygroundSSS|PlaygroundHair|ShaderDemo|Scene)[\s\S]*?\/?>/g) || [];
    console.log(`  ${slug}: ${tags.join(" ")}`);
  }

  writeFileSync(TMP_SQL, sql, "utf-8");
  const remoteFlag = process.env.D1_REMOTE === "1" ? "--remote" : "";
  console.log(`\n执行 wrangler d1 execute ${remoteFlag ? "(远程) " : "(本地) "}...`);
  try {
    execSync(`npx wrangler d1 execute yuyepage-db ${remoteFlag} --file=${TMP_SQL} -y`, {
      stdio: "inherit",
    });
    console.log("✅ D1 content_md 更新完成");
  } finally {
    try {
      unlinkSync(TMP_SQL);
    } catch {}
  }
}

main();
