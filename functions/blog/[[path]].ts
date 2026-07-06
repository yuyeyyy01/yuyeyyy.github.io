/**
 * 文章 SSR —— 从 D1 动态读取文章，在 edge 渲染 HTML 返回。
 *
 * /blog/          → 文章列表
 * /blog/<slug>/   → 文章详情（markdown → HTML）
 *
 * 替代原来的"静态导出 + 重建"方案：后台保存文章后前台即时可见。
 */

import { marked } from "marked";
import type { CloudflareEnv } from "../_lib";
import { renderShaderHTML } from "../../components/webgl-demos/inline-renderer";
import { renderSceneHTML } from "../../components/webgl-demos/scene-mesh";
import { renderControlsHTML } from "../../components/webgl-demos/controls-html";
import { DEMOS } from "../../components/webgl-demos/shaders";

interface PostRow {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  tags: string;
  content_md: string;
  published: number;
}

type ListRow = Omit<PostRow, "content_md">;

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

export const onRequest: PagesFunction<CloudflareEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const segments = (ctx.params.path as string[] | undefined) ?? [];

  // /blog/ → 列表
  if (segments.length === 0) {
    return renderList(ctx.env, url);
  }

  // /blog/<slug>/ → 详情
  const slug = segments[0];
  return renderPost(ctx.env, url, slug);
};

// ---------------------------------------------------------------------------
// 文章列表
// ---------------------------------------------------------------------------

async function renderList(env: CloudflareEnv, url: URL): Promise<Response> {
  const result = await env.yuyepage_db
    .prepare(
      "SELECT slug, title, date, category, description, tags FROM posts WHERE published = 1 ORDER BY date DESC",
    )
    .all<ListRow>();

  const posts = result.results ?? [];

  const allTags = new Set<string>();
  for (const p of posts) {
    try {
      const t = JSON.parse(p.tags || "[]");
      if (Array.isArray(t)) t.forEach((tag: string) => allTags.add(tag));
    } catch {}
  }
  const sortedTags = Array.from(allTags).sort((a, b) => a.localeCompare(b));

  const cardsHtml = posts
    .map(
      (p) => `
      <a href="/blog/${esc(p.slug)}/" class="group block h-full" aria-label="${esc(p.title)}">
        <article class="card flex h-full flex-col p-6 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:border-[var(--border-strong)] group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div class="flex items-center gap-2">
            <time datetime="${esc(p.date)}" class="font-mono text-xs text-[var(--foreground-muted)]">${esc(p.date)}</time>
            <span aria-hidden class="text-xs text-[var(--foreground-muted)]">·</span>
            <span class="text-xs text-[var(--accent)]">${esc(p.category)}</span>
          </div>
          <h3 class="mt-3 text-lg font-medium leading-snug text-[var(--foreground)]">${esc(p.title)}</h3>
          <p class="mt-3 text-sm leading-relaxed text-[var(--foreground-soft)]">${esc(p.description)}</p>
          <div class="mt-auto flex items-center gap-1 pt-6 text-xs text-[var(--foreground-muted)] transition-colors duration-300 group-hover:text-[var(--accent)]">
            <span>阅读</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-flex transition-transform duration-300 ease-out group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </article>
      </a>`,
    )
    .join("");

  const tagsHtml =
    sortedTags.length > 0
      ? `<div class="mb-8 flex flex-wrap gap-2" id="tag-filter">
          <button type="button" data-tag="" class="tag-chip active rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]">全部</button>
          ${sortedTags.map((t) => `<button type="button" data-tag="${esc(t)}" class="tag-chip rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 border-[var(--border-strong)] text-[var(--foreground-soft)] hover:border-[var(--foreground-muted)] hover:text-[var(--foreground)]">${esc(t)}</button>`).join("")}
        </div>`
      : "";

  const tagScript = `
    <script>
    (function(){
      var chips = document.querySelectorAll('.tag-chip');
      var cards = document.querySelectorAll('#post-grid > a');
      var active = '';
      chips.forEach(function(chip){
        chip.addEventListener('click', function(){
          active = this.dataset.tag;
          chips.forEach(function(c){
            if(c.dataset.tag === active){
              c.className = 'tag-chip active rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]';
            } else {
              c.className = 'tag-chip rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 border-[var(--border-strong)] text-[var(--foreground-soft)] hover:border-[var(--foreground-muted)] hover:text-[var(--foreground)]';
            }
          });
          cards.forEach(function(card){
            if(!active || (card.dataset.tags && card.dataset.tags.split(',').indexOf(active) !== -1)){
              card.style.display = '';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });
    })();
    </script>`;

  // 给每个卡片加 data-tags 属性用于筛选
  const cardsWithTags = posts
    .map((p) => {
      let tags: string[] = [];
      try { tags = JSON.parse(p.tags || "[]"); } catch {}
      return `
      <a href="/blog/${esc(p.slug)}/" class="group block h-full" aria-label="${esc(p.title)}" data-tags="${esc(tags.join(","))}">
        <article class="card flex h-full flex-col p-6 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:border-[var(--border-strong)] group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div class="flex items-center gap-2">
            <time datetime="${esc(p.date)}" class="font-mono text-xs text-[var(--foreground-muted)]">${esc(p.date)}</time>
            <span aria-hidden class="text-xs text-[var(--foreground-muted)]">·</span>
            <span class="text-xs text-[var(--accent)]">${esc(p.category)}</span>
          </div>
          <h3 class="mt-3 text-lg font-medium leading-snug text-[var(--foreground)]">${esc(p.title)}</h3>
          <p class="mt-3 text-sm leading-relaxed text-[var(--foreground-soft)]">${esc(p.description)}</p>
          <div class="mt-auto flex items-center gap-1 pt-6 text-xs text-[var(--foreground-muted)] transition-colors duration-300 group-hover:text-[var(--accent)]">
            <span>阅读</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-flex transition-transform duration-300 ease-out group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </article>
      </a>`;
    })
    .join("");

  const body = `
    <main class="container-page py-24 md:py-32">
      <header class="mb-12">
        <p class="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">Writing</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">文章</h1>
        <p class="mt-4 text-[var(--foreground-soft)]">图形学 / Shader 学习笔记与踩坑记录</p>
      </header>
      ${tagsHtml}
      ${posts.length === 0
        ? '<p class="text-[var(--foreground-muted)]">还没有文章。</p>'
        : `<div id="post-grid" class="grid grid-cols-1 gap-6 md:grid-cols-2">${cardsWithTags}</div>`
      }
    </main>
    ${sortedTags.length > 0 ? tagScript : ""}`;

  return htmlResponse(env, url, "文章 — Yuyeyyy", "图形学、Shader 与渲染管线的学习笔记与踩坑记录。", body);
}

