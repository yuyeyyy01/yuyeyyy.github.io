# 阶段 B：全迁 Cloudflare + 在线写作后台 + 自建评论

## 1. 概述

阶段 B 把站点从 GitHub Pages 子路径静态导出迁移到 Cloudflare Pages，新增 D1 数据库存储文章与评论、Pages Functions 提供 API、在线管理后台（口令登录）支持文章 CRUD 与评论审核。博客页用 **Edge SSR** 从 D1 动态渲染，后台保存后前台立即生效（约 1 分钟 CDN 刷新），**不需重建部署**。

PR 进度：

| PR  | 内容                          | 状态   |
| --- | ----------------------------- | ------ |
| PR1 | 基础设施（D1 / wrangler / 环境变量解耦） | 已合并 |
| PR2 | 评论接口 + 评论审核 UI          | 已合并 |
| PR3 | 写作后台（文章 CRUD UI + API）  | 已合并 |
| PR4 | Edge SSR 替代重建方案 + 迁移收尾 | 进行中 |

## 2. 整体架构

静态导出（非博客页）+ 博客页 Edge SSR + D1 存储 + Pages Functions API。

- 静态导出：`next build` 产出 `out/`，由 `wrangler pages deploy out` 部署到 Cloudflare Pages。首页 / `/about` / `/search` / `/admin` 等非博客页走静态导出。
- 博客页 Edge SSR：`functions/blog/[[path]].ts` catch-all 路由在 Cloudflare Pages Functions（Edge）运行时从 D1 读文章，用 `marked` 把 markdown 渲染成 HTML 拼装完整页面返回。后台保存到 D1 后前台**立即生效**，最多 1 分钟 CDN 刷新，不需任何重建/部署。
- D1 存储：文章正文（`content_md`）与评论都存 D1，通过 `yuyepage_db` binding 访问。D1 是唯一数据源。
- Pages Functions：`functions/` 目录提供 `/api/comments`、`/api/admin/*` 接口与 `/blog/*` SSR，运行在 Cloudflare 边缘。
- 重建方案已废弃：原 PR4 的 `triggerDeploy` / `DEPLOY_HOOK_URL` / GitHub Actions `repository_dispatch` 重建触发均已删除（详见第 5 节）。

```
┌──────────────┐      ┌──────────────────────────────┐
│ 读者浏览器    │      │ 管理员浏览器 /admin           │
│ 静态页 + 评论 │      │ 口令登录（cookie）            │
│ /blog/* SSR  │      │                              │
└──────┬───────┘      └──────────────┬───────────────┘
       │ GET 静态页 / /blog/* SSR    │ /api/admin/*
       │ POST /api/comments          │
       ▼                             ▼
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Pages                   │
│  ┌───────────────┐   ┌────────────────────────────┐ │
│  │ 静态资源 out/  │   │ Pages Functions functions/ │ │
│  │ HTML/JS/CSS   │   │  /api/comments             │ │
│  │ pagefind 索引  │   │  /api/admin/comments       │ │
│  └──────┬────────┘   │  /api/admin/posts[/:slug]  │ │
│         │            │  /blog/[[path]] (SSR)      │ │
│  ASSETS binding──────▶│                            │ │
│  (取静态页 <head> CSS) └─────────────┬──────────────┘ │
│                                    │                │
│                      ┌─────────────▼──────────────┐ │
│                      │  D1: yuyepage_db           │ │
│                      │  posts / comments /        │ │
│                      │  comment_rate              │ │
│                      └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**博客 SSR 实现**（`functions/blog/[[path]].ts`）：

- `/blog/` → 文章列表：从 D1 查 `published=1` 文章，渲染卡片 + 标签筛选 UI。
- `/blog/<slug>/` → 文章详情：`marked` 把 `content_md` 渲染成 HTML，含评论区内联 JS、目录 TOC 内联 JS。
- HTML 壳：`env.ASSETS.fetch("/about/")` 拉现有静态页，提取 `<head>` 里的 CSS，保证样式一致。
- MDX 自定义组件预处理：`<Video bilibili=...>` / `<Video youtube=...>` → iframe；`<Scene>` / `<ShaderDemo>` → 占位卡片；`<Figure>` → `<img>`。
- cache-control：`max-age=60, s-maxage=60`（1 分钟 CDN 刷新，后台保存后最多 1 分钟生效）。
- 依赖：`marked ^18.0.5`。

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
| content_html  | TEXT    | NOT NULL DEFAULT ''             | 预渲染 HTML（当前未使用，SSR 实时渲染）|
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
Edge SSR 直接读 D1 渲染（functions/blog/[[path]].ts）
   │  读者下次访问 /blog/<slug>/ 时从 D1 取最新内容
   │  marked 渲染 → 拼装 HTML → 返回
   ▼
读者访问新内容（最多 1 分钟 CDN 刷新后生效）
```

说明：

