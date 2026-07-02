import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface Post {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  content: string;
  /** 标签，可选；frontmatter 里以数组形式声明 */
  tags?: string[];
}

/** 文章目录（二级标题 h2 / 三级标题 h3）的简化结构 */
export interface Heading {
  depth: 2 | 3;
  text: string;
  /** 与 rehype-slug 生成的 id 对齐，用于锚点跳转 */
  slug: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function ensureDir(dir: string): void {
  try {
    fs.accessSync(dir, fs.constants.R_OK);
  } catch {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 把 frontmatter 的 tags 字段归一成 string[]。
 * 支持 YAML 数组形式，也容错单字符串（按逗号拆分）。
 */
function normalizeTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const tags = value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v.length > 0);
    return tags.length > 0 ? tags : undefined;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const tags = value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    return tags.length > 0 ? tags : undefined;
  }
  return undefined;
}

function readPostFile(fileName: string): Post | null {
  if (!fileName.endsWith(".mdx")) return null;

  const slug = fileName.replace(/\.mdx$/, "");
  const fullPath = path.join(BLOG_DIR, fileName);

  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data, content } = matter(raw);

    const title = typeof data.title === "string" ? data.title : slug;
    const date = typeof data.date === "string" ? data.date : "";
    const category = typeof data.category === "string" ? data.category : "";
    const description =
      typeof data.description === "string" ? data.description : "";
    const tags = normalizeTags(data.tags);

    return { slug, title, date, category, description, content, tags };
  } catch {
    return null;
  }
}

export function getAllPosts(): Post[] {
  ensureDir(BLOG_DIR);

  let files: string[] = [];
  try {
    files = fs.readdirSync(BLOG_DIR);
  } catch {
    return [];
  }

  const posts = files
    .map((f) => readPostFile(f))
    .filter((p): p is Post => p !== null);

  posts.sort((a, b) => {
    if (a.date === b.date) return a.slug.localeCompare(b.slug);
    return a.date < b.date ? 1 : -1;
  });

  return posts;
}

export function getPost(slug: string): Post | null {
  ensureDir(BLOG_DIR);

  const fileName = `${slug}.mdx`;
  const fullPath = path.join(BLOG_DIR, fileName);

  try {
    fs.accessSync(fullPath, fs.constants.R_OK);
  } catch {
    return null;
  }

  return readPostFile(fileName);
}

/** 收集所有文章的 tags，去重后按字母序排序 */
export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const post of getAllPosts()) {
    if (post.tags) {
      for (const tag of post.tags) set.add(tag);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** 按标签筛选文章，结果保持 date 降序 */
export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter(
    (post) => post.tags?.some((t) => t === tag) ?? false,
  );
}

/**
 * 返回当前文章的上一篇（较新）和下一篇（较旧）。
 * 依赖 getAllPosts 的 date 降序排列。
 */
export function getAdjacentPosts(
  slug: string,
): { prev: Post | null; next: Post | null } {
  const posts = getAllPosts();
  const index = posts.findIndex((p) => p.slug === slug);
  if (index === -1) {
    return { prev: null, next: null };
  }
  const prev = index > 0 ? posts[index - 1] : null;
  const next = index < posts.length - 1 ? posts[index + 1] : null;
  return { prev, next };
}

/* ------------------------------------------------------------------
 * TOC 工具：从 MDX 原文中提取 h2/h3 标题，生成与 rehype-slug 一致的锚点
 * ------------------------------------------------------------------ */

/** 转小写、空格转横线、移除其余非 word 字符（保留中文与横线、下划线） */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w一-鿿-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/** 剥离行内 markdown 标记，得到纯文本标题 */
function stripInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .trim();
}

/**
 * 从 MDX 正文里提取 h2/h3 标题（忽略一级标题）。
 * 先去掉围栏代码块和 MDX 注释，避免代码里的 # 被误判。
 * 重复标题追加 `-1`、`-2` 后缀，与 github-slugger / rehype-slug 对齐。
 */
export function extractHeadings(content: string): Heading[] {
  const cleaned = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    const depth = (match[1].length === 3 ? 3 : 2) as 2 | 3;
    const text = stripInline(match[2].trim());
    if (!text) continue;

    let slug = slugify(text);
    if (!slug) continue;

    const count = seen.get(slug) ?? 0;
    if (count > 0) slug = `${slug}-${count}`;
    seen.set(slug, count + 1);

    headings.push({ depth, text, slug });
  }

  return headings;
}
