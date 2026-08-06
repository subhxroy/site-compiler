import React from 'react';
import Link from 'next/link';
import { getBlogPostsByCategory } from '@/lib/content/mdx';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { category } = await params;
  return buildMetadata({
    title: `${category.toUpperCase()} Tutorials & Articles — SiteCompiler Blog`,
    description: `Browse all articles, guides, and tutorials in the ${category} category on SiteCompiler.`,
    path: `/blog/category/${category}`,
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const posts = getBlogPostsByCategory(category);
  const breadcrumbSchema = breadcrumbListSchema([
    { name: 'Blog', item: '/blog' },
    { name: category, item: `/blog/category/${category}` },
  ]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[1100px] mx-auto px-6 space-y-12">
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-mono text-[#9c9c9d] hover:text-white transition-colors">
            <span>←</span>
            <span>All Categories</span>
          </Link>
          <h1 className="text-4xl sm:text-5xl font-normal text-white capitalize">{category} Articles</h1>
          <p className="text-sm text-[#9c9c9d]">Showing {posts.length} articles in this category.</p>
        </div>

        {/* Post Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="raycast-key-card p-6 space-y-4 hover:border-[#ff6363]/50 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-[11px] text-[#6a6b6c]">
                  <span className="text-[#ff6363] uppercase font-medium">{post.category}</span>
                  <span>{post.readingTime}</span>
                </div>
                <h2 className="text-lg font-medium text-white group-hover:text-[#ff6363] transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-xs text-[#9c9c9d] leading-relaxed line-clamp-3">
                  {post.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#1b1c1e] flex items-center justify-between text-xs text-[#6a6b6c] font-mono">
                <span>By {post.author}</span>
                <span>{post.publishedAt}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
