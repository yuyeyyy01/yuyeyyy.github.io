# 阶段 B：全迁 Cloudflare + 在线写作后台 + 自建评论

## 1. 概述

阶段 B 把站点从 GitHub Pages 子路径静态导出迁移到 Cloudflare Pages，新增 D1 数据库存储文章与评论、Pages Functions 提供 API、在线管理后台（口令登录）支持文章 CRUD 与评论审核，并通过 Deploy Hook 在保存后自动触发重建。

PR 进度：

| PR  | 内容                          | 状态   |
| --- | ----------------------------- | ------ |
| PR1 | 基础设施（D1 / wrangler / 环境变量解耦） | 已合并 |
| PR2 | 评论接口 + 评论审核 UI          | 已合并 |
| PR3 | 写作后台（文章 CRUD UI + API）  | 已合并 |
| PR4 | 自动重建（Deploy Hook）+ 迁移收尾 | 进行中 |

## 2. 整体架构

静态导出 + 构建时 MDX 渲染 + D1 存储 + Pages Functions + Deploy Hook 重建。

- 静态导出：`next build` 产出 `out/`，由 `wrangler pages deploy out` 部署到 Cloudflare Pages。
- 构建时 MDX 渲染：构建前用 `scripts/export-d1-posts.mjs` 把 D1 `posts` 表导出为 `content/blog/<slug>.mdx`，再由 `lib/posts.ts` 读取、`next-mdx-remote` 渲染成静态 HTML。D1 为唯一数据源，MDX 文件是构建产物（加 `.gitignore`，不进 git）。
- D1 存储：文章正文（`content_md`）与评论都存 D1，通过 `yuyepage_db` binding 访问。
- Pages Functions：`functions/` 目录提供 `/api/comments` 与 `/api/admin/*` 接口，运行在 Cloudflare 边缘。
- Deploy Hook 重建（PR4）：后台写操作保存到 D1 后调用 `triggerDeploy`，POST 到 `DEPLOY_HOOK_URL` 触发 Pages 重建，重建流程执行 `export-d1-posts → next build → pagefind → deploy`。

```
┌──────────────┐      ┌──────────────────────────────┐
│ 读者浏览器    │      │ 管理员浏览器 /admin           │
│ 静态页 + 评论 │      │ 口令登录（x-admin-token）     │
└──────┬───────┘      └──────────────┬───────────────┘
       │ GET 静态页                   │ /api/admin/*
       │ POST /api/comments           │
       ▼                              ▼
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Pages                   │
│  ┌───────────────┐   ┌────────────────────────────┐ │
│  │ 静态资源 out/  │   │ Pages Functions functions/ │ │
│  │ HTML/JS/CSS   │   │  /api/comments             │ │
│  │ pagefind 索引  │   │  /api/admin/comments       │ │
│  └───────────────┘   │  /api/admin/posts[/:slug]  │ │
│                      └─────────────┬──────────────┘ │
│                                    │                │
│                      ┌─────────────▼──────────────┐ │
│                      │  D1: yuyepage_db           │ │
│                      │  posts / comments /        │ │
│                      │  comment_rate              │ │
│                      └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
       ▲
       │ POST DEPLOY_HOOK_URL（PR4）
       │
┌──────┴─────────────────────────────────────────────┐
│  重建流程（Deploy Hook 触发）                        │
│  export-d1-posts 生成 mdx → next build → pagefind   │
│  → wrangler pages deploy out → 约 1–2 分钟生效       │
└────────────────────────────────────────────────────┘
```

## 3. 数据模型

来源：`migrations/0001_init.sql`。

### posts（文章表）