// ---------------------------------------------------------------------------
// 文章详情
// ---------------------------------------------------------------------------

async function renderPost(env: CloudflareEnv, url: URL, slug: string): Promise<Response> {
  const post = await env.yuyepage_db
    .prepare("SELECT * FROM posts WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<PostRow>();

  if (!post) {
    return new Response("文章不存在", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  // 预处理 MDX 自定义组件 → HTML
  const processedMd = preprocessMdx(post.content_md || "");

  // markdown → HTML（占位符在 marked 解析后还原，避免 <script> IIFE 空行被 marked 插 <p>）
  const contentHtml = restoreWebglBlocks(
    await marked.parse(processedMd, {
      gfm: true,
      breaks: false,
    }),
  );

  const fmtDate = formatDate(post.date);

  const body = `
    <main class="container-page mx-auto py-24">
      <div class="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,42rem)_16rem]">
        <article class="min-w-0 max-w-2xl">
          <header class="mb-12">
            <p class="text-sm uppercase tracking-widest text-[var(--foreground-muted)]">${esc(post.category)}</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">${esc(post.title)}</h1>
            <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--foreground-muted)]">
              <time datetime="${esc(post.date)}" class="font-mono">${esc(fmtDate)}</time>
              <a href="/blog/" class="inline-flex items-center gap-1.5 text-[var(--foreground-soft)] transition-colors hover:text-[var(--accent)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                <span>返回文章</span>
              </a>
            </div>
          </header>
          <div class="prose">${contentHtml}</div>

          <!-- 评论区 -->
          <section class="mt-16" id="comments-section">
            <h2 class="text-xl font-semibold text-[var(--foreground)] mb-6">评论</h2>
            <div id="comments-list"></div>
            <form id="comment-form" class="mt-8 space-y-4">
              <input name="author" placeholder="昵称" required class="input" maxlength="50" />
              <input name="email" type="email" placeholder="邮箱（不公开，选填）" class="input" />
              <textarea name="body" placeholder="说点什么…" required class="input" rows="4" maxlength="2000" style="resize:vertical"></textarea>
              <button type="submit" class="btn-primary px-6 py-2 text-sm">提交评论</button>
              <p id="comment-msg" class="text-sm text-[var(--foreground-muted)]" hidden></p>
            </form>
          </section>
          ${commentsScript(slug)}
        </article>

        <!-- 侧栏目录 -->
        <aside class="hidden lg:block">
          <nav id="toc" class="sticky top-24"></nav>
          ${tocScript()}
        </aside>
      </div>
    </main>`;

  return htmlResponse(env, url, `${post.title} — Yuyeyyy`, post.description, body);
}

// ---------------------------------------------------------------------------
// HTML 壳 —— 通过 env.ASSETS 获取现有页面的 <head> 保证 CSS 一致
// ---------------------------------------------------------------------------

async function htmlResponse(
  env: CloudflareEnv,
  url: URL,
  title: string,
  description: string,
  bodyContent: string,
): Promise<Response> {
  // 从现有静态页面提取 <head> 中的 CSS 引用
  let cssLinks = "";
  try {
    const templateReq = new Request(new URL("/about/", url.origin).toString());
    const templateRes = await env.ASSETS.fetch(templateReq);
    if (templateRes.ok) {
      const html = await templateRes.text();
      // 提取所有 <link rel="stylesheet"> 和 <style> 标签
      const linkMatches = html.match(/<link[^>]*rel="stylesheet"[^>]*>/gi) ?? [];
      const styleMatches = html.match(/<style[\s\S]*?<\/style>/gi) ?? [];
      cssLinks = [...linkMatches, ...styleMatches].join("\n");
    }
  } catch {}

  const html = `<!DOCTYPE html>
<html lang="zh-CN" suppressHydrationWarning>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <link rel="icon" href="/favicon.ico" />
  ${cssLinks}
  <script>
    // 主题初始化（和 ThemeProvider 一致）
    (function(){
      var t = localStorage.getItem('theme');
      if(!t) t = window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', t);
    })();
  </script>
</head>
<body>
  <!-- Header -->
  <header class="glass sticky top-0 z-10">
    <div class="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
      <a href="/" class="flex items-baseline gap-2 text-sm font-medium no-underline transition-colors duration-300">
        <span class="text-[var(--foreground)]">Yuyeyyy</span>
        <span aria-hidden class="text-[var(--foreground-muted)]">·</span>
        <span class="text-[var(--foreground-muted)]">Graphics</span>
      </a>
      <nav class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <a href="/blog/" class="text-[var(--foreground-soft)] no-underline transition-colors duration-300 hover:text-[var(--foreground)]">博客</a>
        <a href="/about/" class="text-[var(--foreground-soft)] no-underline transition-colors duration-300 hover:text-[var(--foreground)]">关于</a>
        <a href="/search/" class="text-[var(--foreground-soft)] no-underline transition-colors duration-300 hover:text-[var(--foreground)]">搜索</a>
        <a href="https://github.com/yuyeyyy" target="_blank" rel="noopener noreferrer" class="text-[var(--foreground-soft)] no-underline transition-colors duration-300 hover:text-[var(--foreground)]">GitHub</a>
        <button id="theme-toggle" type="button" aria-label="切换主题" class="text-[var(--foreground-soft)] hover:text-[var(--foreground)] transition-colors">
          <svg id="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          <svg id="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
      </nav>
    </div>
  </header>

  <main>${bodyContent}</main>

  <!-- Footer -->
  <footer class="border-t border-[var(--border)] py-10">
    <div class="container-page text-xs text-[var(--foreground-muted)]">
      <p>© ${new Date().getFullYear()} Yuyeyyy · 用 Unity 渲染与 Shader 折腾的笔记</p>
    </div>
  </footer>

  <script>
    // 主题切换
    (function(){
      var btn = document.getElementById('theme-toggle');
      var sun = document.getElementById('icon-sun');
      var moon = document.getElementById('icon-moon');
      function update(){
        var t = document.documentElement.getAttribute('data-theme');
        sun.style.display = t === 'dark' ? 'block' : 'none';
        moon.style.display = t === 'light' ? 'block' : 'none';
      }
      update();
      btn.addEventListener('click', function(){
        var cur = document.documentElement.getAttribute('data-theme');
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        update();
      });
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}

// ---------------------------------------------------------------------------
// MDX 组件预处理 —— 转成纯 HTML
// ---------------------------------------------------------------------------

// 已展开的 HTML 块占位符表：preprocessMdx 先把组件替换成唯一占位符（HTML 注释形式，
// marked 不会解析注释内部），marked 解析剩余 markdown 后再还原成真 HTML。
// 这样避免 renderXxxHTML 返回的 <script> IIFE 里的空行被 marked 当段落分隔插入 <p>，
// 导致 script 内容被劈开（线上曾出现 var meshKind="octahedron";<p> try { 的 SyntaxError）。
const WEBGL_BLOCK_PLACEHOLDERS: string[] = [];

function preprocessMdx(md: string): string {
  let result = md;

  // canvas id 计数器：每个 demo 一个唯一 id，避免页面内多个 demo 冲突
  let canvasSeq = 0;
  const nextId = () => "ssr-demo-" + (++canvasSeq);

  // 把一段 HTML 块存进占位符表，返回唯一占位符（HTML 注释，marked 原样保留）
  const stash = (html: string): string => {
    const i = WEBGL_BLOCK_PLACEHOLDERS.length;
    WEBGL_BLOCK_PLACEHOLDERS.push(html);
    return `<!--webgl-block-${i}-->`;
  };

  // <Video bilibili="xxx" caption="yyy" /> → iframe
  result = result.replace(
    /<Video\s+bilibili="([^"]+)"(?:\s+caption="([^"]*)")?\s*\/?>/g,
    (_, bvid, caption) => {
      const cap = caption ? `<p class="mt-2 text-center text-sm text-[var(--foreground-muted)]">${esc(caption)}</p>` : "";
      return stash(`<div class="my-6"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--radius-xl)"><iframe src="//player.bilibili.com/player.html?bvid=${esc(bvid)}&high_quality=1&autoplay=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen allow="fullscreen"></iframe></div>${cap}</div>`);
    },
  );

  result = result.replace(
    /<Video\s+youtube="([^"]+)"(?:\s+caption="([^"]*)")?\s*\/?>/g,
    (_, vid, caption) => {
      const cap = caption ? `<p class="mt-2 text-center text-sm text-[var(--foreground-muted)]">${esc(caption)}</p>` : "";
      return stash(`<div class="my-6"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--radius-xl)"><iframe src="https://www.youtube.com/embed/${esc(vid)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen allow="fullscreen"></iframe></div>${cap}</div>`);
    },
  );

  // <Scene>...children...</Scene> → vanilla WebGL icosahedron mesh
  // children 是 r3f mesh 语法，vanilla 不支持，统一用 icosahedron 暗示自定义 mesh
  result = result.replace(
    /<Scene>[\s\S]*?<\/Scene>/g,
    () => stash(renderSceneHTML({ canvasId: nextId(), height: 320, mesh: 'icosahedron' })),
  );

  // <Scene autoRotate /> → vanilla WebGL octahedron mesh + 自动旋转
  result = result.replace(
    /<Scene\s+autoRotate\s*\/>/g,
    () => stash(renderSceneHTML({ canvasId: nextId(), height: 320, autoRotate: true, mesh: 'octahedron' })),
  );

  // <Scene /> → vanilla WebGL octahedron mesh（静态）
  result = result.replace(
    /<Scene\s*\/>/g,
    () => stash(renderSceneHTML({ canvasId: nextId(), height: 320, autoRotate: false, mesh: 'octahedron' })),
  );

  // <ShaderDemo /> → vanilla WebGL shader demo（全屏 triangle + UV 渐变）
  result = result.replace(
    /<ShaderDemo\s*\/>/g,
    () => stash(renderShaderHTML({ demoId: 'shader-demo', canvasId: nextId(), height: 320 })),
  );

  // <PlaygroundPBR /> → shader + 控件（共用同一 canvasId，让控件 dispatch 的 uniform-change 事件能被 shader IIFE 接收）
  result = result.replace(
    /<PlaygroundPBR\s*\/>/g,
    () => {
      const id = nextId();
      return stash(renderShaderHTML({ demoId: 'pbr', canvasId: id, height: 320 }) + renderControlsHTML({ canvasId: id, uniforms: DEMOS.pbr.uniforms }));
    },
  );

  // <PlaygroundSSS /> → shader + 控件
  result = result.replace(
    /<PlaygroundSSS\s*\/>/g,
    () => {
      const id = nextId();
      return stash(renderShaderHTML({ demoId: 'sss', canvasId: id, height: 320 }) + renderControlsHTML({ canvasId: id, uniforms: DEMOS.sss.uniforms }));
    },
  );

  // <PlaygroundHair /> → shader + 控件
  result = result.replace(
    /<PlaygroundHair\s*\/>/g,
    () => {
      const id = nextId();
      return stash(renderShaderHTML({ demoId: 'hair', canvasId: id, height: 320 }) + renderControlsHTML({ canvasId: id, uniforms: DEMOS.hair.uniforms }));
    },
  );

  // <Figure ... /> → img
  result = result.replace(
    /<Figure\s+src="([^"]+)"(?:\s+alt="([^"]*)")?(?:\s+caption="([^"]*)")?\s*\/?>/g,
    (_, src, alt, caption) => {
      const cap = caption ? `<p class="mt-2 text-center text-sm text-[var(--foreground-muted)]">${esc(caption)}</p>` : "";
      return stash(`<figure class="my-6"><img src="${esc(src)}" alt="${esc(alt || "")}" style="border-radius:var(--radius-xl);max-width:100%" />${cap}</figure>`);
    },
  );

  return result;
}

