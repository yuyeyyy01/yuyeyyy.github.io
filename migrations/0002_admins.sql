-- 阶段 B 补充：管理员账号表（账号+密码登录，PBKDF2 哈希）。
-- 单用户：固定用户名 admin；密码用 PBKDF2-SHA256（100000 轮）+ 随机盐哈希存储。
-- 首次用 scripts/hash-password.mjs 生成哈希并插入本表。

DROP TABLE IF EXISTS admins;

CREATE TABLE admins (
  username     TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,   -- base64(PBKDF2-SHA256 派生密钥)
  salt         TEXT NOT NULL,    -- base64(盐)
  iterations   INTEGER NOT NULL DEFAULT 100000,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 默认插入占位（密码无效，需用 hash-password.mjs 覆盖）
INSERT INTO admins (username, password_hash, salt) VALUES ('admin', '', '');