| 字段          | 类型    | 约束 / 默认                     | 说明                          |
| ------------- | ------- | ------------------------------- | ----------------------------- |
| slug          | TEXT    | PRIMARY KEY                     | URL slug，小写字母数字横线     |
| title         | TEXT    | NOT NULL DEFAULT ''             | 标题                          |
| date          | TEXT    | NOT NULL DEFAULT ''             | 发布日期（YYYY-MM-DD）         |
| category      | TEXT    | NOT NULL DEFAULT ''             | 分类                          |
| description   | TEXT    | NOT NULL DEFAULT ''             | 摘要                          |
| tags          | TEXT    | NOT NULL DEFAULT '[]'           | JSON 数组字符串               |
| content_md    | TEXT    | NOT NULL DEFAULT ''             | MDX 原文                      |
| content_html  | TEXT    | NOT NULL DEFAULT ''             | 预渲染 HTML（构建/保存时生成）|
| updated_at    | TEXT    | NOT NULL DEFAULT datetime('now')| 更新时间                      |
| published     | INTEGER | NOT NULL DEFAULT 1              | 0 草稿 / 1 已发布             |

索引：`idx_posts_date(date)`、`idx_posts_published(published)`。

### comments（评论表）

| 字段        | 类型    | 约束 / 默认                     | 说明                          |
| ----------- | ------- | ------------------------------- | ----------------------------- |
| id          | INTEGER | PRIMARY KEY AUTOINCREMENT       | 自增主键                      |
| post_slug   | TEXT    | NOT NULL                        | 关联文章 slug                 |
| author      | TEXT    | NOT NULL DEFAULT '匿名'         | 昵称（上限 40 字符）          |
| email       | TEXT    | NOT NULL DEFAULT ''             | 可选，仅 Gravatar/通知，不公开|
| body        | TEXT    | NOT NULL DEFAULT ''             | 评论正文（上限 2000 字符）    |
| created_at  | TEXT    | NOT NULL DEFAULT datetime('now')| 创建时间                      |
| approved    | INTEGER | NOT NULL DEFAULT 0              | 0 待审核 / 1 已通过           |

索引：`idx_comments_slug(post_slug)`、`idx_comments_approved(approved)`。

### comment_rate（限流表）

| 字段  | 类型    | 约束 / 默认 | 说明                       |
| ----- | ------- | ----------- | -------------------------- |
| ip    | TEXT    | NOT NULL    | 读者 IP                    |
| day   | TEXT    | NOT NULL    | YYYY-MM-DD                 |
| count | INTEGER | NOT NULL DEFAULT 0 | 当日已提交条数     |

主键：`PRIMARY KEY (ip, day)`。每 IP 每天上限 10 条。

## 4. API 一览

所有接口在 `functions/` 下，由 Pages Functions 承载。鉴权统一读 `x-admin-token` header，与 `env.ADMIN_TOKEN` 常量时间比对（`isAdmin`）。CORS 头宽松（`*`），OPTIONS 预检返回 204。

| 路径                          | 方法   | 鉴权     | 用途                                       |
| ----------------------------- | ------ | -------- | ------------------------------------------ |
| `/api/comments?slug=xxx`      | GET    | 公共     | 返回该文章已审核通过评论（`approved=1`）   |
| `/api/comments`               | POST   | 公共     | 提交评论，默认 `approved=0` 待审核；限流  |
| `/api/admin/comments?status=` | GET    | 管理员   | 列评论（`pending`/`approved`/`all`）       |
| `/api/admin/comments?action=` | POST   | 管理员   | `action=approve` 通过 / `action=delete` 删除，body `{id}` |
| `/api/admin/posts`            | GET    | 管理员   | 列文章（不含 `content_md`，省流量）       |
| `/api/admin/posts`            | POST   | 管理员   | 新建文章，body 见下                        |
| `/api/admin/posts/:slug`       | GET    | 管理员   | 取单篇（含 `content_md`，`tags` 解析为数组）|
| `/api/admin/posts/:slug`       | PUT    | 管理员   | 保存修改（动态拼 update，只更新传入字段）  |
| `/api/admin/posts/:slug`       | DELETE | 管理员   | 删除文章                                   |

新建 / 编辑 body 字段：`slug`（仅新建）、`title`、`date`、`category`、`description`、`tags: string[]`、`content_md`、`published: 0|1`。

