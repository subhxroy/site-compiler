import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug, getAllBlogPosts } from '@/lib/content/mdx';
import { buildMetadata } from '@/lib/seo/metadata';
import { articleSchema, breadcrumbListSchema } from '@/lib/seo/schema';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return buildMetadata({ title: 'Post Not Found', description: '', path: `/blog/${slug}` });

  return buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogImage: post.coverImage,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    author: post.author,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) notFound();

  const artSchema = articleSchema(post);
  const breadcrumbSchema = breadcrumbListSchema([
    { name: 'Blog', item: '/blog' },
    { name: post.title, item: `/blog/${post.slug}` },
  ]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(artSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <article className="max-w-3xl mx-auto px-6 space-y-8">
        {/* Back Link */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-mono text-[#9c9c9d] hover:text-white transition-colors">
          <span>←</span>
          <span>Back to Blog Index</span>
        </Link>

        {/* Article Header */}
        <div className="space-y-4 border-b border-[#1b1c1e] pb-8">
          <div className="flex items-center gap-3 font-mono text-xs text-[#6a6b6c]">
            <span className="px-2.5 py-0.5 rounded-[4px] bg-[#1b1c1e] text-[#ff6363] uppercase border border-[#ff6363]/30 font-semibold">
              {post.category}
            </span>
            <span>•</span>
            <span>{post.readingTime}</span>
            <span>•</span>
            <span>{post.publishedAt}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-normal text-white leading-tight">
            {post.title}
          </h1>

          <p className="text-base text-[#9c9c9d] leading-relaxed">
            {post.description}
          </p>

          <div className="flex items-center gap-3 pt-2 text-xs text-[#6a6b6c] font-mono">
            <div className="w-8 h-8 rounded-full bg-[#1b1c1e] border border-[#2f3031] flex items-center justify-center text-white font-bold">
              SR
            </div>
            <div>
              <div className="text-white font-medium">{post.author}</div>
              <div>Founder & Engineer, SiteCompiler</div>
            </div>
          </div>
        </div>

        {/* Article Body */}
        <div className="prose prose-invert max-w-none space-y-6 text-[#9c9c9d] text-sm leading-relaxed raycast-key-card p-8">
          <div dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(post.content) }} />
        </div>
      </article>
    </main>
  );
}

function formatMarkdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white pt-4 pb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-medium text-white pt-6 pb-2 border-b border-[#1b1c1e]">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white pt-8 pb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/```ts([\s\S]*?)```/g, '<pre class="bg-[#111214] p-4 rounded-8px border border-[#2f3031] font-mono text-xs text-[#e6e6e6] overflow-x-auto my-4"><code>$1</code></pre>')
    .replace(/```css([\s\S]*?)```/g, '<pre class="bg-[#111214] p-4 rounded-8px border border-[#2f3031] font-mono text-xs text-[#e6e6e6] overflow-x-auto my-4"><code>$1</code></pre>')
    .replace(/```tsx([\s\S]*?)```/g, '<pre class="bg-[#111214] p-4 rounded-8px border border-[#2f3031] font-mono text-xs text-[#e6e6e6] overflow-x-auto my-4"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#1b1c1e] px-1.5 py-0.5 rounded text-[#ff6363] font-mono text-xs">$1</code>')
    .replace(/\n\n/g, '</p><p class="my-3">');
}
