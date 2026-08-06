import React from 'react';
import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/content/mdx';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'Blog & Engineering Guides — SiteCompiler',
  description: 'Articles, tutorials, and deep-dives on website compilation, Framer exports, Webflow migrations, React performance, and technical SEO.',
  path: '/blog',
});

const CATEGORIES = ['all', 'framer', 'webflow', 'seo', 'react', 'nextjs'];

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'Blog', item: '/blog' }]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[1100px] mx-auto px-6 space-y-12">
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            Engineering Blog
          </div>
          <h1 className="text-4xl sm:text-5xl font-normal text-white">Guides, tutorials, & deep dives.</h1>
          <p className="text-base text-[#9c9c9d] leading-relaxed">
            Learn how to compile visual websites into clean React, Next.js 15, and Tailwind CSS code bases.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={cat === 'all' ? '/blog' : `/blog/category/${cat}`}
              className={`px-3.5 py-1.5 rounded-[6px] border text-xs font-mono capitalize transition-all ${
                cat === 'all'
                  ? 'bg-[#ff6363] text-black font-semibold border-[#ff6363]'
                  : 'bg-[#111214] text-[#9c9c9d] border-[#2f3031] hover:border-white hover:text-white'
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Blog Post Grid */}
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