校验：`slug` 必须匹配 `^[a-z0-9-]+$`，新建时若已存在返回 409。

## 5. 写作发布流程

```
后台编辑（/admin 文章 tab）
   │
   ▼
POST /api/admin/posts  或  PUT /api/admin/posts/:slug
   │  写入 D1 posts 表（content_md 原文）
   ▼
triggerDeploy（PR4，待接入）
   │  fetch(DEPLOY_HOOK_URL, { method: "POST" })
   │  ctx.waitUntil 包裹，请求结束仍完成
   ▼
Cloudflare Pages 重建
   │  执行 cf:deploy 流程：
   │    1. node scripts/export-d1-posts.mjs
   │       → wrangler d1 execute 查 published=1 文章
   │       → 写 content/blog/<slug>.mdx（带 frontmatter）
   │    2. next build（lib/posts.ts 读 mdx → next-mdx-remote 渲染）
   │    3. pagefind --site out（生成搜索索引）
   │    4. wrangler pages deploy out
   ▼
读者访问新内容（约 1–2 分钟延迟）
```

说明：

- D1 是唯一数据源。`content/blog/*.mdx` 是每次构建重新生成的产物，已加 `.gitignore`，不进 git。
- `export-d1-posts.mjs` 只导出 `published = 1` 的文章；草稿不参与构建。
- PR4 已接入 `triggerDeploy`：写操作保存到 D1 后，若影响前台（已发布文章内容变 / 草稿→发布 / 删除已发布），自动 POST 到 `DEPLOY_HOOK_URL` 触发重建；草稿修改不触发。UI 提示「已保存，已触发重建（约 1-2 分钟后上线）」或「已保存（草稿，未触发重建）」。
- `triggerDeploy` 在 `DEPLOY_HOOK_URL` 未配置时静默跳过，方便本地开发。

## 6. 部署流程

`package.json` 脚本：

```json
{
  "cf:dev": "wrangler pages dev",
  "cf:deploy": "node scripts/export-d1-posts.mjs && npm run build && npm run index && wrangler pages deploy out",
  "db:export": "node scripts/export-d1-posts.mjs",
  "db:import": "node scripts/import-posts-to-d1.mjs",
  "db:init": "wrangler d1 execute yuyepage-db --file=migrations/0001_init.sql",
  "db:local": "wrangler d1 execute yuyepage-db --local --file=migrations/0001_init.sql",
  "db:query": "wrangler d1 execute yuyepage-db --command",
  "index": "pagefind --site out"
}
```

`cf:deploy` 顺序：

1. `export-d1-posts.mjs`：`wrangler d1 execute` 查 `posts WHERE published=1` → 写 `content/blog/<slug>.mdx`，并维护 `.d1-export.json` 清单。
2. `next build`：`lib/posts.ts` 读 mdx → 静态导出到 `out/`。
3. `pagefind --site out`：生成静态搜索索引。
4. `wrangler pages deploy out`：上传到 Cloudflare Pages。

D1 脚本说明：

| 脚本         | 作用                                              |
| ------------ | ------------------------------------------------- |
| `db:local`   | 在本地 D1（`.wrangler/state`）执行 `0001_init.sql` |
| `db:init`    | 在远程 D1 执行 `0001_init.sql`（首次初始化）      |
| `db:export`  | 单独跑导出，便于本地预览                           |
| `db:import`  | 一次性迁移：本地 `content/blog/*.mdx` 导入 D1      |
| `db:query`   | 临时查询，`--command` 接 SQL                        |

`import-posts-to-d1.mjs` 仅首次迁移用，之后以 D1 为准（写作后台编辑）。它生成临时 SQL 文件（含单引号转义），`wrangler d1 --file` 执行，幂等（先 DELETE 后 INSERT）。

## 7. 环境变量