- D1 是唯一数据源。文章后台保存到 D1 后，`/blog/*` 走 Edge SSR 直接读 D1 渲染，**不需任何重建/部署**，最多 1 分钟 CDN 刷新后前台生效。
- `content/blog/*.mdx` 仍可由 `export-d1-posts.mjs` 导出，仅用于本地预览 / 非博客页的静态构建 fallback，已加 `.gitignore`，不进 git。
- 重建方案已废弃：原 PR4 的 `triggerDeploy` / `DEPLOY_HOOK_URL` / GitHub Actions `repository_dispatch` 重建触发均已删除。原因：Cloudflare 新 UI 不展示 Deploy hooks 入口；本项目用 `wrangler pages deploy` 直传产物（非 GitHub 集成构建），Deploy Hook 无效；GitHub Actions 方案需仓库 owner 加 Secrets，用户只是协作者无 admin 权限。改用 Edge SSR 彻底绕开"重建部署"需求。
- UI 提示改为「已保存」（不再有"已触发重建"措辞）。

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

1. `export-d1-posts.mjs`：`wrangler d1 execute` 查 `posts WHERE published=1` → 写 `content/blog/<slug>.mdx`，并维护 `.d1-export.json` 清单。**仅用于本地预览 / 非博客页 fallback**，博客前台已不走这里。
2. `next build`：`lib/posts.ts` 读 mdx → 静态导出到 `out/`（首页 / `/about` / `/search` / `/admin` 等非博客页）。博客页 `/blog/*` 不走静态导出，由 `functions/blog/[[path]].ts` SSR 承载。
3. `pagefind --site out`：生成静态搜索索引。
4. `wrangler pages deploy out`：上传到 Cloudflare Pages。

> 文章后台保存到 D1 后，`/blog/*` 走 Edge SSR 直接读 D1，**不需要跑 `cf:deploy`**。只有改了非博客页代码（首页布局、关于页等）时才需手动跑 `cf:deploy:root`。

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
| `ASSETS`                 | Pages 静态资源 binding，SSR 取静态页 CSS 用 | 自动注入，无需配         | 自动注入，无需配        |
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
- 保存/删除后提示「已保存」（博客走 SSR，保存即生效，约 1 分钟 CDN 刷新后前台可见）。

## 10. 根路径迁移步骤

域名方案已定：**Cloudflare Pages 默认 `*.pages.dev` 域名**（项目名 `yuyepage` → `https://yuyepage.pages.dev`）。

代码侧已就绪（环境变量驱动，不改默认值以保 GitHub Pages 过渡期可用）：

- `lib/site.ts`：`BASE_PATH` 优先读 `NEXT_PUBLIC_BASE_PATH`，未设回退 `/yuyeyyy.github.io`；`SITE_URL` 同理。
- `package.json` 新增 `cf:deploy:root` 脚本：显式注入 `NEXT_PUBLIC_BASE_PATH=""` + `NEXT_PUBLIC_SITE_URL=https://yuyepage.pages.dev` 一键根路径部署。
- `.github/workflows/deploy.yml`（原 GitHub Pages workflow，后曾用于 `repository_dispatch` 触发重建）**已删除**，全站切到 Cloudflare Pages，博客走 SSR 不需重建。

正式切换清单：

- [ ] 在 Cloudflare Pages Dashboard 创建项目 `yuyepage`，绑定 `yuyepage_db` D1（`wrangler.toml` 已配）。
- [ ] Dashboard 环境变量设 `NEXT_PUBLIC_BASE_PATH=""`、`NEXT_PUBLIC_SITE_URL=https://yuyepage.pages.dev`、`ADMIN_TOKEN=<强口令>`。（无需 `DEPLOY_HOOK_URL`，博客走 SSR。）
- [ ] 首次 `npm run cf:deploy:root`（或 `cf:deploy`，依赖 dashboard 环境变量）部署到 `yuyepage.pages.dev`。
- [ ] 验证站点 + `/admin` + `/api/comments` + `/blog/*` SSR 正常。
- [ ] 验证"后台保存文章 → 1 分钟后前台可见"SSR 闭环（无需任何部署/重建）。
- [ ] （可选）`lib/site.ts` 回退默认值改为根路径，彻底告别子路径。
- [ ] GitHub Pages 旧地址 `yuyeyyy01.github.io/yuyeyyy.github.io` 的保留/301 决策。

## 11. 待办与后续

- [x] **PR4 重建方案废弃，改为 Edge SSR**：原 `triggerDeploy` / `DEPLOY_HOOK_URL` / GitHub Actions `repository_dispatch` 重建触发方案已废弃。改用 `functions/blog/[[path]].ts` Edge SSR 从 D1 动态渲染，后台保存即生效（约 1 分钟 CDN 刷新），不需任何重建/部署/Secret/owner 配置。
- [ ] **图片上传**：已移除（用户主动放弃，走外链）。git 历史保留 R2 版与 GitHub API 版实现，详见第 12 节。
- [ ] **正式根路径迁移**：见第 10 节（pages.dev 方案，代码已就绪，待首次部署）。
- [x] **删除 `.github/workflows/deploy.yml`**：该文件原为 GitHub Pages workflow，后曾用于 `repository_dispatch` 触发重建。新架构下博客走 SSR 不需重建，且用户非仓库 owner 无法加 Secrets，故删除。避免双发布。
- [ ] `content_html` 字段当前未使用（SSR 用 `marked` 实时渲染 `content_md`），评估是否移除该列或改作缓存。
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
