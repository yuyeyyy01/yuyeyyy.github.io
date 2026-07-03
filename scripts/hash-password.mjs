/**
 * 生成管理员密码哈希并写入 D1（PBKDF2-SHA256）。支持多账号。
 *
 * 用法：
 *   ADMIN_USERNAME=xxx ADMIN_PASSWORD=yyy node scripts/hash-password.mjs
 *   D1_REMOTE=1 ADMIN_USERNAME=xxx ADMIN_PASSWORD=yyy node scripts/hash-password.mjs  # 远程
 *
 * 算法（必须与 functions/api/admin/login.ts 的校验一致）：
 *   PBKDF2-SHA256，100000 轮，盐 16 字节，派生密钥 32 字节，base64 编码。
 *
 * 安全：用环境变量传密码，避免留在 shell 历史。
 */
import { randomBytes, pbkdf2Sync } from "node:crypto";
import { execSync } from "node:child_process";

const ITERATIONS = 100000;
const KEYLEN = 32; // 32 字节 = 256 位

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

function hash(password) {
  const salt = randomBytes(16); // 16 字节盐
  const key = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, "sha256");
  return { salt: b64(salt), hash: b64(key) };
}

async function main() {
  const username =
    process.env.ADMIN_USERNAME ||
    process.argv[2] ||
    "";
  const password =
    process.env.ADMIN_PASSWORD ||
    process.argv[3] ||
    "";
  if (!username || !password) {
    console.error("用法: ADMIN_USERNAME=xxx ADMIN_PASSWORD=yyy node scripts/hash-password.mjs");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("密码至少 6 位");
    process.exit(1);
  }

  const { salt, hash: h } = hash(password);

  // 幂等：存在则更新密码，不存在则插入
  const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const sql = [
    `INSERT INTO admins (username, password_hash, salt, iterations) VALUES (${sqlStr(username)}, ${sqlStr(h)}, ${sqlStr(salt)}, ${ITERATIONS})`,
    `ON CONFLICT(username) DO UPDATE SET password_hash = ${sqlStr(h)}, salt = ${sqlStr(salt)}, iterations = ${ITERATIONS}, updated_at = datetime('now');`,
  ].join("\n");

  const remoteFlag = process.env.D1_REMOTE === "1" ? "--remote" : "";
  const tmp = ".tmp-admin-hash.sql";
  const { writeFileSync, unlinkSync } = await import("node:fs");
  writeFileSync(tmp, sql, "utf-8");
  try {
    console.log(`正在写入 D1...${remoteFlag ? "（远程）" : "（本地）"} 用户: ${username}`);
    execSync(`npx wrangler d1 execute yuyepage-db ${remoteFlag} --file=${tmp} -y`, {
      stdio: "inherit",
    });
    console.log(`✓ 账号已设置（用户名: ${username}）`);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {}
  }
}

main();

