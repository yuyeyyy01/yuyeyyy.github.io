// 一次性导入：把本地 content/blog/*.mdx 导入 D1 posts 表。
// 用法：node scripts/import-posts-to-d1.mjs
// 仅首次迁移用，之后以 D1 为准（写作后台编辑）。
//
// 方式：生成临时 SQL 文件（含转义后的 INSERT），用 wrangler d1 --file 执行。

import { readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import matter from "gray-matter";

const DIR = "content/blog";
const TMP_SQL = "/tmp/yuyepage-import.sql";

/** SQL 字符串单引号转义 */
function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function main() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
  console.log(`导入 ${files.length} 篇文章到 D1`);

  let sql = "";
  for (const f of files) {
    const slug = f.replace(/\.mdx$/, "");
    const raw = readFileSync(join(DIR, f), "utf-8");
    const { data, content } = matter(raw);
    const tags = JSON.stringify(data.tags || []);

    // 先删后插（幂等）
    sql += `DELETE FROM posts WHERE slug = ${sqlStr(slug)};\n`;
    sql += `INSERT INTO posts (slug, title, date, category, description, tags, content_md, published) VALUES (${sqlStr(slug)}, ${sqlStr(data.title || slug)}, ${sqlStr(data.date || "")}, ${sqlStr(data.category || "")}, ${sqlStr(data.description || "")}, ${sqlStr(tags)}, ${sqlStr(content)}, 1);\n`;
    console.log("  准备:", slug);
  }

  writeFileSync(TMP_SQL, sql, "utf-8");
  const remoteFlag = process.env.D1_REMOTE === "1" ? "--remote" : "";
  try {
    execSync(`npx wrangler d1 execute yuyepage-db ${remoteFlag} --file=${TMP_SQL} -y`, {
      stdio: "inherit",
    });
    console.log("导入完成" + (remoteFlag ? "（远程）" : "（本地）"));
  } finally {
    try {
      unlinkSync(TMP_SQL);
    } catch {}
  }
}

main();