| 变量                     | 用途                                       | 本地（.dev.vars）        | Cloudflare Dashboard    |
| ------------------------ | ------------------------------------------ | ------------------------ | ----------------------- |
| `ADMIN_TOKEN`            | 管理后台口令，`isAdmin` 比对                | 自设任意串               | 自设强随机串            |
| `DEPLOY_HOOK_URL`        | Pages Deploy Hook URL，PR4 自动重建        | 可不配（triggerDeploy 跳过）| Pages 项目 → Settings → Builds → Deploy hook |
| `NEXT_PUBLIC_BASE_PATH`  | Next.js basePath，根路径部署留空串         | `/yuyeyyy.github.io` 或不设 | `""`（根路径）        |
| `NEXT_PUBLIC_SITE_URL`   | 站点根 URL（含 basePath），SEO/RSS/OG 用   | `https://yuyeyyy01.github.io/yuyeyyy.github.io` | `https://你的域名` |

区分：

- 本地开发：`.dev.vars` 文件（`wrangler pages dev` 自动加载），`NEXT_PUBLIC_*` 也可放进 `.env` / shell。
- 远程部署：Cloudflare Pages Dashboard → Settings → Environment variables。`NEXT_PUBLIC_*` 构建期注入，需在构建前配好。

`lib/site.ts` 解耦逻辑：

```ts
export const BASE_PATH: string =
  process.env.NEXT_PUBLIC_BASE_PATH ?? "/yuyeyyy.github.io";

export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://yuyeyyy01.github.io/yuyeyyy.github.io";
```

`next.config.ts` 也读 `NEXT_PUBLIC_BASE_PATH` 保证一致。

## 8. 本地开发

```bash
# 1. 初始化本地 D1（首次）
npm run db:local

# 2. （可选）从已有 mdx 导入种子数据
npm run db:import

# 3. 启动 Pages Functions + 本地 D1 + 静态导出热更新
npm run cf:dev
```

`.dev.vars` 示例（不进 git）：

```
ADMIN_TOKEN=local-dev-token
DEPLOY_HOOK_URL=
NEXT_PUBLIC_BASE_PATH=/yuyeyyy.github.io
NEXT_PUBLIC_SITE_URL=http://localhost:8788/yuyeyyy.github.io
```

`wrangler pages dev` 会自动加载 `.dev.vars`、绑定本地 D1（`--local` 状态在 `.wrangler/state/`），Functions 在 `http://localhost:8788` 起服务。前台访问 `/yuyeyyy.github.io/...`（basePath），后台访问 `/yuyeyyy.github.io/admin`。

## 9. 管理后台使用

入口：`/admin`（即 `${BASE_PATH}/admin`）。

### 口令登录

- 输入 `ADMIN_TOKEN` → 调 `/api/admin/comments?status=pending` 试鉴权 → 成功则 `localStorage` 存 `admin_token`，之后所有管理请求带 `x-admin-token` header。
- 单用户模式，不接 OAuth。退出按钮清 `localStorage`。

### 评论审核 tab

- 拉取 `?status=pending` 待审核列表，展示昵称、slug、正文、时间。
- 每条两个按钮：「通过」（`POST /api/admin/comments?action=approve {id}`，置 `approved=1`）、「删除」（`?action=delete`，DELETE 行）。
- 操作后自动刷新列表。

### 文章 CRUD tab

- 列表：`GET /api/admin/posts`，按 `date DESC`，显示标题 / 日期 / slug / 草稿标记。
- 新建：「新建」按钮 → 填 slug（仅新建可改，须 `^[a-z0-9-]+$`）、日期、标题、分类、标签（逗号分隔）、摘要、正文（MDX 源码）、已发布勾选 → 保存（`POST /api/admin/posts`）。
- 编辑：点列表项 → `GET /api/admin/posts/:slug` 取详情 → 改字段 → 保存（`PUT /api/admin/posts/:slug`，动态拼 update）。
- 删除：编辑页「删除」按钮，二次确认后 `DELETE /api/admin/posts/:slug`。
- 保存/删除后提示：触发重建则显示「已保存，已触发重建（约 1-2 分钟后上线）」，草稿则「已保存（草稿，未触发重建）」。

## 10. 根路径迁移步骤