// 还原占位符：marked 解析后，把 <!--webgl-block-N--> 替换回真实 HTML 块。
// 清空占位符表以便下一篇复用（renderPost 每次调用 preprocessMdx 后会调用此函数）。
function restoreWebglBlocks(html: string): string {
  let out = html;
  for (let i = 0; i < WEBGL_BLOCK_PLACEHOLDERS.length; i++) {
    out = out.split(`<!--webgl-block-${i}-->`).join(WEBGL_BLOCK_PLACEHOLDERS[i]);
  }
  WEBGL_BLOCK_PLACEHOLDERS.length = 0;
  return out;
}

// ---------------------------------------------------------------------------
// 评论区内联 JS
// ---------------------------------------------------------------------------

function commentsScript(slug: string): string {
  return `
    <script>
    (function(){
      var list = document.getElementById('comments-list');
      var form = document.getElementById('comment-form');
      var msg = document.getElementById('comment-msg');

      function loadComments(){
        fetch('/api/comments?slug=${slug}')
          .then(function(r){ return r.json(); })
          .then(function(d){
            if(!d.comments || d.comments.length === 0){
              list.innerHTML = '<p class="text-sm text-[var(--foreground-muted)]">还没有评论，来说点什么吧。</p>';
              return;
            }
            list.innerHTML = d.comments.map(function(c){
              return '<div class="card p-4 mb-3">'
                + '<div class="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">'
                + '<span class="font-medium text-[var(--foreground)]">' + esc(c.author) + '</span>'
                + '<span>·</span>'
                + '<time>' + c.created_at.slice(0,10) + '</time>'
                + '</div>'
                + '<p class="mt-2 text-sm text-[var(--foreground-soft)]">' + esc(c.body) + '</p>'
                + '</div>';
            }).join('');
          })
          .catch(function(){ list.innerHTML = '<p class="text-sm text-[var(--foreground-muted)]">评论加载失败。</p>'; });
      }
      loadComments();

      form.addEventListener('submit', function(e){
        e.preventDefault();
        var data = {
          slug: '${slug}',
          author: form.author.value.trim(),
          email: form.email.value.trim(),
          body: form.body.value.trim()
        };
        if(!data.author || !data.body) return;
        msg.hidden = false;
        msg.textContent = '提交中…';
        fetch('/api/comments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function(r){ return r.json(); })
        .then(function(d){
          if(d.error){ msg.textContent = d.error; }
          else { msg.textContent = '评论已提交，等待审核。'; form.reset(); loadComments(); }
        })
        .catch(function(){ msg.textContent = '提交失败，请稍后重试。'; });
      });

      function esc(s){
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
      }
    })();
    </script>`;
}

// ---------------------------------------------------------------------------
// 目录 (TOC) 内联 JS —— 从文章 h2/h3 生成
// ---------------------------------------------------------------------------

function tocScript(): string {
  return `
    <script>
    (function(){
      var toc = document.getElementById('toc');
      if(!toc) return;
      var headings = document.querySelectorAll('.prose h2, .prose h3');
      if(headings.length === 0) return;
      var html = '<p class="text-xs font-medium uppercase tracking-widest text-[var(--foreground-muted)] mb-3">目录</p><ul class="space-y-1.5 text-sm">';
      headings.forEach(function(h){
        var depth = h.tagName === 'H3' ? 'pl-4' : '';
        var id = h.id || h.textContent.trim().toLowerCase().replace(/\\s+/g,'-').replace(/[^\\w一-鿿-]/g,'');
        if(!h.id) h.id = id;
        html += '<li class="' + depth + '"><a href="#' + id + '" class="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">' + h.textContent.trim() + '</a></li>';
      });
      html += '</ul>';
      toc.innerHTML = html;
    })();
    </script>`;
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
