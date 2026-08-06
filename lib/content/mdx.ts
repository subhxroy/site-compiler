import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  category: 'framer' | 'react' | 'nextjs' | 'ai' | 'export' | 'seo' | 'guides' | 'tutorials' | 'comparisons';
  coverImage?: string;
  videoUrl?: string;
  author: string;
  content: string;
  readingTime: string;
}

export interface DocPage {
  title: string;
  description: string;
  slug: string[]; // e.g. ['getting-started', 'overview']
  slugString: string;
  category: string;
  order?: number;
  content: string;
  updatedAt: string;
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const DOCS_DIR = path.join(process.cwd(), 'content', 'docs');

function calculateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

// ── Blog Utilities ─────────────────────────────────────────────────────────

export function getAllBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

  const posts: BlogPost[] = files.map((file) => {
    const filePath = path.join(BLOG_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    const slug = data.slug || file.replace(/\.mdx?$/, '');

    return {
      title: data.title || 'Untitled Post',
      slug,
      description: data.description || '',
      publishedAt: data.publishedAt || new Date().toISOString().split('T')[0],
      updatedAt: data.updatedAt || data.publishedAt || new Date().toISOString().split('T')[0],
      category: data.category || 'guides',
      coverImage: data.coverImage,
      videoUrl: data.videoUrl,
      author: data.author || 'Subhankar Roy',
      content,
      readingTime: calculateReadingTime(content),
    };
  });

  return posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  const posts = getAllBlogPosts();
  return posts.find((p) => p.slug === slug);
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  const posts = getAllBlogPosts();
  return posts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
}

// ── Docs Utilities ─────────────────────────────────────────────────────────

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (file.endsWith('.mdx') || file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

export function getAllDocsPages(): DocPage[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  const filePaths = getFilesRecursively(DOCS_DIR);

  const docs: DocPage[] = filePaths.map((filePath) => {
    const relativePath = path.relative(DOCS_DIR, filePath);
    const cleanPath = relativePath.replace(/\.mdx?$/, '').replace(/\\/g, '/');
    const slug = cleanPath.split('/');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      title: data.title || slug[slug.length - 1],
      description: data.description || '',
      slug,
      slugString: cleanPath,
      category: data.category || (slug.length > 1 ? slug[0] : 'general'),
      order: data.order ?? 99,
      content,
      updatedAt: data.updatedAt || new Date().toISOString().split('T')[0],
    };
  });

  return docs.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getDocPageBySlug(slugArr: string[]): DocPage | undefined {
  const slugStr = slugArr.join('/');
  const docs = getAllDocsPages();
  const exact = docs.find((d) => d.slugString === slugStr);
  if (exact) return exact;
  return docs.find((d) => d.category === slugStr || d.slugString.startsWith(slugStr + '/'));
}
