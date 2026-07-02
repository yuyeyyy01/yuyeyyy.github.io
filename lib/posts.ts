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
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function ensureDir(dir: string): void {
  try {
    fs.accessSync(dir, fs.constants.R_OK);
  } catch {
    fs.mkdirSync(dir, { recursive: true });
  }
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

    return { slug, title, date, category, description, content };
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
