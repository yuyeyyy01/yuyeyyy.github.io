-- 阶段 B 初始 schema：文章 + 评论
-- 在 Cloudflare D1 上执行：npx wrangler d1 execute yuyepage-db --file=migrations/0001_init.sql

-- 文章表：MDX 原文 + 预渲染 HTML 都存，构建时从 D1 读生成静态页
CREATE TABLE IF NOT EXISTS posts (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT '',
  date         TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  tags         TEXT NOT NULL DEFAULT '[]',       -- JSON 数组字符串
  content_md   TEXT NOT NULL DEFAULT '',         -- MDX 原文
  content_html TEXT NOT NULL DEFAULT '',         -- 预渲染 HTML（构建/保存时生成）
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  published    INTEGER NOT NULL DEFAULT 1       -- 0 草稿 / 1 已发布
);

CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);

-- 评论表：匿名/昵称评论，待审核机制
CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT NOT NULL,
  author      TEXT NOT NULL DEFAULT '匿名',     -- 昵称
  email       TEXT NOT NULL DEFAULT '',          -- 可选，仅用于 Gravatar/通知，不公开
  body        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  approved    INTEGER NOT NULL DEFAULT 0        -- 0 待审核 / 1 已通过
);

CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(post_slug);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(approved);

-- 简单限流：按 IP 计数（每 IP 每天提交评论数）
CREATE TABLE IF NOT EXISTS comment_rate (
  ip          TEXT NOT NULL,
  day         TEXT NOT NULL,                     -- YYYY-MM-DD
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, day)
);