域名方案已定：**Cloudflare Pages 默认 `*.pages.dev` 域名**（项目名 `yuyepage` → `https://yuyepage.pages.dev`）。

代码侧已就绪（环境变量驱动，不改默认值以保 GitHub Pages 过渡期可用）：

- `lib/site.ts`：`BASE_PATH` 优先读 `NEXT_PUBLIC_BASE_PATH`，未设回退 `/yuyeyyy.github.io`；`SITE_URL` 同理。
- `package.json` 新增 `cf:deploy:root` 脚本：显式注入 `NEXT_PUBLIC_BASE_PATH=""` + `NEXT_PUBLIC_SITE_URL=https://yuyepage.pages.dev` 一键根路径部署。
- `.github/workflows/deploy.yml`（GitHub Pages workflow）**已删除**，全站切到 Cloudflare Pages。

正式切换清单：

- [ ] 在 Cloudflare Pages Dashboard 创建项目 `yuyepage`，绑定 `yuyepage_db` D1（`wrangler.toml` 已配）。
- [ ] Dashboard 环境变量设 `NEXT_PUBLIC_BASE_PATH=""`、`NEXT_PUBLIC_SITE_URL=https://yuyepage.pages.dev`、`ADMIN_TOKEN=<强口令>`、`DEPLOY_HOOK_URL=<Pages Deploy Hook>`。
- [ ] 首次 `npm run cf:deploy:root`（或 `cf:deploy`，依赖 dashboard 环境变量）部署到 `yuyepage.pages.dev`。
- [ ] 验证站点 + `/admin` + `/api/comments` 正常。
- [ ] 在 Pages 项目设置里创建 Deploy Hook，把 URL 填回 `DEPLOY_HOOK_URL` 环境变量，验证"后台保存 → 自动重建"闭环。
- [ ] （可选）`lib/site.ts` 回退默认值改为根路径，彻底告别子路径。
- [ ] GitHub Pages 旧地址 `yuyeyyy01.github.io/yuyeyyy.github.io` 的保留/301 决策。

## 11. 待办与后续

- [x] **PR4 自动重建接入**：`posts.ts`（POST）与 `[slug].ts`（PUT/DELETE）写操作成功后已调用 `triggerDeploy(env, ctx.waitUntil)`；草稿不触发，草稿→发布触发，已发布改内容触发，删除已发布触发。评论接口暂不触发重建（评论是运行时 API，不需重建）。
- [ ] **图片上传**：已移除（用户主动放弃，走外链）。git 历史保留 R2 版与 GitHub API 版实现，详见第 12 节。
- [ ] **正式根路径迁移**：见第 10 节（pages.dev 方案，代码已就绪，待首次部署）。
- [x] **删除 GitHub Pages workflow**：`.github/workflows/deploy.yml` 已删，避免双发布。
- [ ] `content_html` 字段当前未使用，评估是否在保存时预渲染 HTML 或移除该列。
- [ ] 评论 admin 接口路径：文件头注释写的是子路径 `/approve`、`/delete`，实际实现是 `?action=` query param，二者已不一致，后续可统一。
- [ ] `functions/` 目录的 `tsc` 类型检查有既存报错（`PagesFunction<EnvContext["env"]>` 泛型对 env 解析不准），不影响 esbuild 部署与 `next build`，后续可单独修。

## 12. 图片（不上传，走外链）

后台编辑器**不做图片上传**（用户主动放弃，避免 R2 绑卡 / GitHub PAT 配置的麻烦）。
作者写文章时直接贴外链图片 URL，或本地放图后 git push 到 `public/images/` 再用
`/images/xxx.png` 引用。

- 工具栏源码模式的 "🖼 图片" 按钮只插入 `![alt](https://)` markdown 语法骨架，
  作者把 `https://` 换成外链图床地址即可。
- 富文本模式（Crepe）的图片块同理，粘 URL 即可。

如以后要恢复上传，git 历史里有 R2 版和 GitHub API 版两个实现可参考。
